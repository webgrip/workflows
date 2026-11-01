'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { parse } = require('yaml');

const action = parse(fs.readFileSync('.forgejo/composite-actions/renovate-trigger/action.yml', 'utf8'));
const step = action.runs.steps.find(step => step.name === 'Schedule Renovate');
const forgejoRunnerBash = [['/bin/bash', '/usr/bin/bash'].find(candidate => fs.existsSync(candidate)), '--noprofile', '--norc', '-e', '-o', 'pipefail'];
const INPUT_EXPRESSION = /^\$\{\{\s*inputs\.([a-z-]+)(?:\s*\|\|\s*github\.token)?\s*\}\}$/;

function inputDefaults() {
  return Object.fromEntries(Object.entries(action.inputs).map(([name, input]) => [name, input.default ?? '']));
}

function stepEnvironment(inputs) {
  return Object.fromEntries(
    Object.entries(step.env).map(([variable, expression]) => {
      const [, input] = INPUT_EXPRESSION.exec(expression);
      return [variable, inputs[input] || (input === 'forgejo-token' ? 'job-token' : '')];
    }),
  );
}

function repository(name, { topics = ['renovate'], archived = false, mirror = false } = {}) {
  return { full_name: `webgrip/${name}`, topics, archived, mirror };
}

async function fakeForge({ repositories = [], scheduleStatus = () => 200 } = {}) {
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fake');
    requests.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams), authorization: request.headers.authorization });
    if (url.pathname === '/api/v1/orgs/webgrip/repos') {
      const page = Number(url.searchParams.get('page'));
      const limit = Number(url.searchParams.get('limit'));
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(repositories.slice((page - 1) * limit, page * limit)));
      return;
    }
    if (url.pathname === '/webhook/v1/schedule' && request.method === 'POST') {
      response.statusCode = scheduleStatus(url.searchParams.get('project'));
      response.end();
      return;
    }
    response.statusCode = 500;
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, requests, close: () => new Promise(resolve => server.close(resolve)) };
}

function runStep(inputs, { serverUrl = 'http://127.0.0.1:9', withNode = true } = {}) {
  const script = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'renovate-trigger-step-')), 'run.sh');
  fs.writeFileSync(script, step.run);
  const nodeDirectory = path.dirname(process.execPath);
  const [shell, ...shellArgs] = forgejoRunnerBash;
  const child = spawn(shell, [...shellArgs, script], {
    env: {
      PATH: withNode ? `${nodeDirectory}:/usr/bin:/bin` : '/nonexistent',
      GITHUB_SERVER_URL: serverUrl,
      GITHUB_REPOSITORY_OWNER: 'webgrip',
      GITHUB_REPOSITORY: 'webgrip/workflows',
      ...stepEnvironment(inputs),
    },
  });
  let log = '';
  child.stdout.on('data', chunk => (log += chunk));
  child.stderr.on('data', chunk => (log += chunk));
  return new Promise(resolve => child.on('close', status => resolve({ status, log })));
}

function schedules(requests) {
  return requests.filter(request => request.path === '/webhook/v1/schedule');
}

test('every input reaches the step through its environment', () => {
  const mapped = new Set(Object.values(step.env).map(expression => INPUT_EXPRESSION.exec(expression)?.[1]));
  assert.deepEqual([...mapped].sort(), Object.keys(action.inputs).sort());
  assert.doesNotMatch(step.run, /\$\{\{/);
});

test('the defaults point at the in-cluster operator and the webgrip-forgejo job', () => {
  const defaults = inputDefaults();
  assert.equal(defaults['operator-url'], 'http://renovate-operator.renovate.svc.cluster.local:8082');
  assert.equal(defaults.namespace, 'renovate');
  assert.equal(defaults.job, 'webgrip-forgejo');
  assert.equal(defaults.topic, 'renovate');
  assert.equal(action.inputs.token.required, true);
});

test('each listed project is scheduled once with the bearer token and the job in the query', async () => {
  const forge = await fakeForge();
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, projects: 'webgrip/unfold, webgrip/erfbeeld\nwebgrip/unfold' });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  const calls = schedules(forge.requests);
  assert.deepEqual(calls.map(call => call.query.project), ['webgrip/unfold', 'webgrip/erfbeeld']);
  for (const call of calls) {
    assert.equal(call.method, 'POST');
    assert.equal(call.authorization, 'Bearer hook-token');
    assert.equal(call.query.namespace, 'renovate');
    assert.equal(call.query.job, 'webgrip-forgejo');
  }
  assert.ok(!forge.requests.some(request => request.path.startsWith('/api/')), 'an explicit list needs no listing');
  assert.match(run.log, /2 scheduled, 0 skipped of 2/);
});

test('without projects it schedules the organisation repositories carrying the topic, except itself', async () => {
  const filler = Array.from({ length: 55 }, (_, index) => repository(`untagged-${index}`, { topics: [] }));
  const forge = await fakeForge({
    repositories: [
      repository('unfold'),
      repository('workflows'),
      repository('old-app', { archived: true }),
      repository('upstream', { mirror: true }),
      ...filler,
      repository('erfbeeld'),
    ],
  });
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url }, { serverUrl: forge.url });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.deepEqual(schedules(forge.requests).map(call => call.query.project), ['webgrip/unfold', 'webgrip/erfbeeld']);
  const listings = forge.requests.filter(request => request.path === '/api/v1/orgs/webgrip/repos');
  assert.deepEqual(listings.map(listing => listing.query.page), ['1', '2']);
  assert.equal(listings[0].authorization, 'token job-token');
});

test('a project the job does not own is skipped and the rest still run', async () => {
  const forge = await fakeForge({ scheduleStatus: project => (project === 'webgrip/fogbell' ? 404 : 200) });
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, projects: 'webgrip/fogbell webgrip/unfold' });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.equal(schedules(forge.requests).length, 2);
  assert.match(run.log, /skipped webgrip\/fogbell/);
  assert.match(run.log, /1 scheduled, 1 skipped of 2/);
  assert.doesNotMatch(run.log, /::warning::/);
});

test('a rejected token warns once and stops without failing the job', async () => {
  const forge = await fakeForge({ scheduleStatus: () => 401 });
  const run = await runStep({ ...inputDefaults(), token: 'stale', 'operator-url': forge.url, projects: 'webgrip/unfold webgrip/erfbeeld' });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.equal(schedules(forge.requests).length, 1);
  assert.match(run.log, /::warning::renovate-operator rejected the token/);
});

test('an unreachable operator is a warning, not a failure', async () => {
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': 'http://127.0.0.1:9', projects: 'webgrip/unfold' });
  assert.equal(run.status, 0, run.log);
  assert.match(run.log, /::warning::renovate-operator at http:\/\/127\.0\.0\.1:9 is unreachable/);
});

test('a failed listing is a warning, not a failure', async () => {
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': 'http://127.0.0.1:9' });
  assert.equal(run.status, 0, run.log);
  assert.match(run.log, /::warning::renovate-trigger could not list projects/);
});

test('an empty token or a missing node warns and sends nothing', async () => {
  const forge = await fakeForge();
  const withoutToken = await runStep({ ...inputDefaults(), 'operator-url': forge.url, projects: 'webgrip/unfold' });
  const withoutNode = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, projects: 'webgrip/unfold' }, { withNode: false });
  await forge.close();
  assert.equal(withoutToken.status, 0, withoutToken.log);
  assert.match(withoutToken.log, /::warning::renovate-trigger got no token/);
  assert.equal(withoutNode.status, 0, withoutNode.log);
  assert.match(withoutNode.log, /::warning::renovate-trigger needs node on PATH/);
  assert.equal(forge.requests.length, 0);
});
