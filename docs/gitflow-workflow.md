# Gitflow Release Workflow

This workflow provides a complete gitflow implementation for applications, replacing the traditional `on_source_change.yml` workflow with a more comprehensive branching strategy.

## Features

- **Multi-branch support**: Handles `main`, `development`, `feature/*`, `bugfix/*`, and `hotfix/*` branches
- **Automatic testing**: Runs static analysis and tests on all branches
- **Release automation**: Creates release PRs from development to main
- **Semantic versioning**: Uses semantic-release only on main branch after tests pass
- **Changelog generation**: Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
- **Conditional deployment**: Only deploys on main after successful release

## Branch Strategy

### Main Branch (`main`)
- **Triggers**: Push to main (typically from merged release PRs)
- **Actions**: 
  - Static analysis and tests
  - Semantic release (creates version tags and changelog)
  - Docker build and push
  - Deployment to staging environment

### Development Branch (`development` or `develop`)
- **Triggers**: Push to development (from merged feature branches)
- **Actions**:
  - Static analysis and tests
  - Automatic creation of release PR to main (if tests pass)

### Feature Branches (`feature/*`, `bugfix/*`, `hotfix/*`)
- **Triggers**: Push to feature branches
- **Actions**:
  - Static analysis and tests only
  - No releases or deployments

## Usage

### 1. Replace your existing workflow

Replace your existing `on_source_change.yml` or similar workflow with:

```yaml
name: '[Application] Gitflow CI/CD'

on:
  push:
    branches:
      - 'main'
      - 'development'
      - 'develop'
      - 'feature/**'
      - 'bugfix/**'
      - 'hotfix/**'
    paths:
      - 'ops/**'
      - 'src/**'
      - '.releaserc.json'
      - '.github/workflows/**'
  pull_request:
    branches:
      - 'main'
      - 'development'
      - 'develop'
    paths:
      - 'ops/**'
      - 'src/**'
      - '.releaserc.json'
      - '.github/workflows/**'

concurrency:
  group: gitflow-${{ github.ref }}
  cancel-in-progress: true

jobs:
  gitflow:
    name: 'Gitflow CI/CD'
    uses: webgrip/workflows/.github/workflows/gitflow-release.yml@main
    secrets:
      DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
      DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}
      DIGITAL_OCEAN_API_KEY: ${{ secrets.DIGITAL_OCEAN_API_KEY }}
      SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
    with:
      source-paths: 'src/**'
      ops-paths: 'ops/**'
      static-analysis-enabled: true
      tests-enabled: true
      deploy-enabled: true
```

### 2. Configure semantic-release for gitflow

Create or update your `.releaserc.json` to use the gitflow configuration:

```json
{
  "extends": "webgrip/workflows/.releaserc.gitflow.json"
}
```

Or copy the gitflow configuration from `webgrip/workflows/.releaserc.gitflow.json` and customize as needed.

### 3. Set up your branches

1. **Create a `development` branch** from main:
   ```bash
   git checkout main
   git checkout -b development
   git push -u origin development
   ```

2. **Set branch protection rules** in GitHub:
   - Protect `main`: Require PR reviews, require status checks
   - Protect `development`: Require status checks (optional PR reviews)

## Workflow Process

### Development Flow

1. **Create feature branch** from development:
   ```bash
   git checkout development
   git checkout -b feature/my-new-feature
   ```

2. **Develop and push** changes:
   - Static analysis and tests run automatically
   - Fix any issues before proceeding

3. **Create PR** to development:
   - Tests run on PR
   - Merge when ready

4. **Automatic release PR creation**:
   - When development is updated, a release PR is automatically created to main
   - PR includes changelog with all changes since last release

5. **Review and merge** release PR:
   - Review the generated changelog
   - Merge to trigger semantic release and deployment

### Configuration Options

The workflow accepts several input parameters:

- `source-paths`: Paths to monitor for source changes (default: `'src/**'`)
- `ops-paths`: Paths to monitor for ops changes (default: `'ops/**'`)
- `static-analysis-enabled`: Enable static analysis (default: `true`)
- `tests-enabled`: Enable tests (default: `true`)
- `deploy-enabled`: Enable deployment (default: `true`)

### Required Secrets

- `DOCKER_USERNAME`: Docker Hub username for image publishing
- `DOCKER_TOKEN`: Docker Hub token for authentication
- `DIGITAL_OCEAN_API_KEY`: DigitalOcean API key for deployments
- `SOPS_AGE_KEY`: SOPS age key for secret decryption

## Migration from Existing Workflow

If you're migrating from the existing `on_source_change.yml` workflow:

1. **Backup** your existing workflow
2. **Replace** with the gitflow workflow above
3. **Create** development branch if it doesn't exist
4. **Update** branch protection rules
5. **Test** the workflow by pushing to development

## Changelog Format

The workflow uses [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format with automatic generation based on conventional commits:

- `feat:` → **Added** section (minor version bump)
- `fix:` → **Fixed** section (patch version bump)
- `BREAKING CHANGE:` → **Changed** section (major version bump)
- `perf:` → **Fixed** section (patch version bump)
- `refactor:` → **Changed** section (patch version bump)

## Troubleshooting

### Release PR not created
- Ensure the development branch has new commits compared to main
- Check that tests are passing on development
- Verify GitHub token has proper permissions

### Semantic release not running
- Ensure you're pushing to main branch
- Check that tests are passing
- Verify conventional commit format

### Deployment not triggered
- Ensure semantic release created a new version
- Check that all required secrets are configured
- Verify Docker and Helm configurations are correct