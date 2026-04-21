#!/bin/sh
set -e

# Force-rebuild lib dist files so the working tree is always up to date.
pnpm run typecheck:libs:force

# Check whether the rebuild produced any changes in lib/api-client-react/dist/
# (shared logic also used by CI). Auto-stage changed files here so the
# developer can re-run git commit immediately.
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
