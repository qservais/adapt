#!/bin/sh
# Check whether every lib package with a dist/ directory is up to date with its
# source. Auto-discovers packages: any lib/ sub-directory that contains a
# dist/ directory is checked automatically, so new shared libraries are covered
# without any manual changes to this script.
#
# Run *after* pnpm run typecheck:libs:force.
# Exits 1 when the rebuild produced changes (tracked or untracked files) in any lib.
# Used by both the pre-commit hook and CI to enforce the same rule.

FAILED=0

for dist_dir in lib/*/dist; do
  [ -d "$dist_dir" ] || continue
  lib_name=$(echo "$dist_dir" | cut -d/ -f2)
  CHANGES=$(git status --porcelain -- "$dist_dir")
  if [ -n "$CHANGES" ]; then
    echo ""
    echo "ERROR: lib/$lib_name/dist/ is stale or missing generated files."
    echo "       Run 'pnpm run typecheck:libs:force' locally, commit the updated"
    echo "       dist files, and push again."
    echo ""
    echo "Changed files:"
    echo "$CHANGES"
    FAILED=1
  fi
done

if [ "$FAILED" = "1" ]; then
  echo ""
  exit 1
fi
