# ADR 002 - Forgejo Actions Parity (Two-Tree Layout)

* **Status**: Accepted
* **Deciders**: WebGrip maintainers
* **Date**: 2026-06-12
* **Tags**: CI::Workflows, Migration, Forgejo, Standardization
* **Version**: 1.0.0

---

## Context and Problem Statement

WebGrip is migrating from GitHub to Forgejo. This repository is a centralized library of reusable
`workflow_call` workflows and composite actions, consumed by other repos via
`uses: webgrip/workflows/.github/workflows/<x>.yml@main`. The library must run on **Forgejo Actions** with
the same capabilities, **without breaking the repos that stay on GitHub** during the transition.

Forgejo v15.0 (April 2026, current LTS) added the three features the library most depends on:
cross-repository `workflow_call` (the called repo must be **public**), OIDC `id-token` for Actions
(requires forgejo-runner > v12.5.0), and repo-scoped tokens. Several deeply GitHub-bound pieces
(GitHub App tokens, GitHub Models, GitHub Pages hosting, GitHub Advanced Security) have **no Forgejo
analog** and must be replaced or dropped.

The core problem: adapting the existing `.github/workflows/` files in place would change behavior for
GitHub consumers (e.g. `actions/checkout@v6` is broken on non-GitHub runners and must be downgraded;
`@semantic-release/github` and `create-github-app-token` do not work against Forgejo). We need a layout
that lets both ecosystems run independently from a single repository.

## Decision Drivers

| # | Driver |
| - | ------ |
| 1 | GitHub-hosted consumer repos must keep working unchanged during and after the migration |
| 2 | Forgejo consumers need the complete library at a stable, predictable path |
| 3 | Forgejo-specific adaptations (action pinning, registry, auth) must not leak into the GitHub path |
| 4 | Minimize the risk of a single repo on a Forgejo host triggering workflows twice |
| 5 | Keep the duplicated trees from silently drifting apart |

## Considered Options

1. **Option A — Dual-home**: keep one `.github/workflows/` tree and make each file work on both platforms.
2. **Option B — Clean break**: move everything to `.forgejo/workflows/`, retire `.github/`.
3. **Option C — Two independent trees**: freeze `.github/` for GitHub, add a parallel adapted `.forgejo/`.

## Decision Outcome

### Chosen Option

**Option C — two independent trees.**

```
.github/workflows/      .github/composite-actions/      ← FROZEN, GitHub-only, untouched
.forgejo/workflows/     .forgejo/composite-actions/     ← Forgejo-adapted, full mirror
```

- `.github/` stays **byte-for-byte unchanged**. GitHub consumers keep referencing
  `webgrip/workflows/.github/workflows/<x>.yml@main`.
- `.forgejo/` is a **full mirror** of all workflows and the composite actions they reference, carrying every
  Forgejo adaptation. Forgejo consumers reference `webgrip/workflows/.forgejo/workflows/<x>.yml@main`.
- Inside the `.forgejo/` copies, every internal self-reference is rewritten from `.github/...` to `.forgejo/...`
  so the Forgejo tree is fully self-contained.

### Rationale

Option A was rejected because a single file cannot satisfy both platforms: `checkout@v6` must be `@v5` on
Forgejo but stays `@v6` on GitHub; GitHub App tokens and `@semantic-release/github` have no Forgejo behavior.
Option B was rejected because it forces a flag-day edit of the `uses:` line in every GitHub consumer the moment
the path changes. Option C keeps the two ecosystems decoupled: GitHub reads only `.github/`, Forgejo consumers
opt into `.forgejo/`, and neither path mutates the other.

### Supporting decisions

* **Action resolution**: instance `DEFAULT_ACTIONS_URL=https://github.com` so bare `uses: actions/...` resolve;
  vendor `actions/checkout` and `docker/*` into the Forgejo instance for resilience. Pin `actions/checkout@v5`
  in `.forgejo/` copies that use `@v6`.
* **Registry**: target **Harbor** on the cluster as the container + Helm OCI registry (replacing `ghcr.io`),
  with a Docker Hub pull-through proxy-cache to remove rate-limit exposure. Forgejo's built-in OCI registry is
  the fallback. Registry host and credentials are workflow inputs/secrets so the target is swappable.
* **Auth**: a dedicated Forgejo CI bot user with a repo/org-scoped `FORGEJO_TOKEN` replaces the GitHub App
  token pattern. OIDC `id-token` is kept only where genuinely needed.
* **Runners**: reuse the existing labels (`arc-runner-set`, `arc-runner-set-heavy`) on forgejo-runner so no
  `runs-on:` edits are required; docker backend for general jobs, privileged host/dind for heavy docker builds.

### Positive Consequences

* GitHub consumers are unaffected; the migration is non-breaking for repos that stay on GitHub.
* Forgejo consumers get a complete, self-contained library at one path.
* Forgejo-only concerns (pinning, Harbor, bot auth) are isolated to `.forgejo/`.

### Negative Consequences / Trade-offs

* The workflow count roughly doubles; the two trees must be kept in sync.
* When this repo is hosted on Forgejo, Forgejo reads both directories, so workflows with real `on:` triggers
  could be discovered in both trees (see Risks).

### Risks & Mitigations

* Risk: the trees drift apart as new workflows are added.
  Mitigation: a CI parity check fails if any `.github/workflows/*.yml` lacks a `.forgejo/` sibling; an
  idempotent transform script bootstraps and refreshes the mechanical (T1/T2) deltas, while hand-owned T3
  files are excluded from regeneration.
* Risk: double-discovery on a Forgejo host for self-triggering workflows.
  Mitigation: the library is almost entirely `workflow_call` (no self-trigger); for the few with `on: push`/
  `workflow_dispatch`, keep the live trigger only in the `.forgejo/` copy and confirm the frozen `.github/`
  copy is inert on Forgejo.
* Risk: `webgrip/workflows` must be public on Forgejo for cross-repo `workflow_call`.
  Mitigation: flagged as a platform-team prerequisite before fan-out.

## Validation

* **Static gates** — `actionlint` over `.forgejo/workflows/*.yml`; parity check for sibling coverage; grep
  assertions that `.forgejo/` contains no `checkout@v6`, `create-github-app-token`, `@semantic-release/github`,
  or bare `ghcr.io`, and that `.github/` stays unchanged (`git diff` clean).
* **Local fidelity** — `forgejo-runner exec` per workflow before any server cutover.
* **Staging** — a public mirror plus a canary consumer prove cross-repo resolution, Harbor push/pull,
  `semantic-release-gitea`, and the Forgejo API rewrites tier by tier.

## Compliance, Security & Privacy Impact

Harbor adds Trivy vulnerability scanning on push and scoped robot credentials, improving registry posture.
GitHub Advanced Security / secret scanning have no Forgejo analog and are dropped from the repo-management
workflows. Static GitHub App keys are replaced by a scoped Forgejo token (and OIDC where applicable).

## Notes

* **Related Decisions**: Builds on ADR 001 (standardized language workflows); the `.forgejo/` mirror preserves
  that shared CI shape.
* **Supersedes / Amends**: None.
* **Follow-ups / TODOs**: Install Harbor + proxy-cache; provision the Forgejo CI bot user and `FORGEJO_TOKEN`;
  confirm the public-repo requirement; re-publish `ghcr.io/webgrip/php-ci-runner` to Harbor.

---

### Revision Log

| Version | Date | Author | Change |
| ------- | ---- | ------ | ------ |
| 1.0.0 | 2026-06-12 | WebGrip maintainers | Initial creation |
