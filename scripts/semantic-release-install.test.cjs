'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse } = require('yaml');

const action = parse(fs.readFileSync('.forgejo/composite-actions/semantic-release/action.yml', 'utf8'));
const step = action.runs.steps.find(step => step.name === 'Install consumer dependencies');
const forgejoRunnerBash = ['bash', '--noprofile', '--norc', '-e', '-o', 'pipefail'];

const packageJson = (scripts = {}) => ({ name: 'fixture', version: '1.0.0', scripts });
const npmLockfile = {
  name: 'fixture',
  version: '1.0.0',
  lockfileVersion: 3,
  requires: true,
  packages: { '': { name: 'fixture', version: '1.0.0' } },
};
const buildThatPasses = { build: 'touch built' };
const buildThatFails = { build: 'touch built && exit 3' };
const buildNeedingUninstalledVite = { build: 'touch built && vite build' };

function runInstallStep(mode, files, extraEnv = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'semrel-install-workspace-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(workspace, name), typeof content === 'string' ? content : JSON.stringify(content));
  }
  const script = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'semrel-install-step-')), 'run.sh');
  fs.writeFileSync(script, step.run);
  const stepEnv = Object.fromEntries(
    Object.entries(step.env).map(([name, value]) => [name, value.replace(/\$\{\{\s*inputs\.install-dependencies\s*\}\}/, mode)]),
  );
  const [shell, ...shellArgs] = forgejoRunnerBash;
  const result = spawnSync(shell, [...shellArgs, script], {
    cwd: workspace,
    env: { ...process.env, CI: 'true', ...stepEnv, ...extraEnv },
    encoding: 'utf8',
  });
  return { status: result.status, log: `${result.stdout}${result.stderr}`, built: fs.existsSync(path.join(workspace, 'built')) };
}

test('the step is skipped outright for "false" and runs the script verbatim for every other mode', () => {
  assert.equal(step.if, "inputs.install-dependencies != 'false'");
  assert.doesNotMatch(step.run, /\$\{\{/);
  assert.ok(Object.values(step.env).some(value => value.includes('inputs.install-dependencies')));
});

const scenarios = [
  {
    name: 'no package.json',
    files: {},
    auto: { status: 0, built: false, log: /No package\.json/ },
    true: { status: 0, built: false, log: /No package\.json/ },
  },
  {
    name: 'npm lockfile and a build that passes',
    files: { 'package.json': packageJson(buildThatPasses), 'package-lock.json': npmLockfile },
    auto: { status: 0, built: true, log: /npm run build/ },
    true: { status: 0, built: true, log: /npm run build/ },
  },
  {
    name: 'npm lockfile without a build script',
    files: { 'package.json': packageJson(), 'package-lock.json': npmLockfile },
    auto: { status: 0, built: false, log: /No build script/ },
    true: { status: 0, built: false, log: /No build script/ },
  },
  {
    name: 'npm lockfile and a build that fails',
    files: { 'package.json': packageJson(buildThatFails), 'package-lock.json': npmLockfile },
    auto: { status: 0, built: true, log: /::warning::npm run build exited 3\./ },
    true: { status: 1, built: true, log: /::error::npm run build exited 3\./ },
  },
  {
    name: 'npm ci that fails',
    files: { 'package.json': packageJson({ ...buildThatPasses, preinstall: 'exit 7' }), 'package-lock.json': npmLockfile },
    auto: { status: 0, built: false, log: /::warning::npm ci exited \d+\. Build not run/ },
    true: { status: 1, built: false, log: /::error::npm ci exited \d+\. Build not run/ },
  },
  {
    name: 'package.json and a build script but no lockfile',
    files: { 'package.json': packageJson(buildThatPasses) },
    auto: { status: 0, built: false, log: /no lockfile\. Nothing installed, build not run/ },
    true: { status: 1, built: false, log: /::error::package\.json has no lockfile/ },
  },
  {
    name: 'pnpm lockfile and a build that needs the uninstalled vite (omnigraph-explorer)',
    files: { 'package.json': packageJson(buildNeedingUninstalledVite), 'pnpm-lock.yaml': "lockfileVersion: '9.0'\n" },
    auto: { status: 0, built: false, log: /Unsupported lockfile pnpm-lock\.yaml/ },
    true: { status: 1, built: false, log: /::error::Unsupported lockfile pnpm-lock\.yaml/ },
  },
  {
    name: 'yarn lockfile',
    files: { 'package.json': packageJson(buildThatPasses), 'yarn.lock': '# yarn lockfile v1\n' },
    auto: { status: 0, built: false, log: /Unsupported lockfile yarn\.lock/ },
    true: { status: 1, built: false, log: /::error::Unsupported lockfile yarn\.lock/ },
  },
  {
    name: 'bun lockfile',
    files: { 'package.json': packageJson(buildThatPasses), 'bun.lock': '{}\n' },
    auto: { status: 0, built: false, log: /Unsupported lockfile bun\.lock/ },
    true: { status: 1, built: false, log: /::error::Unsupported lockfile bun\.lock/ },
  },
];

for (const scenario of scenarios) {
  for (const mode of ['auto', 'true']) {
    test(`${mode}: ${scenario.name}`, () => {
      const expected = scenario[mode];
      const { status, log, built } = runInstallStep(mode, scenario.files, scenario.env);
      assert.equal(status, expected.status, log);
      assert.equal(built, expected.built, log);
      assert.match(log, expected.log);
    });
  }
}
