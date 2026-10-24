# ADR 0007 – A Release Pins Its Own Internal Refs to Its Tag

* **Status**: Proposed
* **Deciders**: Ryan Grippeling
* **Date**: 2026-10-24
* **Tags**: CI::ReusableWorkflows, Forgejo, SupplyChain, Release
* **Version**: 1.0.0

---

## Context and Problem Statement

The library's reusable workflows call each other and the library's composite actions, for example
`docker-build-and-push-harbor.yml` calls `docker-build-and-push-registry.yml`. On 2026-10-23
every one of those internal references was spelled `webgrip/workflows/<path>@main`: 28 in the
Forgejo library, 22 more in the frozen `.github/` tree. A consumer pinned to `@v2.8.2` therefore
ran v2.8.2's outer file and main's nested code, so a release was not a release, and a change on
main reached every pinned consumer without a tag.

Homelab ADR-0078 decision 10 says reusable workflows refer to their nested workflows at the same
tag, and decision 1 says a release is the tag alone, with no release commit on the branch.

## What Forgejo 15 can resolve

Read from Forgejo v15.0.9 `services/actions/reusable_workflows.go` and runner v12.10.2
`act/jobparser/jobparser.go`, the versions the estate runs:

| Reference                                   | Resolves against                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `uses: ./.forgejo/workflows/x.yml` (job)    | the repository and commit of the **run**, at every nesting depth. The local fetcher is bound once per run and passed unchanged into the expansion of every nested workflow. |
| `uses: ./path/to/action` (step)             | the **caller's** checked-out workspace                                           |
| `uses: webgrip/workflows/<path>@<ref>`      | this repository at `<ref>`                                                       |

A relative reference only works for this repository's own runs. For any consumer it names a file
in the consumer's repository. The reference has to stay absolute, and only its `@<ref>` can carry
the release.

## Decision Outcome

The release rewrites the refs; main keeps `@main`.

1. **Source form.** On main, every internal reference in a library file is
   `webgrip/workflows/<path>@main` (with or without the `https://forgejo.webgrip.dev/` prefix).
   `scripts/internal-refs.cjs check` fails on any other ref and on any caller-relative `./` use.
   The two self-CI workflows (`on_source_change.yml`, `on_docs_change.yml`) are not library files.
2. **Release form.** `scripts/release-pinned-tag.cjs` is the last semantic-release `prepare`
   plugin. It detaches HEAD, rewrites every internal `@main` to the new tag, checks that nothing
   else is left, and commits. semantic-release reads HEAD after `prepare`, so the tag points at
   that commit. Only the tag is pushed; main gains no commit.
3. **Version tracking.** semantic-release finds the last release with `git tag --merged main`,
   and a pinned tag commit is not on main. Loading `.releaserc.cjs` therefore grafts, in the
   release job's own clone only (`git replace --graft`, never pushed), every release-tag commit
   whose parents are on the branch onto the branch tip. The next release finds its last version
   and analyses only the commits after it.
4. **Gate.** The `internal-refs-policy` job in `on_source_change.yml` runs the check and its tests
   on every push to main and the release job needs it. The plugin's `verifyConditions` runs the
   same source check, so a dry run fails too.

### Considered Options

* **Relative refs.** Rejected: they resolve in the consumer's repository (table above).
* **Commit the pinned refs to main on release.** Rejected: main would then run a stale release of
  its own nested code, and ADR-0078 forbids release commits.
* **Move the tag after the release.** Rejected: it has the same tracking problem as the chosen
  option, and consumers and Renovate can resolve the first commit in the meantime.
* **Merge the pinned commit back into main with `-s ours`.** Rejected: it is a release commit on
  main, racing concurrent pushes.

### Consequences

* Good, because a pinned consumer runs one release end to end, and main still dogfoods `@main`.
* Good, because it works with today's `@semantic-release/git` changelog commit and with the
  tags-only shared config of ADR-0078: the pinned commit sits on top of whichever is the tip.
* Bad, because a release tag is not on main's first-parent history. `git log main` does not show
  the pin commit; `git log vX.Y.Z` does.
* Bad, because the graft is local magic at config load. If it is removed, semantic-release
  recomputes the previous version and the tag push fails.

## Validation

* `node --test scripts/internal-refs.test.cjs` covers: source passes; a simulated release of the
  real tree pins every ref; an `@main` ref added to a released tree fails and passes once removed;
  stale tag, sha and `@master` refs fail; caller-relative refs fail; the graft makes a pinned tag
  merged and ignores tags whose parent is not on the branch.
* semantic-release 25.0.9 was run twice against a local bare clone with both shared config 1.4.0
  (with `@semantic-release/git`) and the tags-only branch: the first run tagged a pinned commit
  off main, the second found it and cut the next patch. Without the graft the second run
  recomputed the already-tagged version.

---

### Revision Log

| Version | Date       | Author          | Change           |
| ------- | ---------- | --------------- | ---------------- |
| 1.0.0   | 2026-10-24 | Ryan Grippeling | Initial creation |
