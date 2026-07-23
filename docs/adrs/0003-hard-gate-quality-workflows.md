# ADR 0003 – Hard-Gate Quality Workflow Family (Forgejo)

* **Status**: Accepted
* **Deciders**: Ryan Grippeling
* **Date**: 2026-07-23
* **Tags**: CI::ReusableWorkflows, Forgejo, Quality
* **Version**: 1.0.0

---

## Context and Problem Statement

ADR 0001 standardized per-language `*-application-tests` / `*-application-static-analysis`
workflows with a deliberately **advisory** posture: most tool steps soft-fail
(`continue-on-error` / `|| true`) so any repo can adopt them without first fixing every finding.
That is the right default for onboarding a fleet, but it is the wrong contract for repos that
treat CI as a merge gate: a gate that cannot fail is not a gate.

Erfbeeld (Rust core → wasm, Laravel adapters, moon-orchestrated web client) needed hard gates
and grew ~200 lines of bespoke per-repo CI to get them. That logic is generic and belongs here,
but it cannot be folded into the advisory family without breaking the advisory contract for
existing consumers.

## Decision Drivers

| # | Driver (why this matters)                                                        |
| - | -------------------------------------------------------------------------------- |
| 1 | Repos need CI that FAILS when style/types/architecture/tests fail                 |
| 2 | Advisory-family consumers must keep their soft-fail semantics untouched           |
| 3 | Cross-job artifact hand-off (e.g. a wasm build consumed by PHP and web jobs)      |
| 4 | Forgejo act_runner constraints differ structurally from GitHub-hosted runners     |

## Considered Options

1. **Add strictness flags to the advisory family** – one workflow, `strict: true` input.
2. **A separate hard-gate family alongside the advisory one** – distinct workflows, distinct contract.
3. **Keep hard gates repo-local** – every strict repo hand-rolls its own jobs.

## Decision Outcome

### Chosen Option

**Option 2 – a separate hard-gate family** (`rust-quality.yml`, `laravel-quality.yml`,
`moon-ci.yml`, plus the deploy-shaped `spa-preview.yml` and `docker-mirror.yml`), Forgejo-only.

### Rationale

A strictness flag doubles the test matrix of every advisory workflow and makes the failure
semantics of any given consumer invisible at the call site. A separate family keeps both
contracts one-line readable in the caller (`uses: …/laravel-quality.yml` *is* the statement
"these are hard gates"), and repo-local hard gates are exactly the duplication this repo exists
to remove.

### Family contract

* **Every step is fatal.** No `continue-on-error`, no `|| true`. A tool is skipped only when the
  caller opts out explicitly (`run-<tool>: false`) — visible in the consumer, never silent.
* **Artifact hand-off**: a producer job uploads via `forgejo/upload-artifact@v4`; consumer jobs
  in the same run download via `forgejo/download-artifact@v4` (`artifact-name`/`artifact-path`
  inputs). The upstream `actions/*-artifact` do not work against Forgejo.
* **Runner image as input**: jobs run in Harbor-hosted CI images (`*-ci-runner`) passed via
  `runner-image` — consumers may digest-pin. Images MUST bake node: act_runner execs JS actions
  inside the job container.
* **`actions/cache` pinned `@v4.1.2`**: the runner execs a literal `node` from PATH regardless
  of an action's declared runtime and the pool exports externals/node20; cache v5/v6 declare
  node24. Do not float this pin.
* **Per-step `working-directory`**, never `defaults.run.working-directory` with an expression
  (unreliable on act_runner).
* **Best-effort is a workflow input** (`best-effort` on `docker-mirror.yml`,
  `helm-chart-push.yml`): caller jobs using `uses:` cannot set `continue-on-error`, so the flag
  must live inside the callable workflow.
* **Conditions are a workflow input** (`enabled` on the release/build/push/preview/mirror
  workflows): Forgejo v15's reusable-workflow flattening DROPS `if:` conditions on `uses:`
  caller jobs — observed live: a `release` caller with `if: github.ref == 'refs/heads/main'`
  ran its inner job on a feature branch. Callers pass the condition as `enabled:` and the
  gate is an `if:` on the innermost real (non-`uses:`) job, where it is honored. Nested
  wrappers (harbor-fast → registry-fast) thread the input down to that job.
* **Forgejo-only**: listed in `FORGEJO_ONLY` of `scripts/forgejo-parity-check.sh`. No `.github`
  siblings are written speculatively — Forgejo is where these run and where they can be tested.

### Positive Consequences

* Strict repos (erfbeeld first) consume one-line gates instead of hand-rolled jobs.
* The advisory family is untouched; its consumers see zero change.
* Forgejo runner quirks are encoded once, here, instead of re-discovered per repo.

### Negative Consequences / Trade-offs

* Two PHP families exist (`php-application-*` advisory, `laravel-quality.yml` hard); README
  marks the advisory pair as the onboarding tier and this family as the gate tier.
* The `.forgejo` tree grows entries with no `.github` sibling (accepted via `FORGEJO_ONLY`).

### Risks & Mitigations

* *Runner image drift* (image lacks a tool a gate calls) → images are versioned and consumers
  pin; gates fail loudly, never silently skip.
* *Cache-pin rot* (act_runner eventually ships node24) → revisit the `@v4.1.2` pin when the
  runner pool's externals change; the pin rationale is commented at every use site.

## Validation

* **Immediate proof** – erfbeeld's `on_source_change.yml` consumes `rust-quality.yml` (wasm
  artifact) → `laravel-quality.yml` + `moon-ci.yml` (artifact restore) with identical gate
  behavior to its previous inline jobs.
* **Ongoing guardrails** – `scripts/forgejo-parity-check.sh` (forbidden-construct grep covers
  this family); consumer runs on the Forgejo instance.

## Compliance, Security & Privacy Impact

No data classification changes. `spa-preview.yml` documents why its push token belongs to a
narrowly-scoped account (`agent-builder`) rather than the org-wide CI bot: preview builds run
agent-authored branches.

## Notes

* **Related Decisions**: ADR 0001 (standardized language workflows), ADR 0002 (Forgejo parity).
* **Supersedes / Amends**: none — extends ADR 0001 with a second tier.
* **Follow-ups / TODOs**: align `rust-tests.yml`/`rust-static-analysis.yml` (`.forgejo` copies)
  with this family's cache/image conventions; deprecation review of the near-stub
  `application-test.yml`.

---

### Revision Log

| Version | Date       | Author           | Change           |
| ------- | ---------- | ---------------- | ---------------- |
| 1.0.0   | 2026-07-23 | Ryan Grippeling  | Initial creation |
