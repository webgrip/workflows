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

function directoryListing(files, directory) {
  return Object.keys(files)
    .filter(file => path.posix.dirname(file) === directory)
    .map(file => ({ type: 'file', name: path.posix.basename(file), path: file }));
}

function answerRepositoryRead(files, kind, file, response) {
  const directory = directoryListing(files, file);
  const content = kind === 'contents' && directory.length > 0 ? directory : files[file];
  if (typeof content === 'number') {
    response.statusCode = content;
    response.end();
    return;
  }
  if (content === undefined) {
    response.statusCode = 404;
    response.end();
    return;
  }
  if (Array.isArray(content)) response.setHeader('Content-Type', 'application/json');
  response.end(Array.isArray(content) ? JSON.stringify(content) : content);
}

async function fakeForge({ repositories = [], files = {}, scheduleStatus = () => 200 } = {}) {
  const requests = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fake');
    requests.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams), authorization: request.headers.authorization });
    const repositoryRead = /^\/api\/v1\/repos\/([^/]+\/[^/]+)\/(raw|contents)\/(.+)$/.exec(url.pathname);
    if (repositoryRead) {
      const [, project, kind, file] = repositoryRead;
      answerRepositoryRead(files[project] || {}, kind, decodeURIComponent(file), response);
      return;
    }
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

function runStep(inputs, { serverUrl = 'http://127.0.0.1:9', withNode = true, repository: callingRepository = 'webgrip/workflows' } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'renovate-trigger-step-'));
  const script = path.join(directory, 'run.sh');
  const summary = path.join(directory, 'summary.md');
  fs.writeFileSync(script, step.run);
  const nodeDirectory = path.dirname(process.execPath);
  const [shell, ...shellArgs] = forgejoRunnerBash;
  const child = spawn(shell, [...shellArgs, script], {
    env: {
      PATH: withNode ? `${nodeDirectory}:/usr/bin:/bin` : '/nonexistent',
      GITHUB_SERVER_URL: serverUrl,
      GITHUB_REPOSITORY_OWNER: 'webgrip',
      GITHUB_REPOSITORY: callingRepository,
      GITHUB_STEP_SUMMARY: summary,
      ...stepEnvironment(inputs),
    },
  });
  let log = '';
  child.stdout.on('data', chunk => (log += chunk));
  child.stderr.on('data', chunk => (log += chunk));
  const readSummary = () => (fs.existsSync(summary) ? fs.readFileSync(summary, 'utf8') : '');
  return new Promise(resolve => child.on('close', status => resolve({ status, log, summary: readSummary() })));
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

const CONSUMERS = {
  'webgrip/calls-a-workflow': {
    '.forgejo/workflows/ci.yml': 'jobs:\n  test:\n    uses: webgrip/workflows/.forgejo/workflows/tests.yml@v3.2.1\n',
  },
  'webgrip/calls-a-composite': {
    '.github/workflows/release.yaml': '      - uses: https://forgejo.webgrip.dev/webgrip/workflows/.forgejo/composite-actions/semantic-release@v3.2.1\n',
  },
  'webgrip/pins-the-config': {
    'package.json': '{ "devDependencies": { "@webgrip/semantic-release-config": "2.5.0" } }',
  },
  'webgrip/runs-the-image': {
    '.forgejo/workflows/release.yml': '    container:\n      image: harbor.webgrip.dev/webgrip/semantic-release:2.5.0@sha256:abc\n',
  },
  'webgrip/pins-the-image-in-mise': {
    'mise.toml': '[tasks.release]\nrun = "docker run harbor.webgrip.dev/webgrip/semantic-release:2.5.0"\n',
  },
  'webgrip/extends-renovate-config': {
    'renovate.json': '{ "extends": ["local>webgrip/renovate-config#v1.4.0"] }',
  },
  'webgrip/extends-renovate-config-json5': {
    '.renovaterc.json5': "{ extends: ['webgrip/renovate-config'] }",
  },
  'webgrip/installs-agent-standards': {
    'apm.yml': 'dependencies:\n  - git: https://forgejo.webgrip.dev/webgrip/agent-standards.git\n    ref: v0.5.2\n',
  },
  'webgrip/runs-agentstd': {
    'mise.toml': "run = \"uvx --from 'git+https://forgejo.webgrip.dev/webgrip/agent-standards.git@v0.5.2#subdirectory=cli' agentstd check\"\n",
  },
  'webgrip/uses-nothing': {
    '.forgejo/workflows/ci.yml': 'jobs:\n  test:\n    runs-on: docker\n    steps:\n      - run: npm test\n',
    'package.json': '{ "devDependencies": { "semantic-release": "25.0.0" } }',
    'renovate.json': '{ "extends": ["config:recommended"] }',
    'mise.toml': '[tools]\nnode = "24"\n',
  },
  'webgrip/workflows': {
    '.forgejo/workflows/on_source_change.yml': '      - uses: webgrip/workflows/.forgejo/composite-actions/semantic-release@main\n',
    'package.json': '{ "devDependencies": { "@webgrip/semantic-release-config": "2.5.0" } }',
    'renovate.json': '{ "extends": ["local>webgrip/renovate-config"] }',
    'apm.yml': 'dependencies:\n  - git: https://forgejo.webgrip.dev/webgrip/agent-standards.git\n',
  },
  'webgrip/semantic-release-config': {
    'package.json': '{ "name": "@webgrip/semantic-release-config" }',
  },
  'webgrip/agent-standards': {
    'mise.toml': "run = \"uvx --from 'git+https://forgejo.webgrip.dev/webgrip/agent-standards.git@v0.5.2#subdirectory=cli' agentstd\"\n",
  },
};

const EXPECTED_CONSUMERS = {
  workflows: ['webgrip/calls-a-workflow', 'webgrip/calls-a-composite'],
  'semantic-release-config': ['webgrip/pins-the-config', 'webgrip/runs-the-image', 'webgrip/pins-the-image-in-mise', 'webgrip/workflows'],
  'renovate-config': ['webgrip/extends-renovate-config', 'webgrip/extends-renovate-config-json5', 'webgrip/workflows'],
  'agent-standards': ['webgrip/installs-agent-standards', 'webgrip/runs-agentstd', 'webgrip/workflows'],
};

function consumerForge(options = {}) {
  return fakeForge({ repositories: Object.keys(CONSUMERS).map(project => repository(project.split('/')[1])), files: CONSUMERS, ...options });
}

for (const [releasedPackage, consumers] of Object.entries(EXPECTED_CONSUMERS)) {
  test(`a release of ${releasedPackage} schedules only the repositories that use it`, async () => {
    const forge = await consumerForge();
    const run = await runStep(
      { ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url },
      { serverUrl: forge.url, repository: `webgrip/${releasedPackage}` },
    );
    await forge.close();
    assert.equal(run.status, 0, run.log);
    assert.deepEqual(schedules(forge.requests).map(call => call.query.project), consumers);
    assert.doesNotMatch(run.log, /::warning::/);
    for (const consumer of consumers) assert.match(run.summary, new RegExp(`\\| ${consumer} \\| \`[^\`]+\` uses ${releasedPackage} \\| scheduled \\|`));
    assert.doesNotMatch(run.summary, /uses-nothing/);
  });
}

test('the package input overrides the calling repository and the package repository is never its own consumer', async () => {
  const forge = await consumerForge();
  const run = await runStep(
    { ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, package: 'agent-standards' },
    { serverUrl: forge.url, repository: 'webgrip/workflows' },
  );
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.deepEqual(schedules(forge.requests).map(call => call.query.project), ['webgrip/installs-agent-standards', 'webgrip/runs-agentstd']);
});

test('the summary names the file that made each repository a consumer', async () => {
  const forge = await consumerForge();
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url }, { serverUrl: forge.url, repository: 'webgrip/workflows' });
  await forge.close();
  assert.match(run.summary, /### Renovate scheduled on the consumers of workflows/);
  assert.match(run.summary, /\| webgrip\/calls-a-workflow \| `\.forgejo\/workflows\/ci\.yml` uses workflows \| scheduled \|/);
  assert.match(run.summary, /\| webgrip\/calls-a-composite \| `\.github\/workflows\/release\.yaml` uses workflows \| scheduled \|/);
  assert.match(run.log, /2 of 12 renovate repositories consume workflows/);
});

test('without projects only the organisation repositories carrying the topic are read, across pages, except itself', async () => {
  const filler = Array.from({ length: 55 }, (_, index) => repository(`untagged-${index}`, { topics: [] }));
  const workflowCall = { '.forgejo/workflows/ci.yml': 'uses: webgrip/workflows/.forgejo/workflows/tests.yml@v1.0.0' };
  const forge = await fakeForge({
    repositories: [
      repository('unfold'),
      repository('workflows'),
      repository('old-app', { archived: true }),
      repository('upstream', { mirror: true }),
      ...filler,
      repository('erfbeeld'),
    ],
    files: Object.fromEntries(['unfold', 'workflows', 'old-app', 'upstream', 'untagged-0', 'erfbeeld'].map(name => [`webgrip/${name}`, workflowCall])),
  });
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url }, { serverUrl: forge.url });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.deepEqual(schedules(forge.requests).map(call => call.query.project), ['webgrip/unfold', 'webgrip/erfbeeld']);
  const listings = forge.requests.filter(request => request.path === '/api/v1/orgs/webgrip/repos');
  assert.deepEqual(listings.map(listing => listing.query.page), ['1', '2']);
  assert.equal(listings[0].authorization, 'token job-token');
  const readRepositories = new Set(forge.requests.filter(request => request.path.startsWith('/api/v1/repos/')).map(request => request.path.split('/').slice(4, 6).join('/')));
  assert.deepEqual([...readRepositories].sort(), ['webgrip/erfbeeld', 'webgrip/unfold']);
  assert.ok(forge.requests.filter(request => request.path.startsWith('/api/v1/repos/')).every(request => request.authorization === 'token job-token'));
});

test('a repository stops being read at its first matching file', async () => {
  const forge = await fakeForge({
    repositories: [repository('app')],
    files: {
      'webgrip/app': {
        'package.json': '{ "devDependencies": { "@webgrip/semantic-release-config": "2.5.0" } }',
        '.forgejo/workflows/release.yml': 'image: harbor.webgrip.dev/webgrip/semantic-release:2.5.0',
      },
    },
  });
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, package: 'semantic-release-config' }, { serverUrl: forge.url });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  const reads = forge.requests.filter(request => request.path.startsWith('/api/v1/repos/'));
  assert.deepEqual(reads.map(request => request.path), ['/api/v1/repos/webgrip/app/raw/package.json']);
});

test('an unreadable file skips the repository with a warning and the rest still run', async () => {
  const forge = await fakeForge({
    repositories: [repository('locked'), repository('app')],
    files: {
      'webgrip/locked': { 'renovate.json': 403 },
      'webgrip/app': { 'renovate.json5': "{ extends: ['local>webgrip/renovate-config'] }" },
    },
  });
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, package: 'renovate-config' }, { serverUrl: forge.url });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.deepEqual(schedules(forge.requests).map(call => call.query.project), ['webgrip/app']);
  assert.match(run.log, /::warning::renovate-trigger could not read renovate\.json \(HTTP 403\) of webgrip\/locked; it is not scheduled/);
});

test('an unreadable workflow directory skips the repository with a warning', async () => {
  const forge = await fakeForge({ repositories: [repository('locked')], files: { 'webgrip/locked': { '.forgejo/workflows': 500 } } });
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url }, { serverUrl: forge.url });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.equal(schedules(forge.requests).length, 0);
  assert.match(run.log, /::warning::renovate-trigger could not read \.forgejo\/workflows \(HTTP 500\) of webgrip\/locked/);
});

test('a package without consumer rules warns and schedules nothing', async () => {
  const forge = await consumerForge();
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url }, { serverUrl: forge.url, repository: 'webgrip/unfold' });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.equal(forge.requests.length, 0);
  assert.match(run.log, /::warning::renovate-trigger knows no consumers of unfold/);
});

test('an explicit projects list overrides consumer discovery', async () => {
  const forge = await consumerForge();
  const run = await runStep(
    { ...inputDefaults(), token: 'hook-token', 'operator-url': forge.url, projects: 'webgrip/uses-nothing' },
    { serverUrl: forge.url, repository: 'webgrip/workflows' },
  );
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.deepEqual(schedules(forge.requests).map(call => call.query.project), ['webgrip/uses-nothing']);
  assert.ok(!forge.requests.some(request => request.path.startsWith('/api/')));
  assert.match(run.summary, /\| webgrip\/uses-nothing \| listed in `projects` \| scheduled \|/);
});

test('an unreachable operator after discovery is a warning, not a failure', async () => {
  const forge = await consumerForge();
  const run = await runStep({ ...inputDefaults(), token: 'hook-token', 'operator-url': 'http://127.0.0.1:9' }, { serverUrl: forge.url, repository: 'webgrip/workflows' });
  await forge.close();
  assert.equal(run.status, 0, run.log);
  assert.match(run.log, /::warning::renovate-operator at http:\/\/127\.0\.0\.1:9 is unreachable/);
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
