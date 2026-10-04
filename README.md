# WebGrip Workflows

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-2088FF.svg)](https://github.com/features/actions)

A comprehensive collection of reusable GitHub Actions workflows and composite actions for modern CI/CD pipelines. This repository provides battle-tested automation for PHP, Rust, .NET, Java, JavaScript, Python, and Go projects, along with Docker containerization, Helm deployments, and repository management.

## 🚀 Features

- **30+ Reusable Workflows** - Production-ready CI/CD pipelines
- **Multi-Language Support** - PHP, Rust, .NET, Java, JavaScript/Node.js, Python, Go
- **Container & Cloud Native** - Docker build/push, Helm chart management
- **Quality Assurance** - Static analysis, testing, code coverage
- **Standardized CI Shape** - Common setup, caching, analysis, security, hygiene, and test phases across languages
- **Documentation** - TechDocs generation and deployment
- **Repository Management** - Template synchronization, bootstrapping
- **Semantic Versioning** - Automated releases with conventional commits

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Available Workflows](#available-workflows)
  - [Build & Dependencies](#build--dependencies)
  - [Testing & Quality Assurance](#testing--quality-assurance)
  - [Docker & Containerization](#docker--containerization)
  - [Helm & Kubernetes](#helm--kubernetes)
  - [.NET Development](#net-development)
  - [Java Development](#java-development)
  - [Rust Development](#rust-development)
  - [JavaScript Development](#javascript-development)
  - [Python Development](#python-development)
  - [Go Development](#go-development)
  - [Documentation](#documentation)
  - [Repository Management](#repository-management)
  - [Release Management](#release-management)
- [Composite Actions](#composite-actions)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Quick Start

To use these workflows in your repository, reference them in your `.github/workflows/` directory:

```yaml
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  tests:
    uses: webgrip/workflows/.github/workflows/tests.yml@main
    
  static-analysis:
    uses: webgrip/workflows/.github/workflows/static-analysis.yml@main
```

## 🌲 GitHub and Forgejo: two parallel trees

This repository ships **two independent copies** of the library so the same workflows can run on both
platforms without one breaking the other (see [ADR 002](docs/adrs/0002-forgejo-actions-parity.md)):

| Platform | Consume from | Notes |
|----------|--------------|-------|
| **GitHub** | `webgrip/workflows/.github/workflows/<x>.yml@main` | Frozen GitHub Actions definitions. |
| **Forgejo** | `webgrip/workflows/.forgejo/workflows/<x>.yml@main` | Forgejo-adapted copies (action pinning, Harbor registry, Forgejo auth). |

The two paths never collide. A Forgejo consumer uses the **`.forgejo/`** path; everything else about the
calling syntax is the same:

```yaml
jobs:
  tests:
    uses: webgrip/workflows/.forgejo/workflows/go-application-tests.yml@main
  static-analysis:
    uses: webgrip/workflows/.forgejo/workflows/go-application-static-analysis.yml@main
```

> ⚠️ **One thing does differ: conditional (ref-gated) jobs.** On Forgejo v15 an `if:` on a `uses:`
> caller job is **dropped** by reusable-workflow flattening, and caller `with:` expressions see an
> **empty** `github` context. The GitHub examples below that write `if: github.ref == …` on a `uses:`
> job **do not work on Forgejo** — use the `enabled` / `only-refs` / `skip-refs` inputs instead. See
> [Conditional (ref-gated) jobs on Forgejo](#conditional-ref-gated-jobs-on-forgejo) and
> [ADR 0003](docs/adrs/0003-hard-gate-quality-workflows.md).

> ⚠️ **Diagnostics differ too: `::error::` / `::warning::` / `::notice::` are GitHub-only.** They create
> annotations on GitHub — a red banner on the run page, an entry in the job's Annotations panel, an inline
> comment on the PR diff. Forgejo has **no annotations surface**: `act_runner` re-emits the line with a `❗`
> marker but keeps the raw `::error::` text, and the job API exposes no field for it, so all you get is an
> uglier log line. `$GITHUB_STEP_SUMMARY` is not a surface either — Forgejo dumps it into the log as a single
> line with literal `\n` sequences.
>
> So the **`.forgejo/` tree uses plain `ERROR:` / `WARN:` / `NOTE:` prefixes** on stdout, and puts the
> operator-actionable remediation on the last lines before `exit 1` — the log tail is what you land on when
> you expand a failed step. The **`.github/` tree keeps the workflow commands**, where they do real work.
>
> What Forgejo *does* surface is the **step list**: each step's name and pass/fail state are structured data
> in the job view. That makes a short, well-named precondition step (`Verify GHCR credentials`) worth far
> more than any log formatting — you see which check failed without opening anything. Prefer splitting
> preconditions into named steps over burying them in a long one.
>
> `::add-mask::` **is** functional on Forgejo (it is what produces `AUTHORIZATION: basic ***` in checkout
> logs) — keep it.

> **Requires Forgejo v15.0+** (cross-repository `workflow_call`). The `webgrip/workflows` repo must be
> **public** on the Forgejo instance. The Forgejo port is being rolled out tier by tier — consult
> `.forgejo/workflows/` for the workflows ported so far.

### Publishing images to the in-cluster Harbor (Forgejo)

`docker-build-and-push-harbor.yml` is a **Forgejo-only** workflow that builds and pushes to the in-cluster
**Harbor** registry (`harbor.webgrip.dev`, LAN-only). It pins `runs-on: docker` — the in-cluster Forgejo
runner is the only one that can reach Harbor. It is **additive**: the ghcr (`docker-build-and-push-ghcr.yml`)
and Docker Hub (`docker-build-and-push.yml`) workflows are unchanged, so a consumer can **dual-publish** during
the migration by running both:

```yaml
jobs:
  publish-ghcr:        # keeps ghcr populated (pushes to ghcr.io)
    uses: webgrip/workflows/.forgejo/workflows/docker-build-and-push-ghcr.yml@main
    with:
      docker-context: '.'
      docker-file: './ops/docker/<image>/Dockerfile'
      docker-tags: 'ghcr.io/webgrip/<image>:latest'
    secrets:
      REGISTRY_USERNAME: ${{ secrets.GHCR_USERNAME }}
      REGISTRY_TOKEN: ${{ secrets.GHCR_TOKEN }}

  publish-harbor:      # in-cluster runner -> Harbor (new)
    uses: webgrip/workflows/.forgejo/workflows/docker-build-and-push-harbor.yml@main
    with:
      docker-context: '.'
      docker-file: './ops/docker/<image>/Dockerfile'
      docker-tags: |
        webgrip/<image>:latest
        webgrip/<image>:${{ needs.release.outputs.version }}
    secrets:
      HARBOR_ROBOT_USER: ${{ secrets.HARBOR_ROBOT_USER }}    # robot$webgrip+ci
      HARBOR_ROBOT_TOKEN: ${{ secrets.HARBOR_ROBOT_TOKEN }}
```

A bare `webgrip/<image>:<tag>` tag is prefixed with the registry → `harbor.webgrip.dev/webgrip/<image>:<tag>`.
`registry` defaults to `harbor.webgrip.dev` (override only to point at another Harbor host). The robot login,
secret masking, and multi-arch buildx push live in **one** engine — the `docker-build-push-registry`
composite action, wrapped by the `docker-build-and-push-registry.yml` reusable workflow. The per-registry
workflows are thin: `docker-build-and-push-harbor.yml` (registry → `harbor.webgrip.dev`, maps the
`HARBOR_ROBOT_*` secrets) and `docker-build-and-push-ghcr.yml` (registry → `ghcr.io`) just `uses:` the
engine workflow. (`docker-build-and-push.yml` → Docker Hub remains a separate engine.) The
registry/harbor chains (fast and non-fast) accept `compression: zstd` — layers decompress ~2x
faster on pull; opt-in because very old dockerd cannot pull zstd (default `gzip`).

## 📦 Available Workflows

### Build & Dependencies

#### `composer-install.yml`
Installs PHP dependencies using Composer with caching and authentication support.

**Features:**
- Composer 2.8.5 container
- Private Packagist authentication
- Dependency caching
- Safe directory configuration

**Secrets:**
- `COMPOSER_TOKEN` (optional) - Packagist authentication token

**Example:**
```yaml
jobs:
  build:
    uses: webgrip/workflows/.github/workflows/composer-install.yml@main
    secrets:
      COMPOSER_TOKEN: ${{ secrets.COMPOSER_TOKEN }}
```

### Testing & Quality Assurance

#### `tests.yml`
Runs PHP test suites (Unit, Integration, Functional) in parallel using PHPUnit.

**Features:**
- PHP 8.2-CLI container
- Matrix strategy for multiple test suites
- Fail-fast disabled for comprehensive testing
- Composer dependency caching

#### `tests-coverage.yml`
Generates and reports code coverage metrics for PHP projects.

#### `static-analysis.yml`
Comprehensive PHP static analysis using multiple tools.

**Tools Included:**
- PHPStan - Static analysis
- PHPMD - Mess detection
- PHPCS - Code style checking
- Rector - Code modernization

#### `dotnet-application-static-analysis.yml`
Runs standardized .NET static analysis with `dotnet format`, build analyzers, vulnerable package scanning, and outdated package reporting.

#### `dotnet-application-tests.yml`
Runs `.NET` test suites with TRX output upload.

#### `java-application-static-analysis.yml`
Runs Java static analysis with build-tool detection, Spotless, configured verification plugins, OWASP dependency checks, and outdated dependency reporting.

#### `java-application-tests.yml`
Runs Maven or Gradle test suites and uploads common test report directories.

#### `node-application-static-analysis.yml`
Runs Node.js static analysis with package-manager detection, formatting, linting, type checks, dependency audit, dead dependency checks, and outdated reporting.

#### `node-application-tests.yml`
Runs Node.js test suites and uploads coverage artifacts when present. Pass `job-name` when a pipeline calls it more than once, so each call is labelled by what it runs instead of `Node.js test suite-1`, `-2`, `-3`.

#### `python-application-static-analysis.yml`
Runs Python static analysis with Ruff, optional MyPy, Bandit, `pip-audit`, and Deptry.

#### `python-application-tests.yml`
Runs Python tests using `pytest` when available and falls back to `unittest` discovery.

#### `go-application-static-analysis.yml`
Runs Go static analysis with `gofmt`, `go vet`, `golangci-lint`, `govulncheck`, and tidy verification.

#### `go-application-tests.yml`
Runs Go test suites and uploads coverage and test output artifacts.

### Hard-Gate Quality Workflows (Forgejo-only)

The `*-application-tests` / `*-application-static-analysis` family above is deliberately
**advisory** (tools soft-fail so any repo can adopt them). The hard-gate family below is the
opposite contract ([ADR 0003](docs/adrs/0003-hard-gate-quality-workflows.md)): every step is
fatal, tools are toggled explicitly by the caller, runner images come from Harbor (and must bake
node for JS actions), and artifacts flow between jobs of the same run via the
`forgejo/upload-artifact@v4` / `forgejo/download-artifact@v4` forks. Forgejo-only —
consume from `.forgejo/workflows/`.

#### Conditional (ref-gated) jobs on Forgejo

Forgejo v15 flattens a `uses:` reusable's jobs into the caller run, and that flattening changes
how conditions are evaluated — the GitHub idiom silently misfires:

- an `if:` on a `uses:` **caller** job is **dropped** (the inner job runs regardless of branch);
- a caller's `with:` expressions are evaluated at flatten time against an **empty** `github`
  context, so `enabled: ${{ github.ref == 'refs/heads/main' }}` bakes to the same value on every
  branch. `needs.*` **does** survive; a reusable's own job-level `if:` **is** runner-evaluated
  with the true `github.ref`.

So gate from **inside** the reusable, via inputs, not with a caller `if:`/`github.*`:

- **branch gate** → pass a static ref list as `only-refs` (allow) or `skip-refs` (deny); the
  reusable compares it against the true `github.ref` in its real job's `if:`;
- **output gate** → `enabled: ${{ needs.<job>.outputs.<x> != '' }}` (`needs.*` survives flattening);
- **non-fatal** → `best-effort: true` (a caller `continue-on-error:` on a `uses:` job is ignored).

```yaml
jobs:
  release: # cut a release only on main / development
    needs: [rust, php, web]
    uses: webgrip/workflows/.forgejo/workflows/semantic-release-monorepo.yml@main
    with:
      only-refs: "refs/heads/main refs/heads/development"   # NOT: if: github.ref == …
      package-path: "."
      package-name: myapp
  build: # build only when the release cut a version
    needs: [release]
    uses: webgrip/workflows/.forgejo/workflows/docker-build-and-push-harbor-fast.yml@main
    with:
      enabled: ${{ needs.release.outputs.version != '' }}   # needs.* survives flattening
      docker-context: "."
      docker-file: "Dockerfile"
      docker-tags: "webgrip/myapp:${{ needs.release.outputs.version }}"
```

Re-verify this behaviour after a Forgejo upgrade with `.forgejo/workflows/probe-flatten-context.yml`.
Rationale and the live-observed failure: [ADR 0003](docs/adrs/0003-hard-gate-quality-workflows.md)
("Conditions are a workflow input").

#### `rust-quality.yml`
`cargo fmt --check` → `clippy` → `test` for one cargo workspace, with an optional wasm build
(`wasm-package` input) uploaded as an artifact for sibling jobs. One job on purpose: the wasm
build reuses the tests' target dir and cargo cache. `test-command` replaces `cargo test` verbatim
(e.g. `cargo nextest run --workspace && cargo test --doc --workspace`); `sccache: true` wraps
rustc in sccache (needs a rust-ci-runner that bakes it).

#### `laravel-quality.yml`
Pint → PHPStan → deptrac (`--fail-on-uncovered`) → Pest (`pest-args`, default `--ci`), all fatal.
Prefer this over the advisory PHP pair for Laravel repos. Supports an artifact restore before
`composer install` (e.g. a wasm binding the test suite serves) and a `pre-test-command` (env
setup). PHPStan's result cache (`/tmp/phpstan`) is persisted so analysis is incremental.

#### `moon-ci.yml`
Runs [moon](https://moonrepo.dev) task-graph targets (`tasks: "web:test web:build"`) after an
optional artifact restore — the generic shape for monorepos where moon owns the cross-package
task graph. `.moon/cache` is persisted so unchanged targets are cache hits across runs.

#### `spa-preview.yml`
Per-branch static SPA preview: builds with `PREVIEW_SLUG`/`PREVIEW_BASE` exported, pushes the
bundle into a previews repo served by the in-cluster preview host
(`https://preview.webgrip.dev/<slug>/`), and posts one marker-idempotent PR comment.

**Secrets:** `PREVIEW_PUSH_TOKEN` — token of a narrowly-scoped account (default `agent-builder`),
deliberately not the org-wide CI bot.

#### `docker-mirror.yml`
Copies already-built images between registries (default Harbor → the Forgejo registry, so images
appear as repo-linked packages). `best-effort: true` (default) makes failures non-fatal — the
flag lives inside the workflow because caller jobs with `uses:` cannot set `continue-on-error`.

**Secrets:** `SOURCE_REGISTRY_USER`, `SOURCE_REGISTRY_TOKEN`, `TARGET_REGISTRY_TOKEN`.

### Static Site Workflows (Forgejo-only)

The deploy-and-verify family for assets-only Cloudflare Workers sites (static Astro builds),
extracted from twente.dev and webgrip.nl, whose CI jobs were hand-synced copies of each other.
Same conditional rules as the hard-gate family above: gate from inside via inputs
(`environment`, `production-refs`, `enabled`), never with a caller `if:`. Forgejo-only —
consume from `.forgejo/workflows/`. Known ADR-0005 deviation, declared in each file header:
toolchains install at job time (lift-and-shift of the proven consumer jobs); the follow-up is
a `static-site-ci-runner` Harbor image in webgrip/infrastructure.

#### `cloudflare-deploy.yml`
Preview (`wrangler versions upload` + step summary + marker-idempotent PR comment) or
production (`wrangler deploy`, poll-the-edge, 200-assert of `smoke-paths`, and a status check
for **every** rule in the consumer's `public/_redirects` — a redirect cannot ship unguarded).
Pass `environment` as a literal; ref routing happens inside against `production-refs`.
`pnpm exec wrangler`, never `dlx` (the allowBuilds hang).

Release-driven deploys: call it from an `on: release: types: [published]` workflow, one call per
target, with `release-channel` set and `enabled` decided by a plain job that reads
`github.event.release.tag_name` on the runner (a flattened job's own `if` sees no release
context, so the reusable trusts `enabled` whenever `release-channel` is non-empty).
`wrangler-env` selects the `[env.<name>]` block in the consumer's wrangler.toml, so an rc can land
on a staging worker and hostname. Behind Cloudflare Access the anonymous edge answers 302, so
pass `edge-probe-expect: '302'`, leave `smoke-paths` and `not-found-path` empty and set
`check-redirects: false` for that target.

**Secrets:** `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit + Account:Read + zone Workers
Routes:Edit — the zone scope is the one people forget), `CLOUDFLARE_ACCOUNT_ID`.

**Example:**
```yaml
deploy-production:
  needs: [build, lighthouse, accessibility]
  uses: webgrip/workflows/.forgejo/workflows/cloudflare-deploy.yml@<tag>
  with:
    environment: production
    apex-url: 'https://twente.dev'
    edge-probe-path: /nl
    smoke-paths: |
      /nl
      /en
      /robots.txt
  secrets:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

release-channel:
  runs-on: docker
  outputs:
    channel: ${{ steps.parse.outputs.channel }}
  steps:
    - id: parse
      run: |
        tag='${{ github.event.release.tag_name }}'
        case "$tag" in *-*) echo "channel=prerelease" ;; *) echo "channel=stable" ;; esac >> "$GITHUB_OUTPUT"

deploy-staging:
  needs: [release-channel]
  uses: webgrip/workflows/.forgejo/workflows/cloudflare-deploy.yml@<tag>
  with:
    enabled: ${{ needs.release-channel.outputs.channel == 'prerelease' }}
    environment: production
    release-channel: prerelease
    wrangler-env: staging
    apex-url: 'https://staging.twente.dev'
    edge-probe-path: /nl
    edge-probe-expect: '302'
    check-redirects: false
  secrets:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

#### `lighthouse-budgets.yml`
Enforces the consumer's `lighthouserc.json` budgets in a Chrome-equipped sibling container
(`docker cp`, never bind mounts — they resolve on the host daemon and audit an empty
directory). `extra-cp` carries anything `startServerCommand` needs (e.g. `scripts`);
`lhci-version` keeps CI on the same scorer as `just lhci`.

#### `axe-scan.yml`
The real axe-core rule set over the built pages (Lighthouse's accessibility score is a
sampling heuristic; this catches the ARIA and focus-order defects it misses). Runs the
consumer's `scripts/axe-scan.ts` in a sibling container that holds only `dist/`, `scripts/` and
`lighthouserc.json`, so every package the script imports must be listed in `runtime-packages`
(default: `@axe-core/playwright`, `playwright-core`, `@webgrip/astro-site-toolkit`). Each is
installed at the version the consumer's package.json declares, so the container cannot drift
from local runs; names the consumer does not declare are skipped.

#### `dnscontrol.yml`
A site repository owns its zone: `ops/dns/dnsconfig.js` plus a `creds.json` that reads
`$CLOUDFLARE_API_TOKEN` / `$CLOUDFLARE_ACCOUNT_ID`. Three modes behind one input: `preview` on
every push and pull request, `push` on `push-refs` (default `main`) behind the caller's own switch
(`enabled: ${{ vars.DNS_PUSH == 'on' }}`), `drift` for a nightly run that fails on any correction.
A push that deletes a record is refused unless HEAD carries `DNS-Allow-Delete: <fqdn>` for it.
A push that would create a zone is refused: it means the token cannot see the zone, and applying
it would create a second copy of the zone instead of changing the live one.
dnscontrol is installed pinned and checksum-verified; the token needs Zone:Read and DNS:Edit on
the declared zones only. Account-level Cloudflare objects (Zero Trust, R2, tokens) stay in
`webgrip/cloudflare`.

**Example:**
```yaml
dns-preview:
  uses: webgrip/workflows/.forgejo/workflows/dnscontrol.yml@<tag>
  with:
    mode: preview
  secrets:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_DNS_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

dns-push:
  needs: [dns-preview]
  uses: webgrip/workflows/.forgejo/workflows/dnscontrol.yml@<tag>
  with:
    mode: push
    enabled: ${{ vars.DNS_PUSH == 'on' }}
  secrets:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_DNS_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

#### `link-check-static-site.yml`
Internal links blocking (with a vacuous-run guard and clean-URL `--fallback-extensions`),
external links best-effort, plus two opt-ins: `blocking-urls-command` prints critical URLs
that may never rot silently (print nothing while the URL is unconfigured — an honest
pre-launch state skips the check), and `dns-hosts-source` resolves data-file hosts on three
public resolvers (a single-resolver check misses SERVFAIL splits).

### Docker & Containerization

#### `docker-build-and-push.yml`
Builds and pushes Docker images with configurable options.

**Inputs:**
- `docker-context` - Build context directory
- `docker-file` - Dockerfile path
- `docker-tags` - Image tags
- `docker-target` (optional) - Multi-stage build target

**Secrets:**
- `DOCKER_USERNAME` - DockerHub username
- `DOCKER_TOKEN` - DockerHub token

**Example:**
```yaml
jobs:
  docker:
    uses: webgrip/workflows/.github/workflows/docker-build-and-push.yml@main
    with:
      docker-context: "."
      docker-file: "Dockerfile"
      docker-tags: "myapp:latest,myapp:${{ github.sha }}"
    secrets:
      DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
      DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}

#### `docker-build-and-push-ghcr.yml`
Builds and pushes Docker images to GitHub Container Registry (GHCR).

**Inputs:**
- `docker-context` - Build context directory
- `docker-file` - Dockerfile path
- `docker-tags` - Image tags
- `docker-target` (optional) - Multi-stage build target

**Secrets:**
- `GHCR_TOKEN` (optional) - Token with `packages:write` (defaults to `GITHUB_TOKEN`)

**Example:**
```yaml
jobs:
  docker:
    uses: webgrip/workflows/.github/workflows/docker-build-and-push-ghcr.yml@main
    with:
      docker-context: "."
      docker-file: "Dockerfile"
      docker-tags: |
        ghcr.io/${{ github.repository_owner }}/myapp:latest
        ghcr.io/${{ github.repository_owner }}/myapp:${{ github.sha }}
```
```

### Helm & Kubernetes

#### `helm-chart-deploy.yml`
Deploys Helm charts with detailed job summaries and secret management.

**Features:**
- SOPS encryption support
- DigitalOcean Kubernetes integration
- Environment-specific deployments
- Detailed deployment summaries

#### `helm-chart-push.yml` / `helm-charts-push.yml`
Packages and pushes Helm charts to registries.

**Inputs (Forgejo copy):** `registry`, `path`, `name`, `version`, plus optional `ref` (git ref to
check out — pass the tag for prefixed tag schemes like `chart-v1.2.3`; defaults to `version`),
`oci-path` (OCI repo under the registry; defaults to `<owner>/<repo>`) and `best-effort`
(non-fatal push, for mirrors). The Forgejo copy skips `setup-helm` when the runner image already
bakes helm (fallback install otherwise).

#### `helm-chart-validate.yml` / `helm-charts-validate.yml`
Validates Helm chart syntax and best practices. The Forgejo copy also renders the chart when
`run-template: true` (with `release-name`), and skips `setup-helm` when the runner image already
bakes helm (fallback install otherwise).

### Rust Development

#### `rust-tests.yml`
Runs Rust test suites with cargo.

#### `rust-static-analysis.yml`
Performs static analysis on Rust code using clippy and other tools.

#### `rust-semantic-release.yml`
Automated semantic releases for Rust projects.

### .NET Development

#### `dotnet-application-static-analysis.yml`
Standardized .NET static analysis for formatting, compiler analyzers, dependency vulnerabilities, and dependency drift.

#### `dotnet-application-tests.yml`
Reusable .NET test workflow with cached restore/build and uploaded TRX results.

### Java Development

#### `java-application-static-analysis.yml`
Reusable Java static analysis for Maven and Gradle projects with standardized quality and dependency checks.

#### `java-application-tests.yml`
Reusable Java test workflow for Maven and Gradle projects.

### JavaScript Development

#### `gha-javascript-lint.yml`
Lints JavaScript/TypeScript code using ESLint and other tools.

#### `gha-javascript-test.yml`
Runs JavaScript/TypeScript test suites.

#### `node-application-static-analysis.yml`
Reusable Node.js static analysis workflow with package-manager detection and standardized quality checks.

#### `node-application-tests.yml`
Reusable Node.js test workflow. Dependency stores persist per runner node (homelab ADR-0056), so there is no cache step to configure.

### Python Development

#### `python-application-static-analysis.yml`
Reusable Python static analysis workflow with formatting, linting, security, and dependency hygiene checks.

#### `python-application-tests.yml`
Reusable Python test workflow with `pytest` and `unittest` support.

### Go Development

#### `go-application-static-analysis.yml`
Reusable Go static analysis workflow with formatting, linting, vulnerability scanning, and module hygiene checks.

#### `go-application-tests.yml`
Reusable Go test workflow with coverage artifact upload.

### Documentation

#### `techdocs-generate.yml`
Generates documentation using MkDocs and TechDocs.

#### `techdocs-deploy-docs-site.yml` (Forgejo)
Builds the human site with Zensical, grafts Markdown and LLM indexes from the
`techdocs-site` artifact, runs Pagefind and gitleaks, then syncs to Garage with a
trash backup. Use a dedicated `bucket` and repo-scoped `TECHDOCS_S3_*` secrets.

Both documentation workflows accept `prepare-command` and `finalize-command`.
They run from the checkout root in the pinned builder image, with shell errors
fatal. Preparation runs before the build; finalization runs before artifact
upload or before Pagefind and the secret gate. Leave both empty for a normal
single-tree site. A monorepo can assemble sources during preparation and validate
its generated Markdown and indexes during finalization.

The deployment workflow's `site-dir` defaults to `site`, relative to `source-dir`.
Set it to the output directory in `mkdocs.yml` when using a custom layout. Both
workflows default `enabled` to `'true'`; every step checks that input because
Forgejo does not preserve caller job conditions when expanding reusable jobs.
Pass the branch and publication gate through `enabled`.

#### `techdocs-deploy-gh-pages.yml`
Deploys generated documentation to GitHub Pages.

#### `update_mkdocs.yml` / `update_techdocs.yml`
Updates documentation dependencies and configurations.

### Repository Management

#### `setup-repository-bootstrap.yml`
Bootstraps new repositories with standard configurations.

#### `setup-repository-copilot-files.yml`
Sets up GitHub Copilot configuration files.

#### `setup-repository-create-from-template.yml`
Creates new repositories from templates.

#### `sync-template-files.yml`
Synchronizes template files across repositories.

#### `determine-changed-directories.yml`
Detects changed directories for monorepo workflows.

### Release Management

#### `semantic-release.yml`
Automated semantic versioning and releases using conventional commits — one release train for the
whole repository. (For per-package trains in a monorepo, use `semantic-release-monorepo.yml`.)

**Features:**
- Conventional commit parsing, changelog generation, tag + release creation
- **Installs nothing.** The job runs in `harbor.webgrip.dev/webgrip/semantic-release`, which bakes
  in node, git, yq, semantic-release 25, `@webgrip/semantic-release-config` and the plugin set from
  a committed lockfile ([ADR 0005](docs/adrs/0005-semantic-release-toolchain-image.md); the image is
  built in `webgrip/infrastructure`). Release setup is ~0 instead of ~3m45s, and the same commit
  releases the same way next month.
- Resolves the repo's `.releaserc.cjs|js|json` (or `--extends` a `release-type` variant)
- Serialized per ref (`concurrency`, no cancel-in-progress) and realigned to the remote branch tip,
  so two runs cannot race for the same tag or die "behind remote" and silently release nothing.

**Inputs:**
- `release-type` (optional) - Type of release
- `use-bot-to-commit` - Use the CI bot for commits
- `toolchain-image` (default `harbor.webgrip.dev/webgrip/semantic-release:<version>`) - The image
  the release runs in, pinned to a released version and Renovate-watched. Override with an image
  built `FROM` it if your `prepareCmd` needs helm/php/docker
- `config-version` (default `1`) - Pin of `@webgrip/semantic-release-config`, for the no-image
  fallback only; inside the toolchain image the image tag *is* the version
- `dry-run` (default `false`) - `--dry-run`: no tags, releases, or commits
- `install-dependencies` (default `auto`) - Install the *consumer's* dependencies from its npm
  lockfile, then run its `build` script — the build only after a successful install. `auto` never
  fails the release: a missing or unsupported lockfile, a failed install and a failed build are each
  logged and skipped. `true` makes every one of those fatal; `false` skips the step. A Go/PHP/Rust
  repo that merely carries a `package.json` wants `auto` or `false`.
- `enabled`, `only-refs`, `skip-refs` - Gating from inside the reusable (Forgejo v15 evaluates a
  caller's `with:` at flatten time with an empty `github` context, so branch gating must happen here)
- `align-to-remote-tip` (default `true`)

**Outputs:**
- `version` - Bare semver of the release (empty if none)
- `tag` - Full git tag, e.g. `v1.2.3` — the checkout ref for tag-pinned follow-up jobs

**Output contract:** the resolved config must include an `@semantic-release/exec` `successCmd`
that writes `version=`/`tag=` to `$GITHUB_OUTPUT`; without it the outputs stay empty even when a
release is cut.

**WordPress packaging (optional):**
This workflow/composite action also supports `@semantic-release/wordpress` (https://github.com/semantic-release/wordpress) for packaging WordPress plugins/themes during `semantic-release`.

Minimal example `.releaserc.json` for a WordPress plugin that uploads the generated ZIP(s) to the GitHub Release:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/wordpress", {
      "type": "plugin",
      "slug": "my-plugin",
      "withAssets": true,
      "withReadme": true,
      "withVersionFile": true
    }],
    ["@semantic-release/github", {
      "assets": [
        {"path": "/tmp/wp-release/my-plugin.zip"},
        {"path": "/tmp/wp-release/assets.zip", "optional": true},
        {"path": "/tmp/wp-release/readme.txt", "optional": true},
        {"path": "/tmp/wp-release/version.txt", "optional": true}
      ]
    }]
  ]
}
```

#### `semantic-release-monorepo.yml` (Forgejo-only)
Per-package release train for monorepos: wraps the `semantic-release-monorepo` composite action
(checkout `fetch-depth: 0`, push permissions, version normalization). Commit analysis is scoped
to `package-path` by the [`semantic-release-monorepo`](https://github.com/pmowrer/semantic-release-monorepo)
plugin; config is resolved by cosmiconfig from the package dir upward (a package-local
`.releaserc.cjs` wins, else the repo root `.releaserc.js`). The consumer config **must** write
`version=`/`tag=` to `$GITHUB_OUTPUT` via an `@semantic-release/exec` `successCmd` for the
outputs to be populated. `@semantic-release/git` + `changelog` are pre-installed for configs
that commit release artifacts back (CHANGELOG.md, Chart.yaml, …). Like the single-package train it
**installs nothing**: the job runs in `harbor.webgrip.dev/webgrip/semantic-release-monorepo`,
which additionally bakes in `semantic-release-monorepo` — so the `monorepo` input is now a no-op,
kept only for caller compatibility. See
[ADR 0005](docs/adrs/0005-semantic-release-toolchain-image.md); the images themselves are built in
`webgrip/infrastructure` (`ops/docker/semantic-release/`).

**Inputs:** `package-path` (`.` for a root-scoped train), `package-name`, `dry-run`.
**Secrets:** `CI_TOKEN` (preferred; pass `secrets.WEBGRIP_CI_TOKEN`) or `FORGEJO_TOKEN`;
`NPM_TOKEN` for trains that publish npm packages to the Forgejo registry
(`makeConfig({ manifest: 'npm', npmPublish: true })` — the token needs `write:package`, so
pass `secrets.WEBGRIP_CI_TOKEN` there too). **Outputs:** `version` (bare semver, normalized),
`tag`. Every package train starts from a seeded `<package-name>-v0.0.0` at the root commit,
so a first `feat` releases **0.1.0**, not 1.0.0.

```yaml
jobs:
  release-chart:
    uses: webgrip/workflows/.forgejo/workflows/semantic-release-monorepo.yml@main
    with:
      package-path: deploy/charts/myapp
      package-name: myapp-chart
    secrets:
      FORGEJO_TOKEN: ${{ secrets.WEBGRIP_CI_TOKEN }}
```

#### `wordpress-plugin-release-distribute.yml`
Deploys a tagged release to the WordPress.org plugin repository (SVN).

**Inputs:**
- `version` - Released version (used to checkout `refs/tags/v<version>` by default)
- `tag-prefix` - Tag prefix (default: `v`)
- `plugin-slugs` - One or more plugin slugs (newline or comma separated)
- `generate-zip` - Generate ZIP artifact(s) (dry-run packaging)
- `upload-to-github-release` - Upload ZIP(s) to the GitHub Release tag (default: false)
- `release-tag` - Override the tag name used for uploading (defaults to `<tag-prefix><version>`)
- `deploy-to-wporg` - Deploy to WordPress.org SVN (default: true)

**Secrets:**
- `WPORG_SVN_USERNAME` (required when deploying)
- `WPORG_SVN_PASSWORD` (required when deploying)

#### `wordpress-plugin-release.yml`
Runs semantic-release and then deploys the release tag to the WordPress.org plugin repository (SVN). Optionally uploads generated ZIP(s) to the GitHub Release.

**Inputs:**
- `plugin-slugs` - One or more plugin slugs (newline or comma separated)
- `tag-prefix` - Tag prefix (default: `v`)
- `generate-zip` - Generate ZIP(s) and upload to the GitHub Release (default: true)
- `deploy-to-wporg` - Deploy to WordPress.org SVN (default: true)

**Secrets:**
- `WPORG_SVN_USERNAME` (required when deploying)
- `WPORG_SVN_PASSWORD` (required when deploying)

## 🔧 Composite Actions

### `docker-build-push`
Reusable composite action for building and pushing Docker images.

### `docker-build-push-ghcr`
Reusable composite action for building and pushing Docker images to GHCR.

### `semantic-release`
Composite action for semantic release automation with Node.js setup. The Forgejo copy skips
setup-node when node is baked into the runner image, and skips the npm install entirely when
the image prebakes the toolchain at `/opt/semrel` (env `SEMREL_PREBAKED`).

### `rust-semantic-release`
Specialized semantic release action for Rust projects.

## 💡 Usage Examples

### PHP Project CI/CD Pipeline

```yaml
name: PHP CI/CD
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  composer-install:
    uses: webgrip/workflows/.github/workflows/composer-install.yml@main
    secrets:
      COMPOSER_TOKEN: ${{ secrets.COMPOSER_TOKEN }}

  static-analysis:
    needs: composer-install
    uses: webgrip/workflows/.github/workflows/static-analysis.yml@main

  tests:
    needs: composer-install
    uses: webgrip/workflows/.github/workflows/tests.yml@main

  coverage:
    needs: composer-install
    uses: webgrip/workflows/.github/workflows/tests-coverage.yml@main

  docker-build:
    needs: [static-analysis, tests]
    if: github.ref == 'refs/heads/main' # GitHub only — on Forgejo a caller-level if: on a uses: job is DROPPED (see "Conditional (ref-gated) jobs on Forgejo")
    uses: webgrip/workflows/.github/workflows/docker-build-and-push.yml@main
    with:
      docker-context: "."
      docker-file: "Dockerfile"
      docker-tags: "myapp:latest,myapp:${{ github.sha }}"
    secrets:
      DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
      DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}

  semantic-release:
    needs: docker-build
    if: github.ref == 'refs/heads/main' # GitHub only — on Forgejo a caller-level if: on a uses: job is DROPPED (see "Conditional (ref-gated) jobs on Forgejo")
    uses: webgrip/workflows/.github/workflows/semantic-release.yml@main
    with:
      use-bot-to-commit: true
    secrets:
      WEBGRIP_CI_APP_ID: ${{ secrets.WEBGRIP_CI_APP_ID }}
      WEBGRIP_CI_APP_PRIVATE_KEY: ${{ secrets.WEBGRIP_CI_APP_PRIVATE_KEY }}
```

### Rust Project Workflow

```yaml
name: Rust CI
on: [push, pull_request]

jobs:
  test:
    uses: webgrip/workflows/.github/workflows/rust-tests.yml@main

  static-analysis:
    uses: webgrip/workflows/.github/workflows/rust-static-analysis.yml@main

  release:
    if: github.ref == 'refs/heads/main' # GitHub only — on Forgejo a caller-level if: on a uses: job is DROPPED (see "Conditional (ref-gated) jobs on Forgejo")
    needs: [test, static-analysis]
    uses: webgrip/workflows/.github/workflows/rust-semantic-release.yml@main
```

### Helm Chart Deployment

```yaml
name: Deploy to Production
on:
  push:
    branches: [ main ]

jobs:
  validate:
    uses: webgrip/workflows/.github/workflows/helm-chart-validate.yml@main

  deploy:
    needs: validate
    uses: webgrip/workflows/.github/workflows/helm-chart-deploy.yml@main
    with:
      environment: "production"
    secrets:
      DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
      DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}
      DIGITAL_OCEAN_API_KEY: ${{ secrets.DIGITAL_OCEAN_API_KEY }}
      SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
```

## ⚙️ Configuration

### Required Secrets

Different workflows require different secrets. Here's a comprehensive list:

#### Docker Workflows
- `DOCKER_USERNAME` - DockerHub username
- `DOCKER_TOKEN` - DockerHub access token

#### Composer/PHP Workflows
- `COMPOSER_TOKEN` - Private Packagist authentication token

#### Deployment Workflows
- `DIGITAL_OCEAN_API_KEY` - DigitalOcean API key for Kubernetes
- `SOPS_AGE_KEY` - Age private key for SOPS encryption

#### GitHub App Authentication
- `WEBGRIP_CI_APP_ID` - GitHub App ID (numeric)
- `WEBGRIP_CI_APP_PRIVATE_KEY` - GitHub App private key

### PHP Support

This repository includes specific support for:
- **PHP 8.2** - Primary supported version
- **Composer 2.8.5** - Dependency management
- **PHPUnit** - Testing framework
- **Static Analysis Tools** - PHPStan, PHPMD, PHPCS, Rector

### Runner Configuration

Workflows are configured to use `arc-runner-set` for consistent execution environments.

## 🤝 Contributing

We welcome contributions to improve these workflows! Please:

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing-workflow`)
3. **Commit** your changes (`git commit -m 'Add amazing workflow'`)
4. **Push** to the branch (`git push origin feature/amazing-workflow`)
5. **Open** a Pull Request

### Guidelines

- Follow existing naming conventions
- Include comprehensive documentation
- Test workflows in your own repository first
- Update this README with new workflows
- Use semantic commit messages

### Code Style

This repository uses EditorConfig for consistent formatting:
- **Charset**: UTF-8
- **Indentation**: 4 spaces (2 for YAML/JSON/Markdown)
- **Line Endings**: LF
- **Max Line Length**: 150 characters
- **Trim Trailing Whitespace**: Yes
- **Final Newline**: Yes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About WebGrip

WebGrip is committed to providing high-quality, reusable automation solutions for modern software development. These workflows are used in production across multiple projects and are continuously improved based on real-world usage.

---

**Need help?** Open an issue or check our [documentation](https://github.com/webgrip/workflows/issues) for more information.
