'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { parse } = require('yaml');
const vm = require('node:vm');

for (const name of ['techdocs-generate', 'techdocs-deploy-docs-site']) {
  const workflow = parse(fs.readFileSync(`.forgejo/workflows/${name}.yml`, 'utf8'));
  const inputs = workflow.on.workflow_call.inputs;
  const steps = Object.values(workflow.jobs)[0].steps;
  test(`${name}: every operation obeys the gate even after job flattening`, () => {
    assert.equal(inputs.enabled.default, 'true');
    for (const step of steps) {
      for (const enabled of ['', 'false', 'true']) {
        assert.equal(vm.runInNewContext(step.if.replace(/^\$\{\{\s*|\s*\}\}$/g, ''), { inputs: { enabled } }), enabled === 'true');
      }
    }
  });
  test(`${name}: optional hooks retain defaults and fail on shell errors`, () => {
    for (const phase of ['prepare', 'finalize']) {
      assert.equal(inputs[`${phase}-command`].default, '');
      const step = steps.find(step => step.env?.[`DOCS_${phase.toUpperCase()}_COMMAND`]);
      assert.match(step.run, /bash -e -o pipefail -c/);
      for (const command of ['', 'true', 'false; true', 'false | true']) {
        const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', command]);
        assert.equal(result.status === 0, ['', 'true'].includes(command));
      }
    }
    for (const step of steps.filter(step => step.run)) {
      assert.equal(spawnSync('bash', ['-n'], { input: step.run }).status, 0);
    }
  });
}

test('deployment validates the configured tree before indexing, scanning and syncing', () => {
  const workflow = parse(fs.readFileSync('.forgejo/workflows/techdocs-deploy-docs-site.yml', 'utf8'));
  const steps = workflow.jobs['deploy-docs-site'].steps;
  assert.equal(workflow.on.workflow_call.inputs['site-dir'].default, 'site');
  const position = name => steps.findIndex(step => step.name?.startsWith(name));
  assert.ok(position('Build site') < position('Graft agent'));
  assert.ok(position('Graft agent') < position('Finalize'));
  assert.ok(position('Finalize') < position('Pagefind'));
  assert.ok(position('Pagefind') < position('Secret gate'));
  assert.ok(position('Secret gate') < position('Sync'));
  for (const prefix of ['Build site', 'Graft agent', 'Pagefind', 'Secret gate', 'Sync']) {
    assert.ok(steps[position(prefix)].run.includes('inputs.site-dir'));
  }
});
