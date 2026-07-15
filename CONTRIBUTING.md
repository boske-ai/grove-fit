# Contributing to Grove Fit

Thanks for helping with hardware ↔ model fit for local AI.

## Setup

```bash
bun install
bun test
bun run conformance
```

| Command | Purpose |
|---------|---------|
| `bun run dev:web` | Web UI → http://127.0.0.1:3847 |
| `bun run gui` | Native Tauri window |
| `bun run build` | Build packages + CLI |
| `bun run test:e2e` | Playwright smoke |
| `bun run --cwd apps/mobile test` | Mobile plugin unit tests |
| `bun run sync:catalog` | Refresh catalog from pinned llmfit tag |

Optional: [llmfit](https://github.com/AlexsJones/llmfit) on PATH for richer scans; Rust/Tauri for desktop; Xcode/Android SDK for mobile.

## Pull requests

- Keep PRs small; update docs with behavior changes.
- Prefer tests first where they apply; fail fast (no silent fallbacks).
- Do **not** change Boske tier thresholds without a dated entry in [`docs/decisions.md`](./docs/decisions.md).
- Do **not** call Hugging Face at runtime on website paths — catalog is bundled JSON.
- Do **not** publish npm packages from casual PRs.
- User-facing cloud copy uses **Summit**, never **Ancient**.

## Catalog sync

1. Pin `LLMFIT_VERSION` (see [`scripts/sync-llmfit-db.md`](./scripts/sync-llmfit-db.md)).
2. `bun run sync:catalog`
3. Update `packages/models/CATALOG_CHANGELOG.md` and bump `@boske-labs/grove-fit-models` patch when shipping.
4. Open a PR (monthly CI opens PRs; it never pushes to `main`).

## License

Contributions are MIT ([`LICENSE`](./LICENSE)). No CLA. See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) and [`SECURITY.md`](./SECURITY.md).
