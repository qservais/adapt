#!/bin/sh
# Check whether lib/api-client-react/dist/ is up to date with the source.
# Run *after* pnpm run typecheck:libs:force.
# Exits 1 when the rebuild produced changes (tracked or untracked files).
# Used by both the pre-commit hook and CI to enforce the same rule.

CHANGES=$(git status --porcelain -- lib/api-client-react/dist/)

if [ -n "$CHANGES" ]; then
  echo ""
  echo "ERROR: lib/api-client-react/dist/ is stale or missing generated files."
  echo "       Run 'pnpm run typecheck:libs:force' locally, commit the updated"
  echo "       dist files, and push again."
  echo ""
  echo "Changed files:"
  echo "$CHANGES"
  echo ""
  exit 1
fi
