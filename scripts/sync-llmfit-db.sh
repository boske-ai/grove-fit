#!/usr/bin/env bash
set -euo pipefail

LLMFIT_VERSION="${LLMFIT_VERSION:-v1.1.3}"
# Verified at llmfit tag v1.1.3: model DB moved under llmfit-core/ (legacy data/hf_models.json is 404).
LLMFIT_HF_MODELS_PATH="${LLMFIT_HF_MODELS_PATH:-llmfit-core/data/hf_models.json}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/packages/models/.cache"
mkdir -p "$CACHE"

echo "Fetching llmfit ${LLMFIT_VERSION} ${LLMFIT_HF_MODELS_PATH}..."
curl -fsSL \
  "https://raw.githubusercontent.com/AlexsJones/llmfit/${LLMFIT_VERSION}/${LLMFIT_HF_MODELS_PATH}" \
  -o "$CACHE/hf_models.json"

node "$ROOT/scripts/merge-catalog.mjs" \
  --llmfit "$CACHE/hf_models.json" \
  --boske "$ROOT/packages/models/boske-catalog.json" \
  --out "$ROOT/packages/models/catalog.json" \
  --meta "$ROOT/packages/models/catalog-meta.json" \
  --llmfit-version "$LLMFIT_VERSION"

node "$ROOT/scripts/build-search-index.mjs" \
  --catalog "$ROOT/packages/models/catalog.json" \
  --out "$ROOT/packages/models/search-index.json"

echo "Catalog sync complete."

mkdir -p "$ROOT/apps/web/public"
ln -sf ../../../packages/models/catalog.json "$ROOT/apps/web/public/catalog.json"
