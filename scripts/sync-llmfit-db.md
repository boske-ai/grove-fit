# sync-llmfit-db — catalog sync (monthly)

**Decision [GF2](../docs/decisions.md):** bump catalog **monthly** from a **pinned** llmfit release.

---

## Purpose

Produce `packages/models/catalog.json` — the **full** llmfit model list merged with Boske funnel fields. No runtime Hugging Face calls on boske.dev.

Current pin: [`packages/models/catalog-meta.json`](../packages/models/catalog-meta.json).

---

## Inputs

| Input | Source |
|-------|--------|
| Upstream models JSON | llmfit tag `LLMFIT_VERSION` — path from `LLMFIT_HF_MODELS_PATH` (default for **v1.1.3+**: `llmfit-core/data/hf_models.json`) |
| `boske-catalog.json` | This repo (hand-maintained; do not overwrite in sync) |

Legacy `data/hf_models.json` returns **404** on llmfit v1.x tags — do not invent alternate paths; update the script only after verifying the tagged tree.

---

## Manual sync

```bash
# uses script defaults (currently v1.1.3 + llmfit-core/data/hf_models.json)
bun run sync:catalog

# or pin explicitly
LLMFIT_VERSION=v1.1.3 bash scripts/sync-llmfit-db.sh
```

Pipeline:

1. `scripts/sync-llmfit-db.sh` — curl pinned export into `packages/models/.cache/`
2. `scripts/merge-catalog.mjs` — Boske overlay, `suggestedBoskeTier`, `searchTokens`, stable `id`
3. `scripts/build-search-index.mjs` — search index for web / CLI
4. Symlink `apps/web/public/catalog.json` → models package

Validate: `modelCount` remains large (GF3 — thousands, not a curated top-N).

---

## Release ritual (monthly)

1. Check llmfit releases: https://github.com/AlexsJones/llmfit/releases
2. **Probe the tagged tree** if the default source path 404s — never guess.
3. Set `LLMFIT_VERSION` (and `LLMFIT_HF_MODELS_PATH` only when verified).
4. Run `bun run sync:catalog`.
5. Review diff; append `packages/models/CATALOG_CHANGELOG.md`.
6. Bump `@boske-labs/grove-fit-models` patch version.
7. Open a PR — **do not publish npm** as part of sync.
8. Refresh Boske website vendor copies when `/fit` should pick up the new catalog.

---

## CI automation

[`.github/workflows/sync-catalog-monthly.yml`](../.github/workflows/sync-catalog-monthly.yml):

- Cron: 1st of month 09:00 UTC + `workflow_dispatch`
- Verifies the expected upstream path exists for the selected tag
- Runs sync + tests
- Opens a pull request (never pushes to `main`)
- Source/schema drift → **fail** (maintainer update required)

---

## Attribution

Catalog data is derived from llmfit (MIT). See [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
