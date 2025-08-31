# Docker Registry Strategy Guide

This repository now supports flexible Docker image publishing with multiple registry strategies. You can push to GitHub Container Registry (GHCR), Docker Hub, both, or neither, depending on your needs and available secrets.

## Quick Start

### Auto Strategy (Recommended)

The simplest approach is to use the auto strategy, which automatically detects available credentials:

```yaml
jobs:
  docker:
    uses: webgrip/workflows/.github/workflows/docker-build-and-push.yml@main
    with:
      docker-context: '.'
      docker-file: 'Dockerfile'
      docker-tags: |
        latest
        ${{ github.sha }}
      registry-strategy: 'auto'  # Default behavior
    secrets:
      DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}  # Optional
      DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}      # Optional
```

## Registry Strategies

### 1. Auto Strategy (`auto`)
**Default behavior** - Automatically chooses the best strategy based on available secrets:
- Both secrets → Dual registry (GHCR + Docker Hub)
- GitHub token only → GHCR only  
- Docker secrets only → Docker Hub only
- No secrets → Skip push

### 2. GHCR Only (`ghcr`)
**Use GitHub Container Registry only** - No Docker Hub secrets required:
```yaml
registry-strategy: 'ghcr'
# Uses GitHub token automatically (no additional secrets needed)
```

### 3. Docker Hub Only (`dockerhub`)
**Use Docker Hub only** - Requires Docker Hub credentials:
```yaml
registry-strategy: 'dockerhub'
secrets:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}  # Required
  DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}      # Required
```

### 4. Dual Registry (`dual`)
**Push to both registries** - Requires Docker Hub credentials:
```yaml
registry-strategy: 'dual'
secrets:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}  # Required
  DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}      # Required
```

### 5. Legacy Mode (`legacy`)
**Backward compatibility** - Uses original docker-build-push action:
```yaml
registry-strategy: 'legacy'
secrets:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}  # Required
  DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}      # Required
```

### 6. No Push (`none`)
**Build only, no push** - Useful for testing or builds without publishing:
```yaml
registry-strategy: 'none'
# No secrets needed
```

## Tag Generation

### GHCR Tags
Input tags are automatically converted to GHCR format:
- `latest` → `ghcr.io/owner/repo:latest`
- `v1.0` → `ghcr.io/owner/repo:v1.0`
- `myorg/app:latest` → `ghcr.io/myorg/app:latest`
- `ghcr.io/foo:bar` → `ghcr.io/foo:bar` (unchanged)

### Dual Registry Tags
Creates tags for both registries:
- `latest` → `ghcr.io/owner/repo:latest` + `owner/repo:latest`
- `myorg/app:v1.0` → `ghcr.io/myorg/app:v1.0` + `myorg/app:v1.0`

## Migration Guide

### From Docker Hub Only
```yaml
# Before
secrets:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}

# After (automatic dual registry)
registry-strategy: 'auto'  # or omit entirely
secrets:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}  # Keep existing
  DOCKER_TOKEN: ${{ secrets.DOCKER_TOKEN }}      # Keep existing
```

### To GHCR Only
```yaml
# Remove Docker secrets and use GHCR only
registry-strategy: 'ghcr'
# No secrets needed (uses GitHub token automatically)
```

### Gradual Migration
1. **Phase 1**: Use `auto` strategy with existing Docker secrets (dual registry)
2. **Phase 2**: Test with `ghcr` strategy to ensure everything works
3. **Phase 3**: Remove Docker secrets from repository when ready

## Direct Composite Action Usage

You can also use the composite actions directly:

```yaml
# GHCR only
- uses: webgrip/workflows/.github/composite-actions/docker-build-push-ghcr@main

# Docker Hub only  
- uses: webgrip/workflows/.github/composite-actions/docker-build-push-dockerhub@main

# Both registries
- uses: webgrip/workflows/.github/composite-actions/docker-build-push-dual@main

# Original action (backward compatibility)
- uses: webgrip/workflows/.github/composite-actions/docker-build-push@main
```

## Benefits

- **Flexibility**: Choose the right strategy for each project
- **Cost Optimization**: Reduce Docker Hub usage and costs
- **Security**: GHCR inherits repository permissions
- **Performance**: Potentially faster pulls from GHCR
- **Zero Breaking Changes**: Existing workflows continue working
- **Future-Proof**: Easy to add new registries later

## Examples

See [docker-registry-strategy-examples.yml](.github/workflows/docker-registry-strategy-examples.yml) for complete examples of each strategy.