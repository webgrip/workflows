# ADR 0004 – CI Bot Identity and Forgejo Package Distribution

* **Status**: Accepted
* **Deciders**: Ryan Grippeling
* **Date**: 2026-07-26
* **Tags**: CI::ReusableWorkflows, Forgejo, Packages, Identity
* **Version**: 1.0.0

---

## Context and Problem Statement

Every Forgejo Actions job gets a **built-in per-job token**, exposed as `secrets.FORGEJO_TOKEN`
(and `secrets.GITHUB_TOKEN`). Because Forgejo **reserves the `FORGEJO_`/`GITHUB_`/`GITEA_`
secret-name prefixes**, no stored org/repo secret can ever shadow those names — a workflow that
references `secrets.FORGEJO_TOKEN` is *always* using the per-job token, no matter what the
author believed they configured. That token is subtly wrong for release work:

- Releases it creates are attributed to **Ghost** (the internal actions user) instead of a
  real identity.
- Releases it creates do **not** emit a native `release` Actions event (same-token
  loop-prevention), which forced every repo to hand-roll `workflow_dispatch` chains to get
  their publish workflows to run.
- It **cannot write org packages**: registry login succeeds, the build runs, and the push
  401s at `reqPackageAccess` — a failure mode that cost a full multi-arch build per attempt
  (ploeg run 43).

Separately, Forgejo packages are **owner-scoped and land unlinked**: nothing appears on a
repo's `/packages` page until an explicit link call is made, so even correctly-pushed
packages were invisible at the repo level (the original symptom: an empty
`forgejo.webgrip.dev/webgrip/ploeg/packages`).

The org already provisions a real CI identity — the `webgrip-ci` bot, whose token is minted
in-cluster (`forgejo-ci-provisioner`, scopes incl. `write:package`) and published hourly as
the org secret **`WEBGRIP_CI_TOKEN`** plus org var **`WEBGRIP_CI_BOT_NAME`**
(`forgejo-actions-secrets` CronJob in webgrip/homelab-cluster). The problem was that half the
estate didn't use it.

## Decision Drivers

| # | Driver (why this matters)                                                                 |
| - | ----------------------------------------------------------------------------------------- |
| 1 | Releases and packages must carry a real, auditable identity (not Ghost)                    |
| 2 | Publish pipelines should trigger off native `release` events, not hand-rolled dispatches   |
| 3 | Org packages must be writable from CI and visible on their repo's packages page            |
| 4 | The correct behavior must live in shared reusables, not be re-derived per repo             |

## Considered Options

1. **Bot identity everywhere + native events + shared distribute/link reusable + org reconciler** (chosen)
2. Keep the per-job token and manual dispatch chains; link packages by hand as needed
3. Per-repo inline fixes only (ploeg-style), no shared reusable

## Decision Outcome

Chosen option: **Option 1**, because it fixes the class, not the instance:

- **Identity**: release-path workflows authenticate with `WEBGRIP_CI_TOKEN`. The reusables in
  this repo (`semantic-release.yml`, `semantic-release-monorepo.yml`,
  `application-release*.yml`, `rust-semantic-release.yml`) declare an un-shadowable
  **`CI_TOKEN`** workflow_call secret and prefer it over the legacy `FORGEJO_TOKEN`
  declaration (`secrets.CI_TOKEN || secrets.FORGEJO_TOKEN`) — a caller-mapped secret *named*
  `FORGEJO_TOKEN` risks resolving to the built-in token inside the reusable, and no release
  has proven that pass-through safe.
- **Native events**: bot-cut releases fire the `release` event (only same-token actions are
  loop-suppressed), so manual `workflow_dispatch` chains after semantic-release are removed
  (ploeg run 48/49 precedent; webgrip/infrastructure followed). `workflow_dispatch` triggers
  remain for manual re-publish/backfill of an existing tag.
- **Distribution + linking**: `forgejo-distribute.yml` mirrors a release's container image
  and OCI Helm chart into the Forgejo registry and makes the **idempotent link call** that
  pins each package to its repo. `helm-chart-push.yml` grew an optional `link-repo` input for
  Forgejo-registry pushes. (Link API quirk: HTTP 400 has exactly two paths — owner mismatch
  and already-linked — so 400 is treated as converged.)
- **Backstop**: an org-wide `forgejo-package-link-reconciler` CronJob (webgrip/homelab-cluster,
  same in-cluster API pattern as `forgejo-actions-secrets`) links any unlinked package to its
  same-named repo (plus a static alias map, e.g. `ploegd=ploeg`) hourly and logs unmatched
  packages as the conformance signal.

### Consequences

* Good, because Ghost releases, missing release events, and package-push 401s become
  impossible-by-construction for repos on the shared reusables.
* Good, because a repo's `/packages` page is populated automatically on every release, and
  drift self-heals hourly.
* Bad, because two token interfaces (`CI_TOKEN` preferred, `FORGEJO_TOKEN` legacy) coexist
  until all callers migrate — the legacy name stays a landmine for new callers until removed.
* Bad, because the reconciler's alias map is static; a new package whose name differs from
  its repo needs a one-line alias (the UNMATCHED log line says so).

### Confirmation

- `curl -s https://forgejo.webgrip.dev/api/v1/repos/webgrip/<repo>/releases?limit=1 | jq -r '.[0].author.login'`
  returns `webgrip-ci` (not `Ghost`) for every repo releasing through these reusables.
- `curl -s https://forgejo.webgrip.dev/api/v1/packages/webgrip | jq -r '.[] | select(.repository == null) | .name'`
  is empty (or every name is listed as UNMATCHED in the reconciler's log, awaiting an alias).
- ploeg (first adopter of `forgejo-distribute.yml`) publishes and links `ploegd` + `ploeg`
  on every release; `webgrip/ploeg/packages` is non-empty.

## More Information

* Technical story: empty `webgrip/ploeg/packages` investigation, 2026-07-25/26 — per-job
  token unmasked as the root cause of Ghost releases, dispatch workarounds, and package-push
  401s; fixed inline in ploeg (v0.1.0-rc.9), then generalized here.
* 2026-07-26 — `forgejo-distribute.yml` + `helm-chart-push.yml` `link-repo` added (52179bd);
  `CI_TOKEN` dual-declare in the release reusables (ee95f9a); this record accepted.
* Related: webgrip/homelab-cluster ADR-0050 (per-repo delivery contract — the `webgrip-ci`
  push-whitelist identity is the same bot this record standardizes on).
