'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse } = require('yaml');

const composites = {
  'semantic-release': 'semantic-release-helm3',
  'semantic-release-monorepo': 'semantic-release-monorepo',
};

function probeOf(composite) {
  const action = parse(fs.readFileSync(`.forgejo/composite-actions/${composite}/action.yml`, 'utf8'));
  const run = action.runs.steps.map(step => step.run || '').find(text => text.includes('SEMREL_PREBAKED'));
  const probe = /node -e '\n([\s\S]*?)\n\s*'; then/.exec(run);
  assert.ok(probe, `${composite} has no toolchain probe`);
  return probe[1];
}

function toolchain(packages) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'semrel-toolchain-'));
  for (const [name, version] of Object.entries(packages)) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version, main: 'index.js' }));
    fs.writeFileSync(path.join(dir, 'index.js'), '');
  }
  return root;
}

function probeAccepts(composite, packages) {
  const result = spawnSync(process.execPath, ['-e', probeOf(composite)], {
    cwd: os.tmpdir(),
    env: { PATH: process.env.PATH, NODE_PATH: toolchain(packages) },
    encoding: 'utf8',
  });
  return result.status === 0;
}

for (const [composite, legacyPlugin] of Object.entries(composites)) {
  test(`${composite}: a config 2.x image without ${legacyPlugin} is usable`, () => {
    assert.equal(
      probeAccepts(composite, { 'semantic-release': '25.0.9', '@webgrip/semantic-release-config': '2.1.0' }),
      true,
    );
  });

  test(`${composite}: a config 1.x image still needs ${legacyPlugin}`, () => {
    assert.equal(
      probeAccepts(composite, { 'semantic-release': '25.0.9', '@webgrip/semantic-release-config': '1.4.0' }),
      false,
    );
    assert.equal(
      probeAccepts(composite, {
        'semantic-release': '25.0.9',
        '@webgrip/semantic-release-config': '1.4.0',
        [legacyPlugin]: '1.0.0',
      }),
      true,
    );
  });

  test(`${composite}: an image without the shared config is refused`, () => {
    assert.equal(probeAccepts(composite, { 'semantic-release': '25.0.9' }), false);
  });

  test(`${composite}: an image on another semantic-release major is refused`, () => {
    assert.equal(
      probeAccepts(composite, { 'semantic-release': '24.2.0', '@webgrip/semantic-release-config': '2.1.0' }),
      false,
    );
  });
}
