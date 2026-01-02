# Change Impact Radar (GitHub Action)

A **structural change amplification detector** for Pull Requests.

Change Impact Radar comments on PRs with an **Impact Score (0–100)** and a 🟢/🟡/🔴 verdict,
highlighting changes whose **structural impact is disproportionate to their apparent size**.

It is designed as an **instrument**, not a decision engine.

---

## Key Properties

- **Zero-config by default** (uses `GITHUB_TOKEN` automatically)
- **Static analysis only** — no code execution
- **Domain-agnostic** (engineering, ML, finance, security, signal, CI)
- Produces a **stable PR comment** (updated on each run)
- CI-friendly **outputs** for automation and gating
- Safe to run on **external Pull Requests (forks)**

---

## What You Get (in ~10 seconds)

A Pull Request comment summarizing:

- **Impact Score** (0–100) with 🟢 / 🟡 / 🔴 verdict
- **Amplification Factor (AF)**  
  *(structural reach vs raw change size)*
- Sub-scores:
  - CSS — Change Size Score
  - DRS — Dependency Reach Score
  - HCS — Hotspot & Coupling Score
- Top affected files by estimated structural reach
- Factual, non-alarmist review guidance

This answers one question:

> *Does this change propagate structurally beyond what its size suggests?*

---

## Usage

### Recommended (safe & production-grade)

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: change-impact-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  impact:
    runs-on: ubuntu-latest
    steps:
      # Checkout PR code for analysis (read-only)
      - name: Checkout PR code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 1

      # Run a trusted, versioned release of the action
      - name: Change Impact Radar
        uses: your-org/change-impact-radar@v1


