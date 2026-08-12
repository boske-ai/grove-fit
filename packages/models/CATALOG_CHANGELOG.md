# Catalog sync changelog

| Date | llmfit tag | Model count | Notes |
|------|------------|-------------|-------|
| 2026-06-19 | v0.9.30 | 5341 | First sync via `scripts/sync-llmfit-db.sh` |
| 2026-07-15 | v1.1.3 | 5744 | source `llmfit-core/data/hf_models.json`; schema compatible with v0.9.30 |
| 2026-08-06 | v1.1.3 | 5744 | No upstream change — re-projected to drop the unused `upstream` blob (8.84 MB → 3.40 MB, [GF17](../../docs/decisions.md)) |
