#!/bin/bash
# Production startup script for ADAPT API
# Schema push and seed run before server start, but failures are non-fatal.

echo "=== ADAPT API — Démarrage production ==="

echo "→ Application du schéma base de données..."
pnpm --filter @workspace/db run push-force \
  && echo "✓ Schéma appliqué" \
  || echo "⚠  Schema push non-fatal — poursuite du démarrage"

echo "→ Initialisation des données de démonstration..."
pnpm --filter @workspace/api-server run seed \
  && echo "✓ Données initialisées" \
  || echo "⚠  Seed non-fatal — poursuite du démarrage"

echo "→ Démarrage du serveur API..."
exec node artifacts/api-server/dist/index.cjs
