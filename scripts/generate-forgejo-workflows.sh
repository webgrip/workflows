#!/usr/bin/env bash
#
# generate-forgejo-workflows.sh
#
# Idempotently generates the mechanical (Tier-1) Forgejo workflow copies from the
# frozen .github/ tree, per docs/adrs/0002-forgejo-actions-parity.md.
#
# A "mechanical" copy is one whose only adaptation is rewriting internal
# self-references from  webgrip/workflows/.github/...  to  webgrip/workflows/.forgejo/...
# Files that need real adaptation (registry, action pinning, auth, API rewrites) are
# listed in MANUAL[] below and are HAND-OWNED — this script never writes them.
#
# Safety: the script writes ONLY under .forgejo/ and never touches .github/. After
# generating, it asserts that no generated file contains a forbidden GitHub-only
# construct; if one does, it must be moved into MANUAL[] and ported by hand.
#
# Usage:  scripts/generate-forgejo-workflows.sh

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

src_dir=".github/workflows"
dst_dir=".forgejo/workflows"

# Hand-owned files (T2/T3) — NOT generated mechanically.
MANUAL=(
    # T2 — registry / action pinning
    php-application-tests.yml
    php-application-static-analysis.yml
    node-application-tests.yml
    node-application-static-analysis.yml
    dotnet-application-tests.yml
    dotnet-application-static-analysis.yml
    docker-build-and-push-ghcr.yml
    helm-chart-push.yml
    helm-charts-push.yml
    helm-chart-deploy.yml
    helm-charts-deploy.yml
    rust-semantic-release.yml
    wordpress-plugin-release.yml
    wordpress-plugin-release-distribute.yml
    # Orchestrators that pass auth to a hand-adapted callee (semantic-release)
    application-release.yml
    application-release-publish.yml
    # T3 — Forgejo-specific reimplementation
    semantic-release.yml
    setup-repository-bootstrap.yml
    setup-repository-create-from-template.yml
    setup-repository-copilot-files.yml
    sync-template-files.yml
    github-issue-create-by-prompt.yml
    github-issues-create-by-prompt.yml
    techdocs-deploy-gh-pages.yml
    update_mkdocs.yml
    update_techdocs.yml
)

is_manual() {
    local needle="$1"
    for m in "${MANUAL[@]}"; do
        [ "$m" = "$needle" ] && return 0
    done
    return 1
}

mkdir -p "$dst_dir"

generated=0
skipped=0
echo "Generating mechanical (T1) Forgejo workflow copies..."
while IFS= read -r -d '' f; do
    base="$(basename "$f")"
    if is_manual "$base"; then
        skipped=$((skipped + 1))
        continue
    fi
    # Copy + rewrite self-references .github -> .forgejo (only within webgrip/workflows/).
    sed 's#webgrip/workflows/\.github/#webgrip/workflows/.forgejo/#g' "$f" > "$dst_dir/$base"
    generated=$((generated + 1))
done < <(find "$src_dir" -maxdepth 1 -name '*.yml' -print0)

echo "  generated: $generated   hand-owned (skipped): $skipped"

# Assert no forbidden construct slipped into a mechanically-generated file.
echo "Verifying generated files contain no GitHub-only constructs..."
forbidden='actions/checkout@v6|create-github-app-token|@semantic-release/github|ghcr\.io'
bad=0
while IFS= read -r -d '' f; do
    base="$(basename "$f")"
    is_manual "$base" && continue
    if hit="$(grep -nE "$forbidden" "$f" 2>/dev/null)"; then
        echo "  ✗ $f contains a forbidden construct — move it to MANUAL[] and hand-port:"
        echo "$hit" | sed 's/^/      /'
        bad=1
    fi
done < <(find "$dst_dir" -maxdepth 1 -name '*.yml' -print0)

if [ "$bad" -ne 0 ]; then
    echo "FAIL: one or more generated files need manual porting."
    exit 1
fi
echo "OK: generated $generated mechanical copies cleanly."
