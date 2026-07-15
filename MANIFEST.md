# Grove Fit — product notes

**Boske Labs** · MIT · powered by [llmfit](https://github.com/AlexsJones/llmfit)

## Purpose

Help people see which local models fit their machine — and gently route weak hardware toward Boske Cloud (**Breeze** / **Summit**) when local is a poor fit.

Trust: sizing is honest; [boske.dev/fit](https://boske.dev/fit) runs **client-side** (no hardware upload).

## We build / we refuse

| We build | We refuse |
|----------|-----------|
| TS fit engine aligned with Boske rules | Runtime Hugging Face scraping on the website |
| Full llmfit catalog sync (monthly) | Tiny curated-only catalog |
| **Grove Fit certified** on Boske local tiers | Certifying arbitrary third-party models (v1) |
| Soft funnel comparisons | Hard-blocking third-party results |
| Thin CLI around llmfit | Forking llmfit’s Rust engine |
| Summit (never “Ancient” in UI) | |

## Guardrails

- Pin catalog sync to an explicit llmfit release tag.
- Credit llmfit in UI, CLI, and [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).
- Do not drift tier thresholds without a dated note in [`docs/decisions.md`](./docs/decisions.md).
