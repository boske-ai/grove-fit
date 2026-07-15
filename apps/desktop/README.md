# Grove Fit Desktop (Tauri)

Native window for macOS, Windows, and Linux.

## Quick start

From **repo root**:

```bash
bun install
bun run gui
```

Equivalent:

```bash
cd apps/desktop && bun run dev
```

## What you get

- Boske tier grid (Seed → Forest) with fit badges
- Model search across 5,000+ catalog entries (exact count in [`packages/models/catalog-meta.json`](../../packages/models/catalog-meta.json))
- **Auto hardware detect** on macOS (sysctl + Metal unified memory)
- Bundled **llmfit sidecar** when staged; PATH llmfit or native detect otherwise

## Attribution

The optional bundled sidecar is [llmfit](https://github.com/AlexsJones/llmfit) (MIT). Grove Fit’s model catalog is also derived from llmfit exports. See [`THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) for the full notice and license text.

**Distribution:** any release that ships the llmfit sidecar binary must also ship llmfit’s MIT license notice (this file or an equivalent copy of the upstream LICENSE). Automated inclusion of that notice inside Tauri build artifacts is tracked as follow-up **D5** in the OSS readiness plan — not implemented in this effort.

## llmfit sidecar (dev)

Stage the platform binary before `tauri dev` / `tauri build`:

```bash
# from repo root
bash scripts/copy-llmfit-sidecar.sh
# or
cd apps/desktop && bun run prepare:sidecar
```

Install llmfit if needed: `brew install AlexsJones/llmfit/llmfit`, or set `LLMFIT_PATH=/path/to/llmfit`. Without a sidecar, native RAM/GPU probes still run.

## Production build

```bash
cd apps/desktop
bun run build
# .app / .dmg in src-tauri/target/release/bundle/
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `rustup` not configured | `rustup default stable` |
| Port 3847 in use | kill other `vite` / Grove Fit dev processes |
| Blank catalog | `bun run sync:catalog` at repo root |
