#!/bin/sh
set -e

# Force-rebuild lib dist files so the working tree is always up to date.
pnpm run typecheck:libs:force

# Check for any changes in the dist directory after the rebuild: this covers
#   - tracked files whose content changed (modified/deleted)
#   - newly generated files that are not yet tracked by git
# Using git status --porcelain rather than git diff so that untracked new
# output files are also caught.
CHANGES=$(git status --porcelain -- lib/api-client-react/dist/)

if [ -n "$CHANGES" ]; then
  git add lib/api-client-react/dist/
  echo ""
  echo "ERROR: lib/api-client-react/dist/ contained stale or missing generated files."
  echo "       The fresh build has been staged for you."
  echo "       Please re-run 'git commit' to commit the updated files."
  echo ""
  exit 1
fi
