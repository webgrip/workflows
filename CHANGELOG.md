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
