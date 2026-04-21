#!/bin/sh
set -e

# Force-rebuild lib dist files so the working tree is always up to date.
# Covers every lib package automatically — no changes needed when new libs
# are added under lib/.
pnpm run typecheck:libs:force

# Check whether the rebuild produced any changes in any lib/*/dist directory.
# Auto-stage changed files so the developer can re-run git commit immediately.
STAGED=0
for dist_dir in lib/*/dist; do
  [ -d "$dist_dir" ] || continue
  lib_name=$(echo "$dist_dir" | cut -d/ -f2)
  CHANGES=$(git status --porcelain -- "$dist_dir")
  if [ -n "$CHANGES" ]; then
    git add "$dist_dir"
    echo ""
    echo "ERROR: lib/$lib_name/dist/ contained stale or missing generated files."
    echo "       The fresh build has been staged for you."
    STAGED=1
  fi
done

if [ "$STAGED" = "1" ]; then
  echo ""
  echo "       Please re-run 'git commit' to commit the updated dist files."
  echo ""
  exit 1
fi
