'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parse } = require('yaml');
const { parseOptions } = require('@webgrip/semantic-release-config/lib/release-job.cjs');

const action = parse(fs.readFileSync('.forgejo/composite-actions/semantic-release/action.yml', 'utf8'));
const step = action.runs.steps.find(step => step.name === 'Run webgrip-release');
const forgejoRunnerBash = ['bash', '--noprofile', '--norc', '-e', '-o', 'pipefail'];
const INPUT_EXPRESSION = /^\$\{\{\s*inputs\.([a-z-]+)(?:\s*\|\|\s*github\.token)?\s*\}\}$/;

function inputDefaults() {
  return Object.fromEntries(Object.entries(action.inputs).map(([name, input]) => [name, input.default ?? '']));
}

function stepEnvironment(inputs) {
  return Object.fromEntries(
    Object.entries(step.env).map(([variable, expression]) => {
      const [, input] = INPUT_EXPRESSION.exec(expression);
      return [variable, inputs[input] || (input === 'token' ? 'job-token' : '')];
    }),
  );
}

function fakeCommandDirectory(record) {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'webgrip-release-bin-'));
  const command = path.join(bin, 'webgrip-release');
  fs.writeFileSync(command, `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > '${record}'\n`);
  fs.chmodSync(command, 0o755);
  return bin;
}

function runStep(inputs, { withCommand = true } = {}) {
  const record = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'webgrip-release-args-')), 'args');
  const script = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'webgrip-release-step-')), 'run.sh');
  fs.writeFileSync(script, step.run);
  const pathPrefix = withCommand ? `${fakeCommandDirectory(record)}:` : '';
  const [shell, ...shellArgs] = forgejoRunnerBash;
  const result = spawnSync(shell, [...shellArgs, script], {
    env: { PATH: `${pathPrefix}/usr/local/bin:/usr/bin:/bin`, ...stepEnvironment(inputs) },
    encoding: 'utf8',
  });
  const args = fs.existsSync(record) ? fs.readFileSync(record, 'utf8').split('\n').filter(Boolean) : null;
  return { status: result.status, log: `${result.stdout}${result.stderr}`, args };
}

function commandOptions(inputs) {
  const env = { ...stepEnvironment(inputs) };
  const { args } = runStep(inputs);
  return parseOptions(args, env);
}

test('every input reaches the command through the step environment', () => {
  const mapped = new Set(Object.values(step.env).map(expression => INPUT_EXPRESSION.exec(expression)?.[1]));
  assert.deepEqual([...mapped].sort(), Object.keys(action.inputs).sort());
  assert.doesNotMatch(step.run, /\$\{\{/);
});

test('the defaults ask the command for a single-train release that aligns and installs on auto', () => {
  const options = commandOptions(inputDefaults());
  assert.equal(options.layout, 'single');
  assert.equal(options.align, true);
  assert.equal(options.dryRun, false);
  assert.equal(options.installDependencies, 'auto');
  assert.equal(options.forgeUrl, 'https://forgejo.webgrip.dev');
  assert.ok(!options.releaseType);
  assert.deepEqual(options.passthrough, []);
});

test('each input value arrives as the matching command option', () => {
  const options = commandOptions({
    ...inputDefaults(),
    'release-type': 'helm',
    'forge-url': 'https://forge.example/',
    'dry-run': 'true',
    'align-to-remote-tip': 'false',
    'install-dependencies': 'true',
    layout: 'trains',
    trains: 'skills/* apps/site',
    'version-command': 'cat VERSION',
  });
  assert.equal(options.releaseType, 'helm');
  assert.equal(options.forgeUrl, 'https://forge.example');
  assert.equal(options.dryRun, true);
  assert.equal(options.align, false);
  assert.equal(options.installDependencies, 'true');
  assert.equal(options.layout, 'trains');
  assert.equal(options.trainGlobs, 'skills/* apps/site');
  assert.equal(options.versionCommand, 'cat VERSION');
});

test('the token, identity and outputs use the names the command reads', () => {
  const env = stepEnvironment({ ...inputDefaults(), token: 'caller-token' });
  assert.equal(env.RELEASE_TOKEN, 'caller-token');
  assert.equal(env.GIT_USER_NAME, 'webgrip-ci');
  assert.equal(env.GIT_USER_EMAIL, 'ci@webgrip.nl');
  for (const output of Object.values(action.outputs)) {
    assert.match(output.value, /^\$\{\{ steps\.semantic-release\.outputs\.(version|tag|released) \}\}$/);
  }
  assert.equal(step.id, 'semantic-release');
});

test('a job outside an image with the command fails and names the image', () => {
  const run = runStep(inputDefaults(), { withCommand: false });
  assert.equal(run.status, 1);
  assert.match(run.log, /webgrip-release is not on PATH/);
  assert.match(run.log, /semantic-release:2\.5\.0/);
});
