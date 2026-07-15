#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f packages/models/catalog.json ]]; then
  echo "Catalog missing — running sync…"
  bun run sync:catalog
fi

mkdir -p apps/web/public
ln -sf ../../../packages/models/catalog.json apps/web/public/catalog.json 2>/dev/null || true

echo ""
echo "  Grove Fit GUI"
echo "  ─────────────────────────────────────"
echo "  Native window (Tauri) — recommended"
echo "  Browser fallback:     bun run dev:web"
echo ""

cd apps/desktop
exec bun run dev
