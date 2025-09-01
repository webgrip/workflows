# WebGrip Workflows

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions](https://img.shields.io/badge/GitHub-Actions-2088FF.svg)](https://github.com/features/actions)

A comprehensive collection of reusable GitHub Actions workflows and composite actions for modern CI/CD pipelines. This repository provides battle-tested automation for PHP, Rust, JavaScript projects, Docker containerization, Helm deployments, and repository management.

## 🚀 Features

- **26+ Reusable Workflows** - Production-ready CI/CD pipelines
- **Multi-Language Support** - PHP 8.2, Rust, JavaScript/Node.js
- **Container & Cloud Native** - Docker build/push, Helm chart management
- **Quality Assurance** - Static analysis, testing, code coverage
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
  - [Rust Development](#rust-development)
  - [JavaScript Development](#javascript-development)
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

#### `helm-chart-validate.yml` / `helm-charts-validate.yml`
Validates Helm chart syntax and best practices.

### Rust Development

#### `rust-tests.yml`
Runs Rust test suites with cargo.

#### `rust-static-analysis.yml`
Performs static analysis on Rust code using clippy and other tools.

#### `rust-semantic-release.yml`
Automated semantic releases for Rust projects.

### JavaScript Development

#### `gha-javascript-lint.yml`
Lints JavaScript/TypeScript code using ESLint and other tools.

#### `gha-javascript-test.yml`
Runs JavaScript/TypeScript test suites.

### Documentation

#### `techdocs-generate.yml`
Generates documentation using MkDocs and TechDocs.

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
Automated semantic versioning and releases using conventional commits.

**Features:**
- GitHub App authentication support
- Conventional commit parsing
- Automated changelog generation
- Tag and release creation

**Inputs:**
- `release-type` (optional) - Type of release
- `use-bot-to-commit` - Use GitHub App for commits

**Outputs:**
- `version` - Generated version number

## 🔧 Composite Actions

### `docker-build-push`
Reusable composite action for building and pushing Docker images.

### `semantic-release`
Composite action for semantic release automation with Node.js setup.

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
    if: github.ref == 'refs/heads/main'
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
    if: github.ref == 'refs/heads/main'
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
    if: github.ref == 'refs/heads/main'
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