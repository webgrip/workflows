'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { findRefs, violations, pin } = require('./internal-refs.cjs');
const { graftPinnedTagsOntoBranch, commitPinnedTree } = require('./release-pinned-tag.cjs');

const repoRoot = path.resolve(__dirname, '..');
const cli = path.join(__dirname, 'internal-refs.cjs');
const nestedWorkflowCall = 'webgrip/workflows/.forgejo/workflows/docker-build-and-push-registry.yml';
const nestedCompositeAction = 'https://forgejo.webgrip.dev/webgrip/workflows/.forgejo/composite-actions/semantic-release';

function libraryCopy() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'internal-refs-'));
  for (const tree of ['.forgejo', '.github']) fs.cpSync(path.join(repoRoot, tree), path.join(root, tree), { recursive: true });
  return root;
}

function fixtureWith(lines) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'internal-refs-fixture-'));
  fs.mkdirSync(path.join(root, '.forgejo/workflows'), { recursive: true });
  fs.writeFileSync(path.join(root, '.forgejo/workflows/library.yml'), ['on:', '  workflow_call:', 'jobs:', ...lines, ''].join('\n'));
  return root;
}

function addLibraryLine(root, line) {
  fs.appendFileSync(path.join(root, '.forgejo/workflows/docker-build-and-push-harbor.yml'), `${line}\n`);
}

function runCli(root, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
}

test('the repository source passes: every internal ref is @main and therefore pinnable', () => {
  const result = runCli(repoRoot, 'check');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(findRefs(repoRoot).some(ref => ref.target === nestedWorkflowCall));
  assert.ok(findRefs(repoRoot).some(ref => ref.target === nestedCompositeAction));
});

test('a simulated release of the current tree leaves no internal ref behind its tag', () => {
  const root = libraryCopy();
  const result = runCli(root, 'pin', 'v9.9.9');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(violations(root, 'v9.9.9'), []);
  const harbor = fs.readFileSync(path.join(root, '.forgejo/workflows/docker-build-and-push-harbor.yml'), 'utf8');
  assert.match(harbor, new RegExp(`${nestedWorkflowCall.replace(/\./g, '\\.')}@v9\\.9\\.9`));
  assert.doesNotMatch(harbor, /webgrip\/workflows\/[^\s]+@main/);
});

test('an @main internal ref in a released tree fails the check, and removing it passes again', () => {
  const root = libraryCopy();
  assert.equal(runCli(root, 'pin', 'v9.9.9').status, 0);
  const file = path.join(root, '.forgejo/workflows/docker-build-and-push-harbor.yml');
  const released = fs.readFileSync(file, 'utf8');
  addLibraryLine(root, `    uses: ${nestedWorkflowCall}@main`);
  const failing = runCli(root, 'check', 'v9.9.9');
  assert.equal(failing.status, 1);
  assert.match(failing.stderr, /docker-build-and-push-harbor\.yml:\d+: .*@main must be @v9\.9\.9/);
  fs.writeFileSync(file, released);
  assert.equal(runCli(root, 'check', 'v9.9.9').status, 0);
});

test('an internal ref pinned to anything but @main fails on the source, because a release would not move it', () => {
  for (const stale of ['v2.8.2', 'abf3c951d8243ef030421ab2acff0af9edce3215', 'master']) {
    const root = fixtureWith([`  a:`, `    uses: ${nestedWorkflowCall}@${stale}`]);
    assert.equal(runCli(root, 'check').status, 1, stale);
    pin(root, 'v1.0.0');
    assert.equal(runCli(root, 'check', 'v1.0.0').status, 1, stale);
  }
});

test('a caller-relative uses fails, because it resolves in the caller repository', () => {
  for (const relative of ['./.forgejo/workflows/semantic-release.yml', './.forgejo/composite-actions/semantic-release']) {
    const root = fixtureWith(['  a:', `    uses: ${relative}`]);
    const result = runCli(root, 'check');
    assert.equal(result.status, 1, relative);
    assert.match(result.stderr, /caller's repository/);
  }
});

test('the self-CI workflows are not library files and are left alone', () => {
  const root = libraryCopy();
  const selfCi = path.join(root, '.forgejo/workflows/on_source_change.yml');
  const before = fs.readFileSync(selfCi, 'utf8');
  pin(root, 'v9.9.9');
  assert.equal(fs.readFileSync(selfCi, 'utf8'), before);
  assert.ok(!findRefs(root).some(ref => ref.file.endsWith('on_source_change.yml')));
});

test('pin refuses anything that is not a release tag', () => {
  const root = fixtureWith(['  a:', `    uses: ${nestedWorkflowCall}@main`]);
  for (const notATag of ['main', '9.9.9', 'v9', '']) assert.throws(() => pin(root, notATag), /not a release tag/, notATag);
});

function git(cwd, ...args) {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  }).trim();
}

function releasedRepo() {
  const root = fixtureWith(['  a:', `    uses: ${nestedWorkflowCall}@main`]);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'commit.gpgsign', 'false');
  git(root, 'config', 'user.name', 't');
  git(root, 'config', 'user.email', 't@t');
  git(root, 'add', '.');
  git(root, 'commit', '-q', '-m', 'feat: library');
  return root;
}

test('the release tag points at a pinned commit off main, and main still finds it as merged', () => {
  const root = releasedRepo();
  const mainBefore = git(root, 'rev-parse', 'main');
  const { commit } = commitPinnedTree(root, process.env, 'v1.0.0');
  git(root, 'tag', 'v1.0.0', commit);
  git(root, 'checkout', '-q', 'main');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'fix: later');

  assert.equal(git(root, 'rev-parse', 'v1.0.0^'), mainBefore);
  assert.match(git(root, 'show', 'v1.0.0:.forgejo/workflows/library.yml'), /@v1\.0\.0/);
  assert.match(git(root, 'show', 'main:.forgejo/workflows/library.yml'), /@main/);
  assert.equal(git(root, 'tag', '--merged', 'main'), '');

  assert.deepEqual(graftPinnedTagsOntoBranch(root), [commit]);
  assert.equal(git(root, 'tag', '--merged', 'main'), 'v1.0.0');
  assert.deepEqual(git(root, 'log', '--format=%s', 'v1.0.0..main').split('\n'), ['fix: later']);
});

test('the graft ignores tags whose parent is not on the branch', () => {
  const root = releasedRepo();
  git(root, 'checkout', '-q', '--orphan', 'elsewhere');
  git(root, 'commit', '-q', '--allow-empty', '-m', 'unrelated');
  git(root, 'tag', 'v5.0.0');
  git(root, 'checkout', '-q', 'main');
  assert.deepEqual(graftPinnedTagsOntoBranch(root), []);
  assert.equal(git(root, 'tag', '--merged', 'main'), '');
});
