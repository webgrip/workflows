#!/usr/bin/env bash
set -euo pipefail
# Static audit for GitHub workflows
# Checks:
#  - missing name
#  - duplicate job ids
#  - unpinned actions (@main or no @)
#  - docker image :latest usage (policy warning)
#  - empty 'on:' block

WF_DIR=".github/workflows"
ret=0

shopt -s nullglob
files=("$WF_DIR"/*.yml "$WF_DIR"/*.yaml)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No workflow files found" >&2
  exit 1
fi

warn() { printf "[WARN] %s\n" "$1"; }
err() { printf "[ERR ] %s\n" "$1"; ret=1; }

for f in "${files[@]}"; do
  base=$(basename "$f")
  content=$(<"$f")

  # name present
  if ! grep -Eq '^name:' <<<"$content"; then
    warn "$base: missing top-level name"
  fi

  # empty on block
  if grep -Eq '^on:\s*$' "$f"; then
    warn "$base: 'on:' block appears empty"
  fi

  # job ids duplication
  mapfile -t jobs < <(grep -E '^[A-Za-z0-9_-]+:' "$f" | grep -v '^on:' | grep -v '^name:' | awk -F: '{print $1}' | sed 's/^[ \t]*//' | sort)
  if [[ ${#jobs[@]} -gt 0 ]]; then
    dups=$(printf '%s\n' "${jobs[@]}" | uniq -d || true)
    if [[ -n $dups ]]; then
      err "$base: duplicate job ids: $(tr '\n' ' ' <<<"$dups")"
    fi
  fi

  # unpinned actions (naive)
  while IFS= read -r line; do
    uses=$(sed -E 's/^.*uses: *//; s/#.*$//' <<<"$line")
    if [[ $uses == *'@'* ]]; then
      ref=${uses##*@}
      if [[ $ref == 'main' || $ref == 'master' || $ref == 'latest' ]]; then
        warn "$base: unpinned uses => $uses"
      fi
    else
      warn "$base: uses without @ version => $uses"
    fi
  done < <(grep -E '\buses:' "$f")

  # docker images latest
  while IFS= read -r line; do
    img=$(sed -E 's/^.*image: *//; s/#.*$//' <<<"$line")
    if [[ $img == *':latest'* ]]; then
      warn "$base: image uses :latest => $img"
    fi
  done < <(grep -E '\bimage:' "$f")

done

exit $ret
