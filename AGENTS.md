# AGENTS.md — webgrip/workflows

The workflow catalogue is in [`README.md`](README.md) and the decisions are in
[`docs/adrs/`](docs/adrs/); neither is repeated here. This file carries what an agent cannot
derive by reading a single workflow file: the two-tree contract, and the rules that look like
style and are not.

## The two trees

`.github/workflows/` is the **frozen source**. `.forgejo/workflows/` is its Forgejo-adapted
mirror (ADR 0002). Never hand-edit a generated file — edit the `.github/` original and
regenerate.

- [`scripts/generate-forgejo-workflows.sh`](scripts/generate-forgejo-workflows.sh) copies each
  `.github/workflows/*.yml` into `.forgejo/workflows/` through a single `sed` that rewrites
  self-references `webgrip/workflows/.github/` → `webgrip/workflows/.forgejo/`. That sed is the
  whole adaptation a "mechanical" (Tier-1) copy gets. The script writes only under `.forgejo/`
  and never touches `.github/`.
- The **26 files in the `MANUAL[]` array are hand-owned** — registry pinning, auth, and the
  Forgejo reimplementations of GitHub-only workflows. The generator skips them. Adding a
  workflow that needs any real adaptation means adding it to `MANUAL[]` and porting it by hand,
  not loosening the generator.
- After generating, the script greps every generated file for
  `actions/checkout@v6|create-github-app-token|@semantic-release/github|ghcr\.io` and fails if
  one leaked. A hit is the signal that the file belongs in `MANUAL[]`.
- [`scripts/forgejo-parity-check.sh`](scripts/forgejo-parity-check.sh) guards the layout from
  the other side: no orphan `.forgejo` workflow without a `.github` sibling, no forbidden
  construct in the mirror, and a coverage report of unported workflows. Workflows that are
  deliberately Forgejo-only (LAN-only Harbor, Cloudflare, the hard-gate families, this repo's
  own CI) must be listed in its `FORGEJO_ONLY` array with the reason, or the check reports them
  as orphans. Coverage is informational until `STRICT=1` or `.forgejo/.parity-complete`.

## `on_source_change.yml` and `on_docs_change.yml` are this repo's own CI

Every other file under `.forgejo/workflows/` is `on: workflow_call` — a library other repos
consume. These two are `on: push` and run **for** this repo. Do not read them as consumer
templates, do not mirror them into `.github/`, and do not "fix" their triggers to match the
library's shape.

## Load-bearing rules

- **`uses:` must be the `org/repo/path@sha` shorthand**, never a full `https://` URL. Forgejo
  resolves the called workflow's `runs-on` server-side, and a full URL leaves the job queued
  forever against an empty label list.
- **`actions/checkout@v5`, never `@v6`** — v6 is broken on non-GitHub runners.
- **`WEBGRIP_CI_TOKEN`, never `secrets.FORGEJO_TOKEN`.** A caller-mapped secret of that name
  resolves to the runner's built-in per-job token, which cuts ghost releases attributed to
  Ghost, fires no native `release` event, and cannot write org packages.
- **The self-CI composite is referenced by remote pinned ref, not `./.forgejo/...`.** It runs
  its own `actions/checkout` as step one, so at `uses:` resolution time the workspace is still
  empty and a local path cannot resolve.
- **`runs-on: docker`.** The in-cluster Forgejo has one ephemeral runner pool and it advertises
  exactly that label.
- **A reusable workflow's inner jobs are flattened into the caller's graph, and the caller
  job's `if:` does NOT apply to them.** A "skipped" `uses:` still runs its jobs. Conditionals
  around reusable work must be step-level.
- **Releases are tag-only.** [`.releaserc.cjs`](.releaserc.cjs) deliberately omits `manifest` —
  there is no version-bearing file to bump. `floatingMajorTag` is deliberately off: a moving
  `v1` would reintroduce the mutable ref the first tagging removed. Consumers pin immutable
  `@vX.Y.Z` and let Renovate move them.
- **Untagged is not a cosmetic problem.** Renovate resolves these refs through the
  `forgejo-tags` datasource, which looks refs up as tags: an `@main` pin 404s and fails the
  consumer's **entire** Renovate run, not just that dependency. The library shipped 45
  workflows with zero tags for months and broke every consumer this way.
- **The toolchain is the image** (ADR 0005). Release jobs run in
  `harbor.webgrip.dev/webgrip/semantic-release:<pin>` and install nothing at release time; the
  composite fails loudly without it rather than silently falling back.

## Repo rules

- **Comments are NOT allowed.** Always communicate intent with code: a precise name, a type, a
  smaller function, a test that states the case. A comment is a failure. This holds for every
  language in the repo, prose in YAML and TOML included. Machine-read directives stay, because the
  toolchain acts on them as syntax: `// @ts-check`, `eslint-disable`, `<!-- prettier-ignore -->`,
  `# syntax=`, `# renovate:`, `# yaml-language-server:`, and shebangs. Doc-comment forms the
  toolchain itself reads are not comments either and stay: godoc directly above an exported
  identifier, rustdoc `///` and `//!`, and PHPDoc blocks carrying type tags. Anything that outlives
  a single expression belongs in `docs/` or an ADR, where it gets reviewed, linked and kept
  current. The estate decision is
  [ADR 0006](https://forgejo.webgrip.dev/webgrip/workflows/src/branch/main/docs/adrs/0006-no-comments-in-code.md).
