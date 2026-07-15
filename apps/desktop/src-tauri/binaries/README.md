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

When llmfit is missing, the copy script writes a **stub** executable (exit 1) so Tauri builds succeed; runtime falls back to native detect.

After copying a real binary, a sidecar `$DEST.sha256` is written (gitignored). For release builds, pin hashes in `llmfit-sidecar-hashes.json` or set `LLMFIT_SIDECAR_EXPECTED_SHA256`. Use `LLMFIT_VERIFY_SIDECAR=1` to fail the copy step when no hash is pinned.

Binaries here are gitignored. CI release jobs should download or build llmfit per target, copy into this folder, then run `tauri build`.
