'use strict';

// Tag-only releases: `manifest` is deliberately omitted. This repo is a library of
// reusable Forgejo Actions workflows — there is no Chart.yaml, package.json or any
// other version-bearing manifest to bump, and @webgrip/semantic-release-config
// supports exactly this ("omit for tag-only releases"). semantic-release therefore
// computes the version, writes CHANGELOG.md, tags, and creates the Forgejo release.
//
// floatingMajorTag is NOT enabled. A moving `v1` would be friendlier for consumers
// (`@v1` picks up minors automatically) but reintroduces the mutable ref this repo's
// first tagging was meant to remove — consumers pin immutable `@vX.Y.Z` + Renovate.
// Flip it on only as a deliberate, separate decision.
const { makeConfig } = require('@webgrip/semantic-release-config');

module.exports = makeConfig();
