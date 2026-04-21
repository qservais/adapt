#!/bin/sh
set -e

# Force-rebuild lib dist files so the working tree is always up to date.
pnpm run typecheck:libs:force

# Check whether the rebuild produced any changes in any compiled lib dist dir.
# Auto-stage changed files here so the developer can re-run git commit immediately.
LIBS="lib/api-client-react lib/api-zod lib/db"
FAILED=0

for LIB in $LIBS; do
  CHANGES=$(git status --porcelain -- "$LIB/dist/")

  if [ -n "$CHANGES" ]; then
    git add "$LIB/dist/"
    echo ""
    echo "ERROR: $LIB/dist/ contained stale or missing generated files."
    echo "       The fresh build has been staged for you."
    echo "       Please re-run 'git commit' to commit the updated files."
    echo ""
    FAILED=1
  fi
done

exit $FAILED
