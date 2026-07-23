# llmfit sidecar (Tauri externalBin)

Platform binaries staged here are **[llmfit](https://github.com/AlexsJones/llmfit)** (MIT). See [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md) for Grove Fit’s consolidated third-party notice and the upstream license text.

Tauri bundles `llmfit` from this directory when a platform binary is present:

```
llmfit-<target-triple>          # macOS / Linux
llmfit-<target-triple>.exe      # Windows
```

Find your triple: `rustc --print host-tuple`

## Distribution requirement

Any Grove Fit release that ships a sidecar binary from this folder **must also ship llmfit’s MIT license notice** — use [`THIRD_PARTY_NOTICES.md`](../../../../THIRD_PARTY_NOTICES.md) or an equivalent copy of the upstream LICENSE alongside the distributed artifact.

Automated inclusion of that notice inside Tauri build bundles is tracked as follow-up **D5** in the OSS readiness plan; this PR documents the requirement only.

## Dev setup

From repo root (copies from PATH or `LLMFIT_PATH`):

```bash
bash scripts/copy-llmfit-sidecar.sh
```

Install llmfit if needed: `brew install AlexsJones/llmfit/llmfit`

When llmfit is missing, the copy script writes a **stub** executable (exit 1) so Tauri builds succeed; runtime falls back to native OS probes (no PATH `llmfit` fallback).

After copying a **real** binary, the copy script **requires** a pinned SHA256 — either a non-empty `hashes.<triple>` in [`llmfit-sidecar-hashes.json`](./llmfit-sidecar-hashes.json) or `LLMFIT_SIDECAR_EXPECTED_SHA256`. Mismatch fails the script. Missing/empty pins refuse the real binary and write a stub instead (so Intel/Linux/Windows builds without a pin still succeed). Stubs skip hash checks.

Maintainer release steps:

1. Install or build llmfit for the target triple.
2. Compute `shasum -a 256` of the binary and put it in `llmfit-sidecar-hashes.json` under `hashes.<triple>` (or export `LLMFIT_SIDECAR_EXPECTED_SHA256`).
3. Run `node scripts/copy-llmfit-sidecar.mjs` (or `FORCE_LLMFIT_SIDECAR=1` to refresh).
4. Run `tauri build`.

Binaries here are gitignored. A sidecar `$DEST.sha256` is also written locally (gitignored) for convenience.
