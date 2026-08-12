# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest `0.x` on `main` | ✅ |
| Older tags | ❌ — please upgrade |

## Reporting a vulnerability

Please use **GitHub private vulnerability reporting** on
[boske-ai/grove-fit](https://github.com/boske-ai/grove-fit/security/advisories/new).

> Maintainers: this requires *Settings → Security → Private vulnerability
> reporting* to be enabled. While it is off the link above does not accept
> reports, which leaves a researcher with no private channel.

Do **not** open a public issue for an unpatched vulnerability.

We aim to acknowledge reports within **14 days**.

## Product notes (v1)

- Fit calculations run **locally** (CLI, native companions, and the website calculator).
- **boske.dev/fit** does not upload hardware profiles.
- Grove Fit v1 does not include product telemetry.

## Dependency advisories

CI runs `bun run audit` on every push and pull request, and it **fails the build**
on any advisory that applies to a resolved version.

`bun audit` on its own flags a package whenever *some* release is affected, even
when the version we install is outside the vulnerable range. Left as a warning,
that trains everyone to ignore the job — so `scripts/audit-gate.mjs` re-checks
each advisory against the installed version and fails only on real ones.

Accepted exceptions live in the `ACCEPTED` map in that script, each with a reason
and a review date. Adding one is a deliberate, reviewable act; an empty map is
the goal.

Transitive fixes go in the root `overrides` block, which lets a patched
dependency land without a breaking upgrade of its parent.

### Known accepted: glib (Linux desktop only)

`GHSA-wrw7-89jp-8q8g` — unsound iterator impls in `glib` < 0.20. Reviewed
2026-08-12 and accepted:

- **Linux desktop builds only.** `glib` reaches the tree through
  `webkit2gtk`/`gtk`; a macOS build resolves zero references to it.
- **Not fixable from this repo.** The version is pinned by Tauri's GTK stack;
  `cargo update -p glib` finds nothing newer in range. It clears when Tauri
  migrates to gtk-rs 0.20.
- **Not reachable as written.** The unsoundness is in `GVariant` string
  iteration; Grove Fit parses no attacker-controlled GVariant data.

Re-check on each Tauri upgrade. The `cargo audit` CI step reports it as a
warning so it stays visible.

## Scope guidance

In scope: secrets in the repo, unsafe deserialization of catalog/input, privilege issues in native detect bridges, supply-chain issues in release artifacts.

Out of scope: theoretical accuracy of RAM/VRAM heuristics (product judgment, not a security hole) unless it enables remote compromise.
