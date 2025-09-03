#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# act-run-all.sh
# Iterate all workflows under .github/workflows and execute those that declare
# the requested EVENT (default: push). Provides filtering, optional parallelism,
# dry-run, and summary reporting.
#
# Env Vars:
#   EVENT=push|pull_request|...   # GitHub event to simulate (default: push)
#   PARALLEL=1                    # Run in naive background mode
#   RUNNER_PLATFORM=linux/amd64   # Passed via -P
#   ACT_BIN=act                   # act binary name/path
#   INCLUDE="regex"              # Only run workflows whose filename matches
#   EXCLUDE="regex"              # Skip workflows whose filename matches
#   DRY_RUN=1                     # List what would run, don't execute
#   FAIL_FAST=1                   # Stop on first failure
#   EXTRA="..."                  # Extra args appended after user CLI args
# Usage:
#   EVENT=pull_request ./scripts/act-run-all.sh -j build
#   ./scripts/act-run-all.sh --events=push,pull_request,workflow_dispatch --dry-run
# -----------------------------------------------------------------------------
set -euo pipefail

EVENT=${EVENT:-push} # Fallback single event if per-workflow auto selection disabled
ACT_BIN=${ACT_BIN:-act}
PARALLEL=${PARALLEL:-0}
RUNNER_PLATFORM=${RUNNER_PLATFORM:-linux/amd64}
INCLUDE=${INCLUDE:-}
EXCLUDE=${EXCLUDE:-}
DRY_RUN=${DRY_RUN:-0}
FAIL_FAST=${FAIL_FAST:-0}
EXTRA=${EXTRA:-}
DEBUG=0
SCENARIO_DIR=${SCENARIO_DIR:-tests/workflows}
RUN_SCENARIOS=0

# ---------------------------------------------------------------------------
# Argument parsing (script-specific flags removed, others forwarded to act)
#   --events=a,b,c   Comma list preference order (default: push,pull_request,...)
#   --dry-run        Discover & report without executing
# Use -- to force remaining args to be passed through verbatim.
# ---------------------------------------------------------------------------
REQ_EVENTS=""
USER_ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --events=*)
      REQ_EVENTS="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --scenarios)
      RUN_SCENARIOS=1
      shift
      ;;
    --debug)
      DEBUG=1
      shift
      ;;
    --)
      shift
      # push rest then break
      while [[ $# -gt 0 ]]; do USER_ARGS+=("$1"); shift; done
      break
      ;;
    *)
      USER_ARGS+=("$1")
      shift
      ;;
  esac
done

# Supported event preference order when auto-selecting
if [[ -n $REQ_EVENTS ]]; then
  IFS=',' read -r -a EVENT_ORDER <<< "$REQ_EVENTS"
else
  IFS=',' read -r -a EVENT_ORDER <<< "push,pull_request,workflow_dispatch,workflow_call"
fi

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

WF_DIR=.github/workflows
[[ -d $WF_DIR ]] || { echo "ERROR: Workflows dir not found: $WF_DIR" >&2; exit 1; }

# collect .yml and .yaml (both)
mapfile -t WF < <(find "$WF_DIR" -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) | sort)
[[ ${#WF[@]} -gt 0 ]] || { echo "ERROR: No workflow files found" >&2; exit 1; }

command -v "$ACT_BIN" >/dev/null 2>&1 || { echo "ERROR: '$ACT_BIN' not in PATH" >&2; exit 127; }

printf 'Event: %s\n' "$EVENT"
printf 'Runner: %s\n' "$RUNNER_PLATFORM"
printf 'Files discovered: %d\n' "${#WF[@]}"

if [[ $DEBUG -eq 1 ]]; then
  echo "[debug] raw REQ_EVENTS='$REQ_EVENTS'"
  echo "[debug] EVENT_ORDER='${EVENT_ORDER[*]}'"
  echo "[debug] USER_ARGS: ${USER_ARGS[*]:-(none)}"
  echo "[debug] RUN_SCENARIOS=$RUN_SCENARIOS SCENARIO_DIR=$SCENARIO_DIR"
fi

extract_on_block() {
  awk 'BEGIN{in_on=0} /^on:/ {in_on=1; print; next} /^[^[:space:]]/ {if(in_on) exit} {if(in_on) print}' "$1"
}

workflow_supports_event() {
  local file=$1 evt=$2
  # Heuristics: look for event as top-level under on:, accounting for:
  # on: push
  # on: [push, pull_request]
  # on:
  #   push:
  #   pull_request:
  #   workflow_dispatch:
  # Also support quoted events.
  local on_block
  on_block="$(extract_on_block "$file")"
  grep -E "(^|[\[[:space:]])['\"]?${evt}['\"]?([[:space:]]*[:\],]|$)" <<< "$on_block" >/dev/null 2>&1
}

workflow_dispatch_requires_manual_inputs() {
  local file=$1
  # Return 0 (true) if workflow_dispatch has inputs with no defaults
  # Extract workflow_dispatch subsection
  extract_on_block "$file" | awk '/workflow_dispatch:/ {in=1;next} in && /^[^[:space:]]/ {in=0} in' | \
    awk 'BEGIN{req=0} /inputs:/ {in_inputs=1;next} in_inputs && /^[[:space:]]+[A-Za-z0-9_-]+:$/ {current=1; has_default=0; next} in_inputs && /default:/ {has_default=1} in_inputs && /^[[:space:]]+[A-Za-z0-9_-]+:$/ { if(current && !has_default) req=1; has_default=0 } END{ if(current && !has_default) req=1; exit(req?0:1) }'
  # awk exit 0 means required inputs; convert to shell semantics
  if [ $? -eq 0 ]; then return 0; else return 1; fi
}

select_event_for_workflow() {
  local file=$1 evt
  for evt in "${EVENT_ORDER[@]}"; do
    if workflow_supports_event "$file" "$evt"; then
      if [[ $evt == workflow_dispatch ]]; then
        if workflow_dispatch_requires_manual_inputs "$file"; then
          continue  # skip workflow_dispatch lacking defaults
        fi
      fi
      printf '%s' "$evt"
      return 0
    fi
  done
  return 1
}

has_workflow_call_only() {
  local file=$1
  local on_block
  on_block="$(extract_on_block "$file")"
  grep -q 'workflow_call' <<< "$on_block" || return 1
  # If any other known trigger appears, it's not "only"
  if grep -Eq '\b(push|pull_request|workflow_dispatch|schedule|release)\b' <<< "$on_block"; then
    return 1
  fi
  return 0
}

inject_synthetic_push() {
  local file=$1 outdir=$2 base newfile
  base=$(basename "$file")
  newfile="$outdir/$base"
  awk 'BEGIN{done=0} /^on:/ {print;print "  push:";done=1;next} {print}' "$file" > "$newfile"
  echo "$newfile"
}

should_skip_by_name() {
  local base=$1
  if [[ -n $INCLUDE && ! $base =~ $INCLUDE ]]; then return 0; fi
  if [[ -n $EXCLUDE && $base =~ $EXCLUDE ]]; then return 0; fi
  return 1
}

failures=()
passed=0
skipped=0

run_workflow() {
  local file=$1 name evt synthetic_dir synthetic_file
  name=$(basename "$file")

  if should_skip_by_name "$name"; then
    printf '[%s] SKIP (name filter)\n' "$name"; skipped=$((skipped+1)); return 0; fi

  if ! evt=$(select_event_for_workflow "$file"); then
    if has_workflow_call_only "$file"; then
      synthetic_dir=".act_temp/injected"
      mkdir -p "$synthetic_dir"
      synthetic_file=$(inject_synthetic_push "$file" "$synthetic_dir")
      file="$synthetic_file"
      evt="push"
      printf '[%s] Injected synthetic push trigger (workflow_call only)\n' "$name"
    else
      printf '[%s] SKIP (no supported event in %s)\n' "$name" "${EVENT_ORDER[*]}"
      skipped=$((skipped+1)); return 0
    fi
  fi

  printf '[%s] %s (event=%s)\n' "$name" "$([ "$DRY_RUN" = 1 ] && echo 'DRY-RUN' || echo 'Running')" "$evt"
  if [ "$DRY_RUN" = 1 ]; then return 0; fi

  if [[ $DEBUG -eq 1 ]]; then
    echo "[debug] invoking: $ACT_BIN $evt -W $file -P $RUNNER_PLATFORM ${USER_ARGS[*]} $EXTRA"
  fi
  if ! "$ACT_BIN" "$evt" -W "$file" -P "$RUNNER_PLATFORM" "${USER_ARGS[@]}" $EXTRA; then
    printf '[%s] FAIL (event=%s)\n' "$name" "$evt"
    failures+=("$name")
    if [ "$FAIL_FAST" = 1 ]; then return 1; fi
  else
    printf '[%s] OK (event=%s)\n' "$name" "$evt"
    passed=$((passed+1))
  fi
}

run_scenarios_for() {
  local file=$1 name scenarios_file wrapper_dir wrapper wf scenario_line scen_name expect status inputs_json trigger
  name=$(basename "$file")
  scenarios_file="$SCENARIO_DIR/${name%.yml}.scenarios.yml"
  [[ -f $scenarios_file ]] || return 0
  trigger=$(grep -E '^trigger:' "$scenarios_file" | awk '{print $2}')
  mapfile -t scenario_line < <(grep -n '^  - name:' "$scenarios_file" || true)
  if [[ ${#scenario_line[@]} -eq 0 ]]; then return 0; fi
  for line in "${scenario_line[@]}"; do
    scen_name=$(sed -E 's/.*name: *//' <<<"$line")
    inputs_json=$(awk '/inputs:/ {in=1;next} in && /^  - name:/ {exit} in {print}' "$scenarios_file" | sed 's/^ *//' | awk 'NF')
    expect=$(grep -A2 "name: *$scen_name" "$scenarios_file" | grep expect | head -1 | awk '{print $2}')
    wrapper_dir=".act_temp/scenarios"
    mkdir -p "$wrapper_dir"
    wrapper="$wrapper_dir/${name%.yml}__${scen_name}.yml"
    cat > "$wrapper" <<EOF
name: scenario-${scen_name}-${name}
on:
  push:
jobs:
  call:
    uses: ./.github/workflows/$name
    with:
EOF
    if grep -q '^    inputs:' "$scenarios_file"; then :; fi
    # naive: only simple key:value string inputs supported
    if grep -q 'inputs:' "$scenarios_file"; then
      while IFS= read -r kv; do
        [[ -z $kv ]] && continue
        key=${kv%%:*}
        val=$(sed -E 's/^[^:]+: *//' <<<"$kv")
        [[ -z $val ]] && continue
        printf '      %s: "%s"\n' "$key" "$val" >> "$wrapper"
      done < <(awk "/name: *$scen_name/,/expect:/" "$scenarios_file" | awk '/inputs:/ {in=1;next} in && /expect:/ {exit} in')
    fi
    printf '[%s] Scenario %s -> wrapper %s\n' "$name" "$scen_name" "$wrapper"
    if [ "$DRY_RUN" = 1 ]; then continue; fi
    if ! "$ACT_BIN" push -W "$wrapper" -P "$RUNNER_PLATFORM"; then
      status=fail
    else
      status=success
    fi
    if [[ $expect != $status ]]; then
      printf '[%s] Scenario %s EXPECT %s GOT %s\n' "$name" "$scen_name" "$expect" "$status"
      failures+=("scenario:${name}:${scen_name}")
    fi
  done
}

if [ "$PARALLEL" = 1 ]; then
  pids=()
  meta=()
  for f in "${WF[@]}"; do
    run_workflow "$f" &
    pids+=("$!" )
    meta+=("$f")
  done
  for i in "${!pids[@]}"; do
    if ! wait "${pids[$i]}"; then
      : # already captured
    fi
  done
else
  for f in "${WF[@]}"; do
    if ! run_workflow "$f"; then break; fi
  done
fi

echo
echo 'Summary:'
printf '  Passed : %d\n' "$passed"
printf '  Skipped: %d\n' "$skipped"
printf '  Failed : %d\n' "${#failures[@]}"
if [[ $passed -eq 0 && ${#failures[@]} -eq 0 && $skipped -gt 0 ]]; then
  # Detect if workflows are only workflow_call
  if grep -L 'workflow_call' "${WF[@]}" >/dev/null 2>&1; then :; else
    if [[ " ${EVENT_ORDER[*]} " != *" workflow_call "* ]]; then
      echo "Hint: Workflows appear to only declare 'workflow_call'. Add --events=workflow_call to run them."
    fi
  fi
fi
if [ ${#failures[@]} -gt 0 ]; then
  printf '  Failed list:%s' "\n"
  printf '    - %s\n' "${failures[@]}"
  exit 1
fi
exit 0
