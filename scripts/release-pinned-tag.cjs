'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pin, violations, SOURCE_REF } = require('./internal-refs.cjs');

const RELEASE_TAG_GLOB = 'v[0-9]*';

function git(cwd, args, env = process.env) {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function succeeds(cwd, args) {
  try {
    git(cwd, args);
    return true;
  } catch {
    return false;
  }
}

function isAncestor(cwd, commit, of) {
  return succeeds(cwd, ['--no-replace-objects', 'merge-base', '--is-ancestor', commit, of]);
}

function releaseTagCommits(cwd) {
  const listing = git(cwd, ['for-each-ref', '--format=%(objectname) %(*objectname)', `refs/tags/${RELEASE_TAG_GLOB}`]);
  return listing
    .split('\n')
    .filter(Boolean)
    .map(line => line.split(' ').filter(Boolean).pop());
}

function realParents(cwd, commit) {
  return git(cwd, ['--no-replace-objects', 'rev-list', '--parents', '-n', '1', commit]).split(' ').slice(1);
}

function pinnedTagCommitsOffBranch(cwd, tip) {
  const offBranch = releaseTagCommits(cwd).filter(commit => !isAncestor(cwd, commit, tip));
  return [...new Set(offBranch)].filter(commit => {
    const parents = realParents(cwd, commit);
    return parents.length > 0 && parents.every(parent => isAncestor(cwd, parent, tip));
  });
}

function graftPinnedTagsOntoBranch(cwd) {
  const tip = git(cwd, ['rev-parse', 'HEAD']);
  const pinned = pinnedTagCommitsOffBranch(cwd, tip);
  if (pinned.length === 0) return [];
  git(cwd, ['replace', '-f', '--graft', tip, ...realParents(cwd, tip), ...pinned]);
  return pinned;
}

function unpinnedRefs(cwd, expectedRef) {
  const left = violations(cwd, expectedRef);
  if (left.length === 0) return;
  const where = left.map(ref => `${ref.file}:${ref.line} ${ref.target}${ref.ref ? `@${ref.ref}` : ''}`).join(', ');
  throw new Error(`internal refs that a release cannot pin to its own tag: ${where}`);
}

function commitPinnedTree(cwd, env, gitTag) {
  git(cwd, ['checkout', '--detach'], env);
  const changed = pin(cwd, gitTag);
  unpinnedRefs(cwd, gitTag);
  const releasedPaths = ['.forgejo', '.github', 'CHANGELOG.md'].filter(entry => fs.existsSync(path.join(cwd, entry)));
  git(cwd, ['add', '--all', '--', ...releasedPaths], env);
  if (!succeeds(cwd, ['diff', '--cached', '--quiet'])) {
    git(cwd, ['commit', '--no-verify', '-m', `chore(release): pin internal refs to ${gitTag} [skip ci]`], env);
  }
  return { changed, commit: git(cwd, ['rev-parse', 'HEAD']) };
}

async function verifyConditions(pluginConfig, { cwd }) {
  unpinnedRefs(cwd, SOURCE_REF);
}

async function prepare(pluginConfig, { cwd, env, nextRelease, logger }) {
  const { changed, commit } = commitPinnedTree(cwd, { ...process.env, ...env }, nextRelease.gitTag);
  logger.log(`Pinned internal refs to ${nextRelease.gitTag} in ${changed.length} file(s); ${nextRelease.gitTag} will point at ${commit}`);
}

module.exports = { verifyConditions, prepare, graftPinnedTagsOntoBranch, commitPinnedTree };
