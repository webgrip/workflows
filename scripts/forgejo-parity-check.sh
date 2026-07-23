#!/usr/bin/env bash
#
# forgejo-parity-check.sh
#
# Guards the two-tree layout described in docs/adrs/0002-forgejo-actions-parity.md:
#
#   .github/workflows/   .github/composite-actions/    <- frozen, GitHub-only
#   .forgejo/workflows/  .forgejo/composite-actions/   <- Forgejo-adapted mirror
#
# Checks (fatal unless noted):
#   1. No orphan .forgejo workflow that lacks a .github source of the same name.
#   2. No forbidden GitHub-only constructs leaked into the .forgejo tree.
#   3. Coverage report of .github workflows not yet ported. Informational during the
#      incremental rollout; set STRICT=1 (or create .forgejo/.parity-complete) to make
#      missing siblings fatal once the migration is finished.
#
# Usage:
#   scripts/forgejo-parity-check.sh
#   STRICT=1 scripts/forgejo-parity-check.sh

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

github_dir=".github/workflows"
forgejo_dir=".forgejo/workflows"

strict="${STRICT:-0}"
if [ -f ".forgejo/.parity-complete" ]; then
    strict=1
fi

fail=0
note() { printf '  \033[33m•\033[0m %s\n' "$1"; }
err()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=1; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }

# Workflows that intentionally exist ONLY in .forgejo (no .github sibling), e.g.
# because they target infrastructure unreachable from GitHub-hosted runners.
FORGEJO_ONLY=(
    docker-build-and-push-harbor.yml        # in-cluster runner -> LAN-only Harbor
    docker-build-and-push-harbor-fast.yml   # in-cluster runner -> LAN-only Harbor
    docker-build-and-push-registry.yml      # generic engine behind the Harbor wrappers
    docker-build-and-push-registry-fast.yml # generic engine behind the Harbor wrappers
    techdocs-deploy-codeberg.yml            # Codeberg pages target, Forgejo-first
    semantic-release-monorepo.yml           # Forgejo is the sole release authority; GitHub mirrors cut no releases
    rust-quality.yml                        # hard-gate family (ADR 0003): Harbor runner images + forgejo artifact forks
    laravel-quality.yml                     # hard-gate family (ADR 0003): Harbor runner images + forgejo artifact forks
    moon-ci.yml                             # hard-gate family (ADR 0003): Harbor runner images + forgejo artifact forks
    spa-preview.yml                         # in-cluster preview host + Forgejo API, no GitHub analog
    docker-mirror.yml                       # Harbor -> Forgejo registry replication, no GitHub analog
)

is_forgejo_only() {
    local needle="$1"
    for m in "${FORGEJO_ONLY[@]}"; do
        [ "$m" = "$needle" ] && return 0
    done
    return 1
}

# ---------------------------------------------------------------------------
# Check 1: orphan .forgejo workflows
# ---------------------------------------------------------------------------
echo "[1/3] Orphan .forgejo workflows (no .github source)"
orphans=0
if [ -d "$forgejo_dir" ]; then
    while IFS= read -r -d '' f; do
        base="$(basename "$f")"
        is_forgejo_only "$base" && continue
        if [ ! -f "$github_dir/$base" ]; then
            err "$forgejo_dir/$base has no counterpart in $github_dir"
            orphans=$((orphans + 1))
        fi
    done < <(find "$forgejo_dir" -maxdepth 1 -name '*.yml' -print0)
fi
[ "$orphans" -eq 0 ] && ok "no orphan Forgejo workflows"

# ---------------------------------------------------------------------------
# Check 2: forbidden GitHub-only constructs in the .forgejo tree
# ---------------------------------------------------------------------------
echo "[2/3] Forbidden GitHub-only constructs in .forgejo/"
# pattern|human description
forbidden=(
    'actions/checkout@v6|actions/checkout@v6 is broken on non-GitHub runners (pin @v5)'
    'create-github-app-token|GitHub App token minting has no Forgejo equivalent (use FORGEJO_TOKEN)'
    '@semantic-release/github|@semantic-release/github targets the GitHub API (use a Gitea/Forgejo plugin)'
    'ghcr\.io|ghcr.io registry reference (retarget to Harbor / Forgejo registry)'
)
violations=0
if [ -d ".forgejo" ]; then
    for entry in "${forbidden[@]}"; do
        pattern="${entry%%|*}"
        desc="${entry#*|}"
        # docker-build-and-push-ghcr.yml is exempt: it intentionally targets ghcr.io so
        # consumers can dual-publish during the Harbor migration (see README).
        if matches="$(grep -rnE "$pattern" .forgejo --include='*.yml' --include='*.yaml' \
            --exclude='docker-build-and-push-ghcr.yml' 2>/dev/null)"; then
            while IFS= read -r line; do
                err "$desc"
                printf '      %s\n' "$line"
            done <<< "$matches"
            violations=$((violations + 1))
        fi
    done
fi
[ "$violations" -eq 0 ] && ok "no forbidden constructs found"

# ---------------------------------------------------------------------------
# Check 3: coverage of .github workflows
# ---------------------------------------------------------------------------
echo "[3/3] Coverage: .github workflows ported to .forgejo (STRICT=$strict)"
total=0
ported=0
missing=()
if [ -d "$github_dir" ]; then
    while IFS= read -r -d '' f; do
        base="$(basename "$f")"
        total=$((total + 1))
        if [ -f "$forgejo_dir/$base" ]; then
            ported=$((ported + 1))
        else
            missing+=("$base")
        fi
    done < <(find "$github_dir" -maxdepth 1 -name '*.yml' -print0)
fi
ok "$ported/$total workflows ported"
if [ "${#missing[@]}" -gt 0 ]; then
    for m in "${missing[@]}"; do
        if [ "$strict" = "1" ]; then
            err "not yet ported: $m"
        else
            note "not yet ported: $m"
        fi
    done
fi

echo
if [ "$fail" -ne 0 ]; then
    echo "FAIL: parity check found issues."
    exit 1
fi
echo "OK: parity check passed."
