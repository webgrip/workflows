# act-events Payloads

Event JSON payloads used by `act` to simulate GitHub events that our local runner can't auto-generate.

## Files

- `push.json` – Minimal generic push to `main`.
- `push-template-files.json` – Example push modifying template files.
- `helm-charts-deploy.workflow_dispatch.json` – Dispatch with required `paths` input for Helm chart deployment (JSON string array).
- `on_docs_change.workflow_dispatch.json` – Dispatch for docs generation / deploy with optional `source-dir`.
- `workflow-dispatch-dry-run.json` / `workflow-dispatch-custom-topic.json` – Example dispatch payloads retained from earlier workflows (topic + dry-run flags).

## Usage Examples

Run helm charts deploy workflow (auto-selects workflow_dispatch when using file directly):

```bash
act workflow_dispatch -P linux/amd64 \
  --eventpath .github/act-events/helm-charts-deploy.workflow_dispatch.json \
  -W .github/workflows/helm-charts-deploy.yml
```

Run docs change workflow:

```bash
act workflow_dispatch -P linux/amd64 \
  --eventpath .github/act-events/on_docs_change.workflow_dispatch.json \
  -W .github/workflows/on_docs_change.yml
```

Generic push (use with a workflow that has a push trigger):

```bash
act push -P linux/amd64 --eventpath .github/act-events/push.json
```

## Notes

- `paths` input must be a JSON string representing an array of objects with a `path` key.
- Secrets required by the workflow must be provided via `.act_secrets`.
- Update payloads as workflows evolve; keep unused ones pruned.
