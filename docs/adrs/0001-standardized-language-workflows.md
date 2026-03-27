# ADR 001 - Standardized Language Workflows

* **Status**: Accepted
* **Deciders**: WebGrip maintainers
* **Date**: 2026-03-27
* **Tags**: CI::Workflows, Quality, Security, Standardization
* **Version**: 1.0.0

---

## Context and Problem Statement

The repository already provided reusable workflows for PHP, Rust, JavaScript, and infrastructure concerns, but language support was inconsistent. Rust had a strong static-analysis pipeline, PHP had PHP-specific reusable workflows, and the .NET workflows were placeholder copies of the PHP implementation. There was no shared expectation for what a reusable language workflow should cover.

## Decision Drivers

| # | Driver |
| - | ------ |
| 1 | Give consumers a predictable workflow contract across languages |
| 2 | Keep checks native to each ecosystem instead of forcing a lowest-common-denominator toolset |
| 3 | Cover formatting, compile-time or lint-time analysis, security, and dependency hygiene in every language workflow |
| 4 | Make advisory checks visible without turning all dependency drift into hard CI failures |
| 5 | Provide matching test workflows for supported languages |

## Considered Options

1. **One universal workflow for every language**
2. **Language-specific workflows with no shared contract**
3. **Language-specific workflows with a shared CI shape**

## Decision Outcome

### Chosen Option

Language-specific workflows with a shared CI shape.

### Rationale

Every supported language now follows the same high-level flow:

1. Checkout source
2. Install the language toolchain
3. Restore dependencies with caching
4. Run format and style checks
5. Run compiler, linter, or analyzer passes
6. Run security and vulnerability checks
7. Report dependency hygiene or outdated packages
8. Provide a matching reusable test workflow

The tools remain ecosystem-native. Examples include `dotnet format` for .NET, Spotless and build-plugin checks for Java, Ruff for Python, and `gofmt` plus `golangci-lint` for Go.

### Positive Consequences

* New workflows expose a predictable interface and naming scheme across languages.
* Security and dependency hygiene are treated as first-class workflow concerns.
* Advisory checks such as outdated dependencies can be surfaced without blocking all merges.
* The repository now includes first-party reusable workflows for .NET, Java, Node.js, Python, and Go in addition to existing PHP and Rust support.

### Negative Consequences / Trade-offs

* Some workflows rely on project-level configuration for tools like Spotless, Checkstyle, Knip, or MyPy, so behavior varies with repository maturity.
* Ecosystem-native workflows are more maintainable than a universal workflow, but they do require more files.

### Risks & Mitigations

* Risk: workflows become inconsistent over time.
  Mitigation: this ADR defines the minimum workflow shape for future additions.
* Risk: advisory checks are ignored because they do not fail the build.
  Mitigation: keep advisory steps visible in workflow output and artifacts.

## Validation

* **Immediate proof** - reusable workflows were added for .NET, Java, Node.js, Python, and Go, and the placeholder .NET workflows were replaced.
* **Ongoing guardrails** - future workflow additions should follow the same checkout, setup, restore, analysis, security, hygiene, and testing pattern.

## Compliance, Security & Privacy Impact

The new workflows improve security posture by adding vulnerability and dependency auditing to more ecosystems. They do not introduce new data classes or privacy-sensitive processing.

## Notes

* **Related Decisions**: None
* **Supersedes / Amends**: None
* **Follow-ups / TODOs**: Add SARIF upload for ecosystems where code-scanning integration is useful.

---

### Revision Log

| Version | Date | Author | Change |
| ------- | ---- | ------ | ------ |
| 1.0.0 | 2026-03-27 | GitHub Copilot | Initial creation |
