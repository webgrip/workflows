# ADR 0005 – The semantic-release Toolchain Is an Image, Not an Install

* **Status**: Proposed
* **Deciders**: Ryan Grippeling
* **Date**: 2026-07-29
* **Tags**: CI::ReusableWorkflows, Forgejo, SupplyChain, Performance
* **Version**: 1.0.0

---

## Context and Problem Statement

Every release job in the estate builds its own toolchain at release time. `ploeg` run 122 is
representative: `npm install` resolved 413 packages in **2m**, a second install added 15 more in
21s, and only then did semantic-release start — roughly **3m45s of setup for ~25s of work**, on
every release, in every repo.

Worse than the time is what "resolve at release time" means for a release:

- **It is not reproducible.** No lockfile governs it. Two runs of the same commit, a week apart,
  can cut the release with different plugin versions. The thing that decides your version numbers
  is itself unversioned.
- **It re-resolves from the network on the critical path.** A registry outage, a yanked version,
  or a transitive dep that starts requiring a newer node is an outage of *releasing*, in every
  repo simultaneously.
- **The audit output is noise.** `11 vulnerabilities (6 moderate, 5 high)` prints on every green
  release, so nobody reads it, and a real finding would land in exactly the same place.
- **Nothing upgrades it deliberately.** Unpinned specs float; pinned ones (this repo now pins the
  fallback list) go stale silently because Renovate cannot see version numbers embedded in a bash
  heredoc inside an `action.yml`.

A partial answer already exists on the runner image: `SEMREL_PREBAKED` points at a prebaked
`node_modules`. It is undocumented, unversioned, built from no lockfile, and currently ships
semantic-release **24** while `@webgrip/semantic-release-config` pins **25** — so the composites
had to route *around* it for shared-config repos, and any repo that used it was silently running
its release against a different major than its config was written for.

The estate already has the right pattern in use elsewhere: `rust-semantic-release.yml` runs in
`harbor.webgrip.dev/webgrip/rust-releaser:1.2.0`, a versioned image with the toolchain baked in.

## Decision Drivers

| # | Driver (why this matters) |
| - | ------------------------- |
| 1 | A release must be reproducible: the same commit releases the same way next month |
| 2 | Release setup should be seconds, not minutes, and not on the network critical path |
| 3 | Toolchain upgrades must be a reviewed, revertable commit — not an implicit re-resolve |
| 4 | Security findings must arrive as a PR against one lockfile, not as noise in N release logs |
| 5 | A version skew between the toolchain and the shared config must be impossible, not routed around |

## Considered Options

1. **Install at release time** (today) — `npm install` in the consumer workspace on every run.
2. **Prebake into the ci-runner host image** (today's `SEMREL_PREBAKED`, formalized) — one
   `node_modules` on the runner, versioned with the runner image.
3. **A dedicated, versioned toolchain image** built from a committed `package.json` +
   `package-lock.json`, with Renovate owning the lockfile.

## Decision Outcome

### Chosen Option

**Option 3 — a dedicated toolchain image, with the install path kept as a fallback.**

`harbor.webgrip.dev/webgrip/semantic-release:<major>` (name/registry to be confirmed against the
image repo's conventions), built from:

```
package.json + package-lock.json   # npm ci --omit=dev — the release toolchain, locked
  semantic-release                 # the 25.x line
  @semantic-release/{changelog,commit-analyzer,exec,git,release-notes-generator}
  @saithodev/semantic-release-gitea
  @webgrip/semantic-release-config # the shared config itself
  semantic-release-monorepo, semantic-release-helm3, conventional-changelog-conventionalcommits
+ node 24, git, yq (checksum-verified), curl
```

The contract with the composites is deliberately the one that already exists:
**`SEMREL_PREBAKED` names a directory containing the installed `node_modules`** (so
`$SEMREL_PREBAKED/.bin/semantic-release` runs, and `NODE_PATH=$SEMREL_PREBAKED` makes a
consumer's `require('@webgrip/semantic-release-config')` resolve). Setting it in the image's `ENV`
is the whole integration — no composite change is needed to adopt it.

What changed in the composites to make that safe (this PR, ahead of the image):

- The prebake is **verified before use**: its `semantic-release` major must equal the line the
  action targets, and for a repo whose config requires it, `@webgrip/semantic-release-config` must
  be present in the prebake. A mismatch logs a notice and falls back to installing. The sr24/sr25
  skew that forced the previous work-around is now detected rather than avoided.
- `NODE_PATH` is exported alongside `PATH`, which is what a shared-config repo needs for the
  prebaked tree to be usable at all.
- The install fallback is fully pinned, so even the slow path is reproducible.

Renovate then owns the toolchain: it opens a PR against the image repo's `package-lock.json`, CI
builds and tags the image, and consumers pick it up by moving one image tag. A toolchain upgrade
becomes a diff someone approved.

### Positive Consequences

* Release setup drops from ~3m45s to ~0 — no resolve, no download, no audit wall.
* The toolchain that decides version numbers is itself a versioned, revertable artifact.
* Vulnerabilities surface once, as a Renovate PR on one lockfile, instead of as ignored warnings
  in every release log in the org.
* The registry is off the release critical path.

### Negative Consequences / Trade-offs

* A second artifact to build, tag, and keep current; a stale image is a stale toolchain, and
  unlike a floating install it will not fix itself.
* Consumers on an old image tag can diverge from the shared config's pin — mitigated by the
  major-line check, which now falls back to installing rather than releasing on a skew.
* The install fallback cannot be deleted: repos on inline configs and non-container runners
  still need it, so both paths must keep working.

### Risks & Mitigations

* **Image and shared config drift apart.** Mitigated by the version check above, and by the image
  bundling the shared config rather than resolving it at runtime.
* **The image becomes the only path and a bad tag blocks all releases.** Mitigated by keeping the
  install fallback and by the check failing *open* (fall back and install) rather than closed.
* **Renovate bumps a version whose checksum is recorded elsewhere** (yq): recorded checksums are
  matched per version and an unrecorded version *warns* rather than fails, so an automated bump
  cannot break every consumer's release.

## Validation

* **Immediate proof** — a release job on a runner exporting `SEMREL_PREBAKED` logs
  `Using prebaked toolchain at … (semantic-release 25.x)` and performs no `npm install`; the same
  job on a runner with the sr24 prebake logs the skew notice and installs instead.
* **Ongoing guardrails** — release job wall-clock (setup should stay under ~30s once the image
  lands); a Renovate PR against the image lockfile is the only way the toolchain moves.

## Compliance, Security & Privacy Impact

Net positive: the release toolchain becomes a scannable, pinned artifact instead of a nightly
re-resolve of ~430 packages fetched onto a runner that holds a release token. No data
classification change. Registry credentials for the shared config move to a run-scoped npmrc in
this PR, so a release token no longer persists in `$HOME/.npmrc` on a shared runner.

## Notes

* **Related Decisions**: ADR 0002 (two-tree layout — the image serves the `.forgejo` tree; the
  frozen `.github` tree keeps installing), ADR 0004 (`CI_TOKEN` identity used by these jobs).
* **Follow-ups / TODOs**:
  1. Create the image (repo TBD — `webgrip/infrastructure` alongside `rust-releaser`, or this
     repo under `ops/docker/semantic-release/`), with `ENV SEMREL_PREBAKED=/opt/semrel/node_modules`.
  2. Add `container:` support to the release reusables so a consumer can opt in by tag.
  3. Retire the unversioned `SEMREL_PREBAKED` bake on the ci-runner host image once consumers move.

---

### Revision Log

| Version | Date       | Author          | Change           |
| ------- | ---------- | --------------- | ---------------- |
| 1.0.0   | 2026-07-29 | Ryan Grippeling | Initial creation |
