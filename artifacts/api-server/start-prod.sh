#!/bin/bash
# Production startup script for ADAPT API
# Migrations and seed run in the background so the server port opens immediately.

echo "=== ADAPT API — Démarrage production ==="

# Run schema push and seed in the background so the server can open port 8080 fast.
# Both operations are idempotent and non-destructive on an existing DB.
(
  echo "→ Application du schéma base de données..."
  pnpm --filter @workspace/db run push-force \
    && echo "✓ Schéma appliqué" \
    || echo "⚠  Schema push non-fatal — poursuite du démarrage"

  echo "→ Initialisation des données de démonstration..."
  pnpm --filter @workspace/api-server run seed \
    && echo "✓ Données initialisées" \
    || echo "⚠  Seed non-fatal — poursuite du démarrage"
) &

echo "→ Démarrage du serveur API..."
exec node artifacts/api-server/dist/index.cjs
