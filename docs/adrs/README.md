# Architecture Decision Records

The house format is in [`0000-template.md`](0000-template.md): MADR v3+ with the estate's
status, deciders, validation and revision-log fields. Records keep the format they were born in.

Numbers are never reused and files are never renamed, because inbound links break.

## Records

| #                                                                | Decision                                             | Status   | Date       |
| ---------------------------------------------------------------- | ---------------------------------------------------- | -------- | ---------- |
| [0001](0001-standardized-language-workflows.md)                  | Standardized language workflows                      | Accepted | 2026-03-27 |
| [0002](0002-forgejo-actions-parity.md)                           | Forgejo Actions parity, two-tree layout              | Accepted | 2026-06-12 |
| [0003](0003-hard-gate-quality-workflows.md)                      | Hard-gate quality workflow family                    | Accepted | 2026-07-23 |
| [0004](0004-ci-bot-identity-and-forgejo-package-distribution.md) | CI bot identity and Forgejo package distribution     | Accepted | 2026-07-26 |
| [0005](0005-semantic-release-toolchain-image.md)                 | The semantic-release toolchain is an image           | Accepted | 2026-07-29 |
| [0006](0006-no-comments-in-code.md)                              | No comments in code, estate-wide (moved to ai-skills) | Accepted | 2026-09-05 |

## Scope

These records govern the estate, not only this repository. This repo holds them because it is
the CI and release authority the other repositories consume.
