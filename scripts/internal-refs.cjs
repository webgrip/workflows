'use strict';
const fs = require('node:fs');
const path = require('node:path');

const LIBRARY_TREES = ['.forgejo', '.github'];
const SELF_CI_WORKFLOWS = new Set(['.forgejo/workflows/on_source_change.yml', '.forgejo/workflows/on_docs_change.yml']);
const SOURCE_REF = 'main';
const RELEASE_TAG = /^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const INTERNAL_REF = /((?:https?:\/\/[^\s/'"]+\/)?webgrip\/workflows\/\.(?:forgejo|github)\/[^\s@'"]+)@([^\s'"#]+)/g;
const CALLER_RELATIVE_USES = /\buses:\s*['"]?(\.\/[^\s'"#]*)/g;

function libraryFiles(root) {
  return LIBRARY_TREES.flatMap(tree => walk(root, tree)).filter(file => !SELF_CI_WORKFLOWS.has(file));
}

function walk(root, relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [relative];
  return fs
    .readdirSync(absolute)
    .sort()
    .flatMap(entry => walk(root, path.posix.join(relative, entry)));
}

function isWorkflowText(file) {
  return /\.ya?ml$/.test(file);
}

function findRefs(root) {
  const refs = [];
  for (const file of libraryFiles(root).filter(isWorkflowText)) {
    fs.readFileSync(path.join(root, file), 'utf8')
      .split('\n')
      .forEach((text, index) => {
        for (const match of text.matchAll(INTERNAL_REF)) {
          refs.push({ file, line: index + 1, kind: 'internal', target: match[1], ref: match[2] });
        }
        for (const match of text.matchAll(CALLER_RELATIVE_USES)) {
          refs.push({ file, line: index + 1, kind: 'caller-relative', target: match[1], ref: '' });
        }
      });
  }
  return refs;
}

function violations(root, expectedRef) {
  return findRefs(root).filter(ref => ref.kind === 'caller-relative' || ref.ref !== expectedRef);
}

function describe(ref, expectedRef) {
  if (ref.kind === 'caller-relative') {
    return `${ref.file}:${ref.line}: ${ref.target} resolves against the caller's repository, not this library; use webgrip/workflows/<path>@${SOURCE_REF}`;
  }
  return `${ref.file}:${ref.line}: ${ref.target}@${ref.ref} must be @${expectedRef}`;
}

function pin(root, tag) {
  if (!RELEASE_TAG.test(tag)) throw new Error(`refusing to pin internal refs to "${tag}": not a release tag`);
  const changed = [];
  for (const file of libraryFiles(root).filter(isWorkflowText)) {
    const absolute = path.join(root, file);
    const before = fs.readFileSync(absolute, 'utf8');
    const after = before.replace(INTERNAL_REF, (whole, target, ref) => (ref === SOURCE_REF ? `${target}@${tag}` : whole));
    if (after !== before) {
      fs.writeFileSync(absolute, after);
      changed.push(file);
    }
  }
  return changed;
}

function check(root, expectedRef) {
  const found = violations(root, expectedRef);
  for (const ref of found) console.error(`::error::${describe(ref, expectedRef)}`);
  const total = findRefs(root).length;
  console.log(`${total} internal ref(s) in library files, ${found.length} not at @${expectedRef}`);
  return found.length === 0;
}

function main([command, argument], root = process.cwd()) {
  if (command === 'list') {
    for (const ref of findRefs(root)) console.log(`${ref.file}:${ref.line}: ${ref.target}${ref.ref ? `@${ref.ref}` : ''}`);
    return 0;
  }
  if (command === 'pin' && argument) {
    const changed = pin(root, argument);
    console.log(`pinned internal refs to ${argument} in ${changed.length} file(s)`);
    return check(root, argument) ? 0 : 1;
  }
  if (command === 'check') return check(root, argument || SOURCE_REF) ? 0 : 1;
  console.error('usage: internal-refs.cjs list | check [ref] | pin <vX.Y.Z>');
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { findRefs, violations, pin, check, main, SOURCE_REF, RELEASE_TAG };
