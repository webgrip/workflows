# Application Workflow Examples

This directory contains example workflow files that applications can copy into their repositories to implement a clean gitflow-style development process with separated concerns.

## Files

### `on_source_change.yml` - Development CI/CD
This workflow handles development activities and should be triggered by:
- Pushes to development/feature/bugfix/hotfix branches
- Pull requests to main/development branches

**Actions performed:**
- Static analysis using `webgrip/workflows/.github/workflows/static-analysis.yml`
- Automated testing using `webgrip/workflows/.github/workflows/tests.yml`
- Automatic creation of release PRs from development to main
- No deployment (development activities only)

### `on_release.yml` - Release CI/CD
This workflow handles release activities and should be triggered by:
- Pushes to the main branch (typically from merged release PRs)

**Actions performed:**
- Static analysis and testing (final validation)
- Semantic versioning and changelog generation using `webgrip/workflows/.github/workflows/semantic-release.yml`
- Docker image building and publishing using `webgrip/workflows/.github/workflows/docker-build-and-push.yml`
- Secrets deployment using `webgrip/workflows/.github/workflows/helm-charts-deploy.yml`
- Application deployment using `webgrip/workflows/.github/workflows/helm-chart-deploy.yml`

## Key Benefits

- **Separation of Concerns**: Development and release workflows are completely separate
- **Direct Workflow Calls**: Each workflow calls specific components instead of monolithic workflows
- **Clear Dependencies**: Easy to understand job dependencies and flow
- **Focused Execution**: Development workflows focus on validation, release workflows focus on deployment

## Usage

### Recommended: Separate Development and Release Workflows

Copy both files to your application repository's `.github/workflows/` directory:

```bash
# In your application repository
cp examples/on_source_change.yml .github/workflows/
cp examples/on_release.yml .github/workflows/
```

This approach provides:
- **Clear separation** between development validation and release deployment
- **Focused workflows** that do exactly what they need to
- **Better visibility** into which stage is failing
- **Independent scaling** of development vs release processes

### Alternative: Single Combined Workflow

If you prefer a single workflow file, you can use the combined approach from `gitflow-application.yml`:

```bash
# In your application repository
cp .github/workflows/gitflow-application.yml .github/workflows/
```

## Configuration

The example workflows are ready to use as-is, but can be customized by modifying the workflow parameters directly in the files. Common customizations include:

- **Path filters**: Modify the `paths` sections to watch different directories
- **Branch names**: Adjust branch names in the `branches` sections
- **Environments**: Change deployment targets in `on_release.yml`
- **Docker settings**: Update Docker context, file paths, and tag strategies

## Required Secrets

Ensure your repository has the following secrets configured:

- `DOCKER_USERNAME`: Docker Hub username for image publishing
- `DOCKER_TOKEN`: Docker Hub token for authentication
- `DIGITAL_OCEAN_API_KEY`: DigitalOcean API key for deployments
- `SOPS_AGE_KEY`: SOPS age key for secret decryption

## Semantic Release Configuration

Create or update `.releaserc.json` in your repository root:

```json
{
  "extends": "webgrip/workflows/.releaserc.gitflow.json"
}
```

## Branch Setup

1. **Create development branch** (if it doesn't exist):
   ```bash
   git checkout main
   git checkout -b development
   git push -u origin development
   ```

2. **Set up branch protection rules** in GitHub:
   - **Main branch**: Require PR reviews, require status checks
   - **Development branch**: Require status checks (optional PR reviews)

## Workflow Process

1. **Create feature branch** from development:
   ```bash
   git checkout development
   git checkout -b feature/my-feature
   ```

2. **Develop and push** changes:
   - `on_source_change.yml` runs static analysis and tests
   - Fix any issues before proceeding

3. **Create PR** to development and merge when ready

4. **Automatic release PR**:
   - When development is updated, a release PR is created to main
   - Review the generated changelog and merge when ready

5. **Release and deployment**:
   - `on_release.yml` runs semantic release, build, and deployment

## Migration from Existing Workflows

If you're migrating from an existing `on_source_change.yml` workflow:

1. **Backup your current workflow**:
   ```bash
   cp .github/workflows/on_source_change.yml .github/workflows/on_source_change.yml.backup
   ```

2. **Replace with the new workflows**:
   ```bash
   cp examples/on_source_change.yml .github/workflows/
   cp examples/on_release.yml .github/workflows/
   ```

3. **Follow the branch setup and configuration steps above**

For detailed migration instructions, see [migration-guide.md](../docs/migration-guide.md).