## [2.7.5](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.7.4...v2.7.5) (2026-09-27)

### Fixed

* **semantic-release:** auto bouwt alleen na een geslaagde install en breekt de release nooit ([a9575b6](https://forgejo.webgrip.dev/webgrip/workflows/commit/a9575b6fe1e077984e64dffb82318a045cfeb74c))

### Internal

* **renovate:** deze repo draait nu ook op het org-preset ([5a2e19a](https://forgejo.webgrip.dev/webgrip/workflows/commit/5a2e19a10855ff796bdc85e078bca40c9a70ba1c))

## [2.7.4](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.7.3...v2.7.4) (2026-09-18)

### Fixed

* **ci:** de generator blokkeert checkout@v6 niet meer, want de aanname is weerlegd ([8f3fb38](https://forgejo.webgrip.dev/webgrip/workflows/commit/8f3fb38bea3c30668c7fbb1fa4f86cdc54683f5d))
* **ci:** ook de parity-check blokkeerde checkout@v6 niet meer terecht ([b1342ab](https://forgejo.webgrip.dev/webgrip/workflows/commit/b1342ab7d2dc07427f98d484ee6f303514fc5977))

## [2.7.3](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.7.2...v2.7.3) (2026-09-18)

### Performance

* **ci:** de actions staan op hun SHA, want een tag kost een volledige fetch ([7884381](https://forgejo.webgrip.dev/webgrip/workflows/commit/78843812ed98ef74b2e865432d13be37cb4cfb92))

## [2.7.2](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.7.1...v2.7.2) (2026-09-17)

### Fixed

* **semrel:** toolchain-image default naar 0.3.4 ([4e186d4](https://forgejo.webgrip.dev/webgrip/workflows/commit/4e186d4ab6e2e782d5ab922d88a98ce3fe94526e))

## [2.7.1](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.7.0...v2.7.1) (2026-09-12)

### Fixed

* **docs:** run hooks with the builder image shell ([18a46e4](https://forgejo.webgrip.dev/webgrip/workflows/commit/18a46e4bcda37c0e0386d4786082e97f980e7a27))

## [2.7.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.6.2...v2.7.0) (2026-09-12)

### Added

* **docs:** support assembled sites and guarded publication ([9cddb48](https://forgejo.webgrip.dev/webgrip/workflows/commit/9cddb48e84b33c817dbb79d9a2d51765a0bb1935))

## [2.6.2](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.6.1...v2.6.2) (2026-09-10)

### Fixed

* **distribute:** use the runner's cosign instead of reinstalling it per mirror ([380d404](https://forgejo.webgrip.dev/webgrip/workflows/commit/380d404701843a393c49b6d27d818d15240d4a77))

## [2.6.1](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.6.0...v2.6.1) (2026-09-06)

### Fixed

* **dnscontrol:** de preview-stap brak op de runner-shell voordat dnscontrol draaide ([d6d1ac4](https://forgejo.webgrip.dev/webgrip/workflows/commit/d6d1ac4e9d2920951779fb9bbcdcde25d64ab25f))

## [2.6.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.5.3...v2.6.0) (2026-09-05)

### Added

* **dnscontrol:** herbruikbare zone-lane, een site-repo bezit zijn eigen records ([2a5d82e](https://forgejo.webgrip.dev/webgrip/workflows/commit/2a5d82e28fbc4226ff620c0d52a774e292e4ba29))

## [2.5.3](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.5.2...v2.5.3) (2026-09-05)

### Fixed

* **node:** de cache-stap gaat eruit, de runner bewaart de stores per node ([fb0a4eb](https://forgejo.webgrip.dev/webgrip/workflows/commit/fb0a4ebb9faf8fa958af988e6416c9635194cc0a))

## [2.5.2](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.5.1...v2.5.2) (2026-09-05)

### Fixed

* **cloudflare-deploy:** release-channel vertrouwt enabled van de caller, niet de github-context ([9d3da2a](https://forgejo.webgrip.dev/webgrip/workflows/commit/9d3da2af26bda748e13a85ab53fcc3c3ade4744d))

## [2.5.1](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.5.0...v2.5.1) (2026-09-05)

### Fixed

* **semantic-release:** auto-modus laat een mislukte consumer-build de release niet meer breken ([bdeeed8](https://forgejo.webgrip.dev/webgrip/workflows/commit/bdeeed8a3d436eaab21823fa0ac5e68f7f471432))

## [2.5.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.4.1...v2.5.0) (2026-09-05)

### Added

* **cloudflare-deploy:** release-driven deploys with a wrangler environment per channel ([9033cec](https://forgejo.webgrip.dev/webgrip/workflows/commit/9033cec962bc569006d2c4b3ccc30e9a783c55ba))

### Docs

* **adr:** 0006 points to its new home in ai-skills; catalog-info for Backstage ([0c294cc](https://forgejo.webgrip.dev/webgrip/workflows/commit/0c294cc1512c491a1d00fa091a77937700c8cf7c))

## [2.4.1](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.4.0...v2.4.1) (2026-09-05)

### Fixed

* **axe-scan:** install every package the scan script imports, not just the two axe ones ([a3e0e8d](https://forgejo.webgrip.dev/webgrip/workflows/commit/a3e0e8dff4199f592b7596e411f564bcaab67665))

## [2.4.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.3.1...v2.4.0) (2026-09-04)

### Added

* **node-tests:** job-name input labels each call in the caller pipeline ([ef2b7a6](https://forgejo.webgrip.dev/webgrip/workflows/commit/ef2b7a61a56c57efc41a4738009c793d200b20c2))

## [2.3.1](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.3.0...v2.3.1) (2026-09-04)

### Fixed

* **sync:** de sync-lijst duwde de self-CI van deze repo naar elke consumer ([21e45c9](https://forgejo.webgrip.dev/webgrip/workflows/commit/21e45c9d14127786ce8bba2da64253dd1cb9da03))

### Docs

* **adr-0006:** geen commentaar in code, estate-breed ([cc6d2a5](https://forgejo.webgrip.dev/webgrip/workflows/commit/cc6d2a5598fa91286f68bb79866cbcc83fe7eb40))
* **agents:** AGENTS.md for the two-tree contract and the release traps ([58cebfc](https://forgejo.webgrip.dev/webgrip/workflows/commit/58cebfc21f6903d3637efcc8eae703c047d3b109))

## [2.3.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.2.0...v2.3.0) (2026-09-04)

### Added

* **static-sites:** lanes op de gebakken static-site-ci-runner-image ([7947036](https://forgejo.webgrip.dev/webgrip/workflows/commit/79470364c0e4e921e1c3b038b538d4998a3dbb54)), closes [#60](https://forgejo.webgrip.dev/webgrip/workflows/issues/60)

## [2.2.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.1.0...v2.2.0) (2026-09-04)

### Added

* **semrel:** npm publish through the monorepo release train ([bb2bbbf](https://forgejo.webgrip.dev/webgrip/workflows/commit/bb2bbbf4639a7af9323fbcaca5a546a5d18fc0ef))

## [2.1.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v2.0.0...v2.1.0) (2026-09-04)

### Added

* **static-sites:** 404 probe in the production smoke test ([7220db0](https://forgejo.webgrip.dev/webgrip/workflows/commit/7220db0acd93e1e76a67ef4d2457edcda5d9b9d8))
* **static-sites:** reusable deploy + quality gates for Cloudflare static sites ([7ad8337](https://forgejo.webgrip.dev/webgrip/workflows/commit/7ad8337a44b53c2e36c20952151886fbe24c26e7))

### Fixed

* **parity:** bring FORGEJO_ONLY up to date so the check can run green ([f295782](https://forgejo.webgrip.dev/webgrip/workflows/commit/f2957825301caa2f01d373ab2896ca89d3cefa11))

### CI

* **release:** toolchain images 0.3.3 — complete override set baked (publish-path got 11) ([e7a5189](https://forgejo.webgrip.dev/webgrip/workflows/commit/e7a51892a45bcc8215bda4582d6bdb050557b25f))

## [2.0.0](https://forgejo.webgrip.dev/webgrip/workflows/compare/v1.11.3...v2.0.0) (2026-08-28)

### ⚠ BREAKING CHANGES

* **semrel:** the semantic-release, semantic-release-monorepo and
  rust-semantic-release composites no longer install a toolchain when
  SEMREL_PREBAKED is missing or unusable — the job fails with instructions.
  Release jobs must run in the matching toolchain image (container: image:
  harbor.webgrip.dev/webgrip/semantic-release[-monorepo|-rust]:<tag>) or on a
  ci-runner that bakes the toolchain. The config-version input is removed from
  the composites and the reusable workflows; it only ever fed the fallback.

### Fixed

* **semrel:** the toolchain is the image — composites install nothing at runtime ([f78d7a2](https://forgejo.webgrip.dev/webgrip/workflows/commit/f78d7a2e5fc40d0d41e79d9e17633571e0bd8aeb)), references [#131](https://forgejo.webgrip.dev/webgrip/workflows/issues/131) [#10](https://forgejo.webgrip.dev/webgrip/workflows/issues/10)

### CI

* **release:** self-release in the toolchain image; reusable defaults to the bash-fixed images ([e74fced](https://forgejo.webgrip.dev/webgrip/workflows/commit/e74fcede021fbf6c58b6cbae026d990254093dd7)), references [#132](https://forgejo.webgrip.dev/webgrip/workflows/issues/132)
* **release:** self-release with the current composite, not the v1.0.0 relic ([af75cbf](https://forgejo.webgrip.dev/webgrip/workflows/commit/af75cbf592f87cfe590a4cc8728ecb4beadb42f8))

## <small>1.11.3 (2026-08-26)</small>

* Merge pull request 'fix(forgejo-distribute): mirror cosign's accessories, not just the image' (#56)  ([6e42c28](https://forgejo.webgrip.dev/webgrip/workflows/commit/6e42c28)), closes [#56](https://forgejo.webgrip.dev/webgrip/workflows/issues/56)
* fix(forgejo-distribute): mirror cosign's accessories, not just the image ([79b1204](https://forgejo.webgrip.dev/webgrip/workflows/commit/79b1204))

## <small>1.11.2 (2026-08-26)</small>

* Merge pull request 'fix(cosign): prefer preinstalled cosign and syft over downloading them' (#55) fr ([7bdad7e](https://forgejo.webgrip.dev/webgrip/workflows/commit/7bdad7e)), closes [#55](https://forgejo.webgrip.dev/webgrip/workflows/issues/55)
* fix(cosign): prefer preinstalled cosign and syft over downloading them ([1102722](https://forgejo.webgrip.dev/webgrip/workflows/commit/1102722))

## <small>1.11.1 (2026-08-26)</small>

* Merge pull request 'fix(github): reference cosign-installer by absolute URL' (#54) from fix/cosign-i ([d7c2a6a](https://forgejo.webgrip.dev/webgrip/workflows/commit/d7c2a6a)), closes [#54](https://forgejo.webgrip.dev/webgrip/workflows/issues/54)
* fix(github): reference cosign-installer by absolute URL ([d546935](https://forgejo.webgrip.dev/webgrip/workflows/commit/d546935))

## 1.11.0 (2026-08-26)

* Merge pull request 'feat(oci): index annotations and cosign accessory mirroring' (#53) from feat/oci ([7ddac0f](https://forgejo.webgrip.dev/webgrip/workflows/commit/7ddac0f)), closes [#53](https://forgejo.webgrip.dev/webgrip/workflows/issues/53)
* feat(oci): index annotations and cosign accessory mirroring ([c1dc50d](https://forgejo.webgrip.dev/webgrip/workflows/commit/c1dc50d))

## 1.10.0 (2026-08-25)

* Merge pull request 'feat(github): publish the Helm chart to GHCR; skip immutable re-pushes' (#52) fr ([54de5ed](https://forgejo.webgrip.dev/webgrip/workflows/commit/54de5ed)), closes [#52](https://forgejo.webgrip.dev/webgrip/workflows/issues/52)
* feat(github): publish the OCI Helm chart to GHCR ([ac958e9](https://forgejo.webgrip.dev/webgrip/workflows/commit/ac958e9))
* fix(helm): skip the push when the chart version is already published ([0ccd348](https://forgejo.webgrip.dev/webgrip/workflows/commit/0ccd348))

## <small>1.9.2 (2026-08-25)</small>

* Merge pull request 'fix(github): create the release over the REST API; drop GitHub-only annotations' ([173b598](https://forgejo.webgrip.dev/webgrip/workflows/commit/173b598)), closes [#51](https://forgejo.webgrip.dev/webgrip/workflows/issues/51)
* fix(github): create the release over the REST API, not the gh CLI ([0f2c5a5](https://forgejo.webgrip.dev/webgrip/workflows/commit/0f2c5a5))
* chore(forgejo): drop GitHub-only annotation commands from the .forgejo tree ([a5c5b5f](https://forgejo.webgrip.dev/webgrip/workflows/commit/a5c5b5f))

## <small>1.9.1 (2026-08-25)</small>

* Merge pull request 'fix(github): fail fast on a dead GH_TOKEN instead of hanging the mirror' (#50) f ([14b5825](https://forgejo.webgrip.dev/webgrip/workflows/commit/14b5825)), closes [#50](https://forgejo.webgrip.dev/webgrip/workflows/issues/50)
* fix(github): fail fast on a dead GH_TOKEN instead of hanging the mirror ([2e2d49e](https://forgejo.webgrip.dev/webgrip/workflows/commit/2e2d49e))

## 1.9.0 (2026-08-24)

* Merge pull request 'feat(github): github-distribute reusable — repo mirror, GitHub Release, GHCR dig ([a1b8b76](https://forgejo.webgrip.dev/webgrip/workflows/commit/a1b8b76)), closes [#48](https://forgejo.webgrip.dev/webgrip/workflows/issues/48)
* feat(github): github-distribute reusable — repo mirror, GitHub Release, GHCR digest-copy ([773726f](https://forgejo.webgrip.dev/webgrip/workflows/commit/773726f))

## 1.8.0 (2026-08-12)

* feat(docs): publish to own docs-workflows bucket (estate #2) ([1d40681](https://forgejo.webgrip.dev/webgrip/workflows/commit/1d40681)), closes [#2](https://forgejo.webgrip.dev/webgrip/workflows/issues/2)

## 1.7.0 (2026-08-12)

* feat(docs): flip strict link validation on — links verified clean (estate item #17) ([b3705fc](https://forgejo.webgrip.dev/webgrip/workflows/commit/b3705fc)), closes [#17](https://forgejo.webgrip.dev/webgrip/workflows/issues/17)
* chore(docs): bump reusables — backup-dir trash-net + pagefind estate-search index (estate items 1+4) ([f2e235e](https://forgejo.webgrip.dev/webgrip/workflows/commit/f2e235e))

## 1.6.0 (2026-08-11)

* feat(techdocs): estate items #1/#4/#12 plumbing — trash-net backup-dir, pagefind index pass, builder ([abf3c95](https://forgejo.webgrip.dev/webgrip/workflows/commit/abf3c95)), closes [4/#12](https://forgejo.webgrip.dev/webgrip/workflows/issues/12)

## <small>1.5.1 (2026-08-11)</small>

* fix(techdocs): root sync must not delete foreign prefixes — it wiped the whole estate ([fd6771a](https://forgejo.webgrip.dev/webgrip/workflows/commit/fd6771a))
* chore(docs): retire GitHub-side techdocs workflows — Forgejo publishes to docs.webgrip.dev (ADR-0052 ([0f9bf25](https://forgejo.webgrip.dev/webgrip/workflows/commit/0f9bf25))

## 1.5.0 (2026-08-11)

* feat(docs): publish to docs.webgrip.dev/workflows/ — estate rollout (ADR-0052) ([4569314](https://forgejo.webgrip.dev/webgrip/workflows/commit/4569314))

## <small>1.4.2 (2026-08-11)</small>

* fix(techdocs): redirect stubs must stay inside dest-prefix — absolute targets escaped to the domain  ([77bd6c0](https://forgejo.webgrip.dev/webgrip/workflows/commit/77bd6c0))

## <small>1.4.1 (2026-08-11)</small>

* fix(techdocs): tag-tolerant yaml loader in the graft step — !!python/name broke onboarding ([d531c75](https://forgejo.webgrip.dev/webgrip/workflows/commit/d531c75))

## 1.4.0 (2026-08-11)

* feat(techdocs): docs-site deploy reusable — Zensical build + llms/redirect graft + rclone to Garage  ([5a7edb1](https://forgejo.webgrip.dev/webgrip/workflows/commit/5a7edb1))
* feat(techdocs): estate rollout plumbing — dest-prefix, strict, gitleaks gate; builder 1.5.0 everywhe ([c7a05bc](https://forgejo.webgrip.dev/webgrip/workflows/commit/c7a05bc))

## <small>1.3.1 (2026-08-09)</small>

* fix(techdocs): pin first-party Harbor techdocs-builder:1.3.0 — ghcr fan-out froze again ([62c5c36](https://forgejo.webgrip.dev/webgrip/workflows/commit/62c5c36))

## 1.3.0 (2026-08-09)

* feat(techdocs): add Backstage/Garage-S3 deploy reusable (homelab ADR-0039) ([7495a4f](https://forgejo.webgrip.dev/webgrip/workflows/commit/7495a4f))

## <small>1.2.1 (2026-08-09)</small>

* Merge pull request 'fix(semrel): a release dropped to the behind-remote race must not exit green' (# ([6ce6e3e](https://forgejo.webgrip.dev/webgrip/workflows/commit/6ce6e3e)), closes [#45](https://forgejo.webgrip.dev/webgrip/workflows/issues/45)
* fix(semrel): a release dropped to the behind-remote race must not exit green ([5728850](https://forgejo.webgrip.dev/webgrip/workflows/commit/5728850))

## 1.2.0 (2026-08-09)

* Merge pull request 'fix/semrel-parity-and-hardening' (#40) from fix/semrel-parity-and-hardening into ([b40b790](https://forgejo.webgrip.dev/webgrip/workflows/commit/b40b790)), closes [#40](https://forgejo.webgrip.dev/webgrip/workflows/issues/40)
* fix(semrel): base toolchain-image is 0.1.1 — 0.1.0 was released but never pushed ([811083c](https://forgejo.webgrip.dev/webgrip/workflows/commit/811083c))
* fix(semrel): bring the single-package train up to the monorepo composite's line ([ee28bad](https://forgejo.webgrip.dev/webgrip/workflows/commit/ee28bad))
* fix(semrel): pin the base toolchain at 0.1.2, the build that has the folded manifest ([6957a43](https://forgejo.webgrip.dev/webgrip/workflows/commit/6957a43))
* fix(semrel): point the toolchain-image defaults at the versions that shipped ([239252c](https://forgejo.webgrip.dev/webgrip/workflows/commit/239252c))
* fix(semrel): probe the prebaked toolchain, restore the monorepo race retry ([ee06ca5](https://forgejo.webgrip.dev/webgrip/workflows/commit/ee06ca5))
* fix(semrel): retry the shared-config install anonymously on auth failure ([f9d35a8](https://forgejo.webgrip.dev/webgrip/workflows/commit/f9d35a8))
* docs(adr-0005): correct the image layout — three dirs, not three targets ([8d4d655](https://forgejo.webgrip.dev/webgrip/workflows/commit/8d4d655))
* docs(adr-0005): record that the toolchain images are independent, and why ([78cb95c](https://forgejo.webgrip.dev/webgrip/workflows/commit/78cb95c))
* docs(adr-0005): the duplicated runtime block is kept in step by hand, not by CI ([6ff0b7f](https://forgejo.webgrip.dev/webgrip/workflows/commit/6ff0b7f))
* feat(semrel): run releases in a locked toolchain image, keep only the contract ([dc31459](https://forgejo.webgrip.dev/webgrip/workflows/commit/dc31459))

## 1.1.0 (2026-08-09)

* chore: trigger the first self-release run ([066f6c4](https://forgejo.webgrip.dev/webgrip/workflows/commit/066f6c4))
* feat(ci): release this repo with its own semantic-release ([51541e7](https://forgejo.webgrip.dev/webgrip/workflows/commit/51541e7))
