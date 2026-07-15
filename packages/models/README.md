# @boske-labs/grove-fit — models

Catalog data for search and fit.

| File | Maintained by |
|------|----------------|
| `boske-catalog.json` | Hand (Boske tiers + cloud) |
| `catalog.json` | Generated — **full** llmfit export + merge |
| `catalog-meta.json` | Generated — pin + sync date |
| `search-index.json` | Generated — optional MiniSearch blob |

## Sync

Monthly via [`../../scripts/sync-llmfit-db.md`](../../scripts/sync-llmfit-db.md).

**Decision GF3:** include all models from llmfit (200+), not a subset.

## Certified badge

Only entries with `"groveFitCertified": true` in `boske-catalog.json` (local Boske tiers).

Third-party entries in `catalog.json` get `suggestedBoskeTier` for funnel UI only.
