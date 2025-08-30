# Migration Guide: From on_source_change.yml to Gitflow

This guide helps you migrate from the existing `on_source_change.yml` workflow to the new gitflow-esque release workflow.

## Quick Migration Steps

### 1. Backup your current workflow
```bash
# In your application repository
cp .github/workflows/on_source_change.yml .github/workflows/on_source_change.yml.backup
```

### 2. Replace with gitflow workflow
Replace the contents of your workflow file with:

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

### 3. Update semantic-release configuration
Create or update `.releaserc.json` in your repository root:

```json
{
  "extends": "webgrip/workflows/.releaserc.gitflow.json"
}
```

Or if you want to customize the configuration, copy the content from `webgrip/workflows/.releaserc.gitflow.json` and modify as needed.

### 4. Create development branch
```bash
# Create development branch from main
git checkout main
git pull origin main
git checkout -b development
git push -u origin development
```

### 5. Update branch protection rules
In your GitHub repository settings:

#### Main branch protection:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Include administrators
- ✅ Restrict pushes that create files larger than 100MB

#### Development branch protection:
- ✅ Require status checks to pass before merging
- ⚪ Require pull request reviews (optional)
- ✅ Require branches to be up to date before merging

### 6. Test the workflow
```bash
# Create a test feature branch
git checkout development
git checkout -b feature/test-gitflow
echo "# Test" > test-gitflow.md
git add test-gitflow.md
git commit -m "feat: add test file for gitflow"
git push -u origin feature/test-gitflow

# Create PR to development
# - Watch the static analysis and tests run
# - Merge the PR
# - Watch for automatic release PR creation from development to main
```

## Key Differences from old workflow

### Before (on_source_change.yml):
- Only triggered on main branch
- Immediate semantic release on every push
- Immediate build and deploy

### After (gitflow):
- Triggers on multiple branches (main, development, feature/*)
- Static analysis and tests run on all branches
- Semantic release only on main after tests pass
- Automatic release PR creation from development to main
- Build and deploy only after successful release

## Configuration Options

### Disable specific features:
```yaml
with:
  static-analysis-enabled: false  # Skip static analysis
  tests-enabled: false           # Skip tests
  deploy-enabled: false          # Skip deployment
```

### Custom paths:
```yaml
with:
  source-paths: 'app/**,lib/**'  # Monitor multiple source directories
  ops-paths: 'deploy/**'         # Custom ops directory
```

## Troubleshooting

### "No changes to release" in release PR
- Ensure development branch has commits not in main
- Check that conventional commit format is used

### Static analysis failures
- Fix code quality issues before merging to development
- Configure static analysis tools in your repository

### Release PR not created
- Verify development branch exists and has new commits
- Check GitHub token permissions in Actions settings
- Ensure tests are passing on development

### Semantic release not running
- Verify you're pushing to main branch
- Check that tests passed
- Ensure conventional commit format in commits

## Rollback Plan

If you need to rollback to the old workflow:
```bash
# Restore backup
cp .github/workflows/on_source_change.yml.backup .github/workflows/on_source_change.yml
git add .github/workflows/on_source_change.yml
git commit -m "rollback: restore original workflow"
git push
```

## Support

For issues with the gitflow workflow:
1. Check the [gitflow documentation](./gitflow-workflow.md)
2. Validate your configuration with the validation script
3. Create an issue in the webgrip/workflows repository