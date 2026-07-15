# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest `0.x` on `main` | ✅ |
| Older tags | ❌ — please upgrade |

## Reporting a vulnerability

Please use **GitHub private vulnerability reporting** on [boske-ai/grove-fit](https://github.com/boske-ai/grove-fit/security/advisories/new) when available.

Do **not** open a public issue for an unpatched vulnerability.

We aim to acknowledge reports within **14 days**.

## Product notes (v1)

- Fit calculations run **locally** (CLI, native companions, and the website calculator).
- **boske.dev/fit** does not upload hardware profiles.
- Grove Fit v1 does not include product telemetry.

## Scope guidance

In scope: secrets in the repo, unsafe deserialization of catalog/input, privilege issues in native detect bridges, supply-chain issues in release artifacts.

Out of scope: theoretical accuracy of RAM/VRAM heuristics (product judgment, not a security hole) unless it enables remote compromise.
