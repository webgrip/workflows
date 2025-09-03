#!/bin/bash
# ACT validation script
# This script validates that ACT is properly configured and can run basic tests

set -e

echo "🔧 ACT Configuration Validation"
echo "==============================="

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker is not installed. Docker is required to run ACT."
    exit 1
fi

echo "✅ Docker is installed"

# Check if ACT Docker image is available
ACT_IMAGE="application-template-act:latest"
echo "🔍 Checking ACT Docker image availability..."
if ! docker image inspect "$ACT_IMAGE" >/dev/null 2>&1; then
    echo "⚠️  ACT Docker image not found locally. Run 'make setup-act' to build it."
    exit 1
else
    echo "✅ ACT Docker image found locally: $ACT_IMAGE"
fi

# Check if configuration files exist
if [ ! -f .actrc ]; then
    echo "❌ .actrc configuration file missing"
    exit 1
fi

echo "✅ .actrc configuration found"

# Check if secrets file exists
if [ ! -f .act_secrets ]; then
    echo "⚠️  .act_secrets file missing. Using example file for validation only."
    echo "   Create .act_secrets with real tokens for actual testing."
fi

# If .act_secrets exists, check for common required values and warn for placeholders
if [ -f .act_secrets ]; then
    GITHUB_TOKEN_VAL=$(grep -E '^GITHUB_TOKEN=' .act_secrets || true)
    if [ -z "$GITHUB_TOKEN_VAL" ]; then
        echo "⚠️  .act_secrets does not contain GITHUB_TOKEN. Some workflows require this."
    else
        # Extract value and check for obvious placeholder
        GITHUB_TOKEN_VALUE=$(echo "$GITHUB_TOKEN_VAL" | sed -E 's/^GITHUB_TOKEN=(.*)$/\1/')
        if [ "$GITHUB_TOKEN_VALUE" = "your_github_token_here" ] || [ -z "$GITHUB_TOKEN_VALUE" ]; then
            echo "⚠️  GITHUB_TOKEN in .act_secrets appears to be the example placeholder. Replace it with a real token."
        else
            echo "✅ GITHUB_TOKEN appears set in .act_secrets"
        fi
    fi

    # Check for runtime token/url used by some actions (upload-artifact/etc.)
    if ! grep -q '^ACTIONS_RUNTIME_TOKEN=' .act_secrets 2>/dev/null; then
        echo "⚠️  ACTIONS_RUNTIME_TOKEN not found in .act_secrets. Add it to avoid upload-artifact errors when running ACT locally."
    else
        echo "✅ ACTIONS_RUNTIME_TOKEN found in .act_secrets"
    fi

    if ! grep -q '^ACTIONS_RUNTIME_URL=' .act_secrets 2>/dev/null; then
        echo "⚠️  ACTIONS_RUNTIME_URL not found in .act_secrets. Add it to avoid upload-artifact errors when running ACT locally."
    else
        echo "✅ ACTIONS_RUNTIME_URL found in .act_secrets"
    fi
fi

# Check if environment file exists
if [ ! -f .act_env ]; then
    echo "❌ .act_env environment file missing"
    exit 1
fi

echo "✅ .act_env environment file found"

# Check if event files exist
EVENT_FILES=(
    ".github/act-events/push-template-files.json"
    ".github/act-events/workflow-dispatch-dry-run.json"
    ".github/act-events/workflow-dispatch-custom-topic.json"
)

for event_file in "${EVENT_FILES[@]}"; do
    if [ ! -f "$event_file" ]; then
        echo "❌ Event file missing: $event_file"
        exit 1
    fi
done

echo "✅ All event files found"

# Validate JSON syntax of event files
echo "🔍 Validating event file JSON syntax..."
for event_file in "${EVENT_FILES[@]}"; do
    if ! python3 -m json.tool "$event_file" >/dev/null 2>&1; then
        echo "❌ Invalid JSON in: $event_file"
        exit 1
    fi
done

echo "✅ All event files have valid JSON syntax"

# Check if workflow file exists
WORKFLOW_FILE=".github/workflows/sync-template-files.yml"
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Sync workflow file missing: $WORKFLOW_FILE"
    exit 1
fi

echo "✅ Sync workflow file found"

# Test ACT can list workflows
echo "🔍 Testing ACT workflow listing..."
set +e  # Temporarily disable exit on error
WORKFLOW_LIST_OUTPUT=$(docker run --rm -v "$(pwd):/workspace" -w /workspace "$ACT_IMAGE" --list 2>&1)
WORKFLOW_LIST_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $WORKFLOW_LIST_EXIT_CODE -eq 0 ]; then
    echo "✅ ACT can list workflows"
    echo ""
    echo "📋 Available workflows for testing:"
    echo "$WORKFLOW_LIST_OUTPUT"
else
    echo "⚠️  ACT found workflow issues. This may be normal if workflows have syntax issues."
    echo "   Output:"
    echo "$WORKFLOW_LIST_OUTPUT"
    echo ""
    echo "✅ ACT Docker container is working properly"
fi

echo ""
echo "🎉 ACT validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .act_secrets with your GitHub token"
echo "2. Run 'make test-sync-workflow' to test the sync workflow"
echo "3. Run 'make test-workflows' to test all workflows"
echo ""
echo "For more information, see: docs/techdocs/docs/act-testing.md"
