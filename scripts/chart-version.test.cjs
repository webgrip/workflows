'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse } = require('yaml');

const releaseVersion = '1.2.3';
const inputs = {
  path: 'chart',
  'chart-path': 'chart',
  name: 'demo',
  'chart-name': 'demo',
  version: releaseVersion,
  registry: 'registry.invalid',
  owner: 'webgrip',
  'oci-path': 'webgrip/charts',
  'chart-oci-path': 'webgrip/charts',
};

function substituteInputs(text) {
  return text.replace(/\$\{\{\s*inputs\.([\w-]+)[^}]*\}\}/g, (_, name) => inputs[name] ?? '');
}

function packagingSteps(workflow) {
  const jobs = parse(fs.readFileSync(`.forgejo/workflows/${workflow}`, 'utf8')).jobs;
  return Object.values(jobs).flatMap(job =>
    (job.steps || [])
      .filter(step => (step.run || '').includes('helm package'))
      .map(step => ({ run: step.run, env: { ...(job.env || {}), ...(step.env || {}) } })),
  );
}

function helmCallsOf(step) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'helm-stub-'));
  const calls = path.join(bin, 'calls');
  fs.writeFileSync(
    path.join(bin, 'helm'),
    `#!/bin/sh\necho "$*" >> "${calls}"\n[ "$1" = show ] && exit 1\nexit 0\n`,
    { mode: 0o755 },
  );
  const env = Object.fromEntries(Object.entries(step.env).map(([name, value]) => [name, substituteInputs(String(value))]));
  spawnSync('bash', ['-c', substituteInputs(step.run)], {
    cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'chart-workspace-')),
    env: { PATH: `${bin}:${process.env.PATH}`, ...env, REGISTRY_TOKEN: 'x', REGISTRY_USERNAME: 'x', GHCR_TOKEN: 'x', GHCR_USER: 'x' },
    encoding: 'utf8',
  });
  return fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8').trim().split('\n') : [];
}

for (const workflow of ['helm-chart-push.yml', 'forgejo-distribute.yml', 'github-distribute.yml']) {
  test(`${workflow} packages the chart at the release version, whatever Chart.yaml says`, () => {
    const steps = packagingSteps(workflow);
    assert.ok(steps.length > 0, `${workflow} has no helm package step`);
    for (const step of steps) {
      const packageCall = helmCallsOf(step).find(call => call.startsWith('package '));
      assert.ok(packageCall, 'helm package was not called');
      assert.match(packageCall, new RegExp(`--version ${releaseVersion.replace(/\./g, '\\.')}(\\s|$)`));
    }
  });
}
