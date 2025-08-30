# Application Workflow Examples

This directory contains example workflow files that applications can copy into their repositories to use the gitflow-esque release workflow.

## Files

### `on_source_change.yml`
This workflow handles development activities and should be triggered by:
- Pushes to development/feature branches
- Pull requests to main/development branches

**Actions performed:**
- Static analysis on all changes
- Automated testing
- Automatic creation of release PRs from development to main
- No deployment (development activities only)

### `on_release.yml`
This workflow handles release activities and should be triggered by:
- Pushes to the main branch (typically from merged release PRs)

**Actions performed:**
- Static analysis and testing (as final validation)
- Semantic versioning and changelog generation
- Docker image building and publishing
- Application deployment to staging environment

## Usage

### Option 1: Separate Source Change and Release Workflows

Copy both files to your application repository's `.github/workflows/` directory:

```bash
# In your application repository
cp examples/on_source_change.yml .github/workflows/
cp examples/on_release.yml .github/workflows/
```

This approach separates development activities from release activities, providing clear separation of concerns.

### Option 2: Single Combined Workflow

If you prefer a single workflow file, you can use the combined approach from `gitflow-application.yml`:

```bash
# In your application repository
cp .github/workflows/gitflow-application.yml .github/workflows/
```

## Configuration

Both workflow examples can be customized by modifying the `with` parameters:

```yaml
with:
  source-paths: 'src/**'              # Paths to monitor for source changes
  ops-paths: 'ops/**'                 # Paths to monitor for ops changes
  static-analysis-enabled: true       # Enable/disable static analysis
  tests-enabled: true                 # Enable/disable automated testing
  deploy-enabled: true                # Enable/disable deployment (release workflow only)
```

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