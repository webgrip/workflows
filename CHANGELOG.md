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
