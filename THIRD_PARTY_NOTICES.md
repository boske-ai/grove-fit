# Third-party notices

Grove Fit (MIT — see [`LICENSE`](./LICENSE)) incorporates or redistributes work from other open-source projects. Ordinary npm/Bun dependencies remain licensed under their package manifests; this file highlights **upstream work that is redistributed as data or binaries**.

## llmfit

- **Project:** [llmfit](https://github.com/AlexsJones/llmfit) by Alex Jones
- **License:** MIT
- **Pinned catalog release:** see [`packages/models/catalog-meta.json`](./packages/models/catalog-meta.json) (`llmfitVersion`)
- **Catalog source (v1.1.3+):** `llmfit-core/data/hf_models.json` in the upstream tag
- **Changelog:** [`packages/models/CATALOG_CHANGELOG.md`](./packages/models/CATALOG_CHANGELOG.md)

### How Grove Fit uses llmfit

1. **Model catalog data** — `packages/models/catalog.json` and `packages/models/search-index.json` are derived from the pinned llmfit model export, merged with the Boske overlay (`boske-catalog.json`).
2. **Optional native CLI** — when installed on PATH, the Grove Fit CLI and desktop detect path may invoke the `llmfit` binary.
3. **Optional Tauri sidecar** — desktop builds may stage a platform `llmfit` binary under `apps/desktop/src-tauri/binaries/` via `scripts/copy-llmfit-sidecar.sh`. **Any distribution that ships that binary must also ship llmfit’s MIT license notice** (this file or an equivalent copy of the upstream LICENSE).

### llmfit MIT license text (from tag `v1.1.3`)

```
MIT License

Copyright (c) 2026 Alex Jones

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Other runtime dependencies

Grove Fit also depends on MIT / Apache-2.0 libraries such as React, Vite, MiniSearch, Tauri, and Capacitor. Their licenses ship with the package manager lockfile and individual package LICENSE files. This notice does **not** reproduce every transitive license.
