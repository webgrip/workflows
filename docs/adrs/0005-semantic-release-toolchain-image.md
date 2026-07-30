# ADR 0005 – The semantic-release Toolchain Is an Image, Not an Install

* **Status**: Accepted
* **Deciders**: Ryan Grippeling
* **Date**: 2026-07-29
* **Tags**: CI::ReusableWorkflows, Forgejo, SupplyChain, Performance
* **Version**: 1.0.0

---

## Context and Problem Statement

Every release job in the estate built its own toolchain at release time. `ploeg` run 122 is
representative: `npm install` resolved 413 packages in **2m**, a second install added 15 more in
21s, and only then did semantic-release start — roughly **3m45s of setup for ~25s of work**, on
every release, in every repo.

Worse than the time is what "resolve at release time" means for a release:

- **It is not reproducible.** No lockfile governed it. Two runs of the same commit, a week apart,
  could cut the release with different plugin versions. The thing that decides your version
  numbers was itself unversioned.
- **It re-resolved from the network on the critical path.** A registry outage, a yanked version, or
  a transitive dep that starts requiring a newer node is an outage of *releasing*, everywhere, at
  once.
- **The audit output was noise.** `11 vulnerabilities (6 moderate, 5 high)` printed on every green
  release, so nobody read it, and a real finding would land in exactly the same place.
- **Nothing upgraded it deliberately.** Unpinned specs floated; pinned ones went stale silently,
  because Renovate cannot see a version embedded in a bash heredoc inside an `action.yml`.

A partial answer already existed on the runner image: `SEMREL_PREBAKED` pointed at a prebaked
`node_modules`. It was undocumented, unversioned, built from no lockfile, and shipped
semantic-release **24** while `@webgrip/semantic-release-config` pins **25** — so the composites
routed *around* it for shared-config repos, and any repo that did use it was releasing against a
different major than its config was written for. It also exported `PATH` but not `NODE_PATH`, so a
consumer's bare `require('@webgrip/semantic-release-config')` could not have resolved against it
anyway: the fast path could not work as written.

The estate already had the right pattern in use: `rust-semantic-release.yml` runs in
`harbor.webgrip.dev/webgrip/rust-releaser:1.2.0`, a versioned image with its toolchain baked in.

## Decision Drivers

| # | Driver (why this matters) |
| - | ------------------------- |
| 1 | A release must be reproducible: the same commit releases the same way next month |
| 2 | Release setup should be seconds, not minutes, and not on the network critical path |
| 3 | Toolchain upgrades must be a reviewed, revertable commit — not an implicit re-resolve |
| 4 | Security findings must arrive as a PR against one lockfile, not as noise in N release logs |
| 5 | A version skew between the toolchain and the shared config must be impossible, not routed around |
| 6 | The composite actions should hold release semantics only, not dependency management |

## Considered Options

1. **Install at release time** (the status quo) — `npm install` in the consumer workspace, every run.
2. **Prebake into the ci-runner host image** (`SEMREL_PREBAKED`, formalized) — one `node_modules`
   on the runner, versioned with the runner image.
3. **Dedicated, versioned toolchain images** built from committed lockfiles, Renovate-owned, with
   the release job running *inside* them.

## Decision Outcome

### Chosen Option

**Option 3.** Three images, built from one Dockerfile in **`webgrip/infrastructure`** (alongside
`rust-releaser`, which is the same pattern), all sharing every layer except their own
`node_modules`:

| Image | Adds | Used by |
| ----- | ---- | ------- |
| `harbor.webgrip.dev/webgrip/semantic-release` | semantic-release 25, `@webgrip/semantic-release-config`, the plugin set, `semantic-release-helm3`, node 24, git, yq | `semantic-release.yml` |
| `…/semantic-release-monorepo` | + `semantic-release-monorepo` | `semantic-release-monorepo.yml` |
| `…/semantic-release-rust` | + cargo (rustup), `semantic-release-cargo` | `rust-semantic-release` composite |

Option 2 was rejected as the *primary* mechanism because it couples the toolchain's lifecycle to
the runner image's: bumping a plugin means rebuilding and rolling the runner fleet, and a runner
pool that is heterogeneous by design (it already is — that is why the node check existed) gives
different repos different toolchains. It survives as the *contract*, which is the useful half.

**The images are built in `webgrip/infrastructure`, not here.** Building them in this repo was the
first attempt and it was wrong: this repo's release jobs would then run in an image whose build is
orchestrated by this repo's own reusable workflows. That circle has no good answer to "which came
first" — a broken toolchain image cannot be fixed by a pipeline that needs the toolchain image, and
a reader tracing why a release failed ends up back where they started. Images are artifacts;
`webgrip/infrastructure` is where the estate's artifacts are built (`rust-releaser` already lives
there), and it consumes this library the same way every other repo does. This repo keeps only the
*contract* — `SEMREL_PREBAKED` — and the composites that read it.

**The contract is `SEMREL_PREBAKED`**: an installed `node_modules` directory, with `PATH` and
`NODE_PATH` pointing into it. The images set it in `ENV`; the composites read it and run. Nothing
else is negotiated at release time. Rejecting Option 2 as a mechanism did not mean discarding its
interface — a runner image that prebakes a *correct* toolchain still works unchanged.

Tags follow `webgrip/infrastructure`'s existing per-image release train: a conventional commit under
`ops/docker/<image>/` cuts `<image>-v<version>`, and the release event builds and pushes
`webgrip/<image>:<version>` (plus `:latest` for a final release). The reusable workflows here pin an
exact version in the `toolchain-image` input default, watched by a Renovate annotation — the same
way `techdocs-runner` pins `techdocs-builder`. So a toolchain upgrade is two reviewed commits (the
lockfile there, the pin here) and never something that moves under a repo's feet.

A semantic-release **major** bump additionally has to change each image's build-time assertion,
which is what stops one arriving silently.

### Positive Consequences

* Release setup drops from ~3m45s to ~0: no resolve, no download, no audit wall, no yq fetch.
* The toolchain that decides version numbers is a versioned, revertable, scannable artifact.
* Vulnerabilities surface once, as a Renovate PR against three lockfiles, instead of as ignored
  warnings in every release log in the org.
* The registry is off the release critical path.
* The composite actions lose ~60% of their length and everything they still contain is release
  semantics: checkout, branch-tip alignment, baseline seed, credentials, `--repository-url`, the
  run, the summary.
* Consumers needing extra tooling (helm, php, docker CLI) build FROM these images and pass
  `toolchain-image`, which puts environment needs in an image instead of in ad-hoc job steps.

### Negative Consequences / Trade-offs

* Three artifacts to build, tag and keep current; a stale image is a stale toolchain and, unlike a
  floating install, will not fix itself.
* The release job now runs in a container, so anything a repo's `prepareCmd` shells out to must
  exist in that image. This is the real migration risk, and the escape hatch is `toolchain-image`.
* The install fallback cannot be deleted outright: a job run outside the image still has to
  release. It stays, warns loudly, and is explicitly unlocked.
* The toolchain and the composites that depend on it now live in **two repositories**, so a change
  to the contract spans two PRs and has an ordering requirement (publish, then point at it). That
  is the price of not having a circular dependency, and it is the cheaper of the two.

### Risks & Mitigations

* **A repo's release breaks because its `prepareCmd` needs a tool the image lacks.** Mitigated by
  `toolchain-image` (build FROM ours), and by rolling this out on `ploeg` first.
* **The image is missing when a consumer upgrades.** The build workflow must run and publish before
  the composites' new defaults merge; the container pull fails loudly rather than silently
  releasing with the wrong toolchain.
* **Renovate bumps semantic-release to a major the composites do not target.** The Dockerfile
  asserts the major at build time, so the PR fails in CI instead of shipping a skew.
* **Harbor is unreachable from a runner.** Same exposure as `rust-releaser` today, which the estate
  already accepts; the images are also pullable by digest for disaster recovery.

## Validation

* **Immediate proof** — all three images build and were smoke-tested locally: `semantic-release`
  25.0.8 resolvable, `require('@webgrip/semantic-release-config')` resolving from an arbitrary cwd
  (i.e. `NODE_PATH` works), `yq` 4.44.3, `git`, and for the rust image `cargo` +
  `semantic-release-cargo`. The Dockerfile re-asserts each of these at build time, so a lockfile
  bump that breaks the contract fails the build rather than a release.
* **Ongoing guardrails** — release job wall-clock (setup should stay under ~30s); the build-time
  major assertion; Renovate PRs against the lockfiles in `webgrip/infrastructure` as the only way
  the toolchain moves.

## Compliance, Security & Privacy Impact

Net positive: the release toolchain becomes a scannable, pinned artifact instead of a re-resolve of
~430 packages fetched onto a runner that holds a release token. The `@webgrip` scope is read
anonymously (the registry allows it), so no npm credential is written to a runner's `$HOME` at all
in the image path — the previous flow wrote a release token into `~/.npmrc` on a pool where `HOME`
outlives the job. No data classification change.

## Notes

* **Related Decisions**: ADR 0002 (two-tree layout — the images serve the `.forgejo` tree; the
  frozen `.github` tree keeps installing), ADR 0004 (`CI_TOKEN` identity used by these jobs).
* **Where the images are built**: `webgrip/infrastructure` — `ops/docker/semantic-release/`
  (one Dockerfile, three targets, three committed lockfiles, Renovate-owned).
* **Follow-ups / TODOs**:
  1. Publish the images from `webgrip/infrastructure` **before** merging the composite defaults
     here; the reusables default to them, so a missing image fails at the container pull.
  2. Roll out on `ploeg` first, then the chart trains.
  3. Retire the unversioned `SEMREL_PREBAKED` bake on the ci-runner host image once consumers move.
  4. `rust-semantic-release.yml` (the workflow, not the composite) still builds with hardcoded
     `mybin` targets and calls `npx semantic-release` directly; it needs a real consumer before it
     can be pointed at the rust image.

---

### Revision Log

| Version | Date       | Author          | Change           |
| ------- | ---------- | --------------- | ---------------- |
| 1.0.0   | 2026-07-29 | Ryan Grippeling | Initial creation |
