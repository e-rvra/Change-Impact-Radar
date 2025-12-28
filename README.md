# Change Impact Radar (GitHub Action)

Comments on Pull Requests with an **Impact Score (0–100)** and a 🟢/🟡/🔴 verdict based on **structural amplification vs change size**.

- **Zero config** by default (optional tuning via inputs)
- Supports **Python** and **JavaScript/TypeScript** repos (best-effort)
- **No code execution**. Only static parsing of files.
- Produces a **stable PR comment** (updates the same comment each run)

## What you get (in ~10 seconds)
A PR comment like:

- Impact Score: X/100 (🟢/🟡/🔴)
- Amplification Factor (AF)
- CSS / DRS / HCS sub-scores
- Top affected files by estimated reach
- Practical review/testing recommendations (factual, non-alarmist)

## Usage

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read

jobs:
  impact:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/change-impact-radar@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
