#!/bin/sh
# Check whether the dist/ directories of all compiled lib packages are up to date
# with their sources.
# Run *after* pnpm run typecheck:libs:force.
# Exits 1 when the rebuild produced changes (tracked or untracked files) in any lib.
# Used by both the pre-commit hook and CI to enforce the same rule.

LIBS="lib/api-client-react lib/api-zod lib/db"
FAILED=0

for LIB in $LIBS; do
  CHANGES=$(git status --porcelain -- "$LIB/dist/")

  if [ -n "$CHANGES" ]; then
    echo ""
    echo "ERROR: $LIB/dist/ is stale or missing generated files."
    echo "       Run 'pnpm run typecheck:libs:force' locally, commit the updated"
    echo "       dist files, and push again."
    echo ""
    echo "Changed files:"
    echo "$CHANGES"
    echo ""
    FAILED=1
  fi
done

exit $FAILED
