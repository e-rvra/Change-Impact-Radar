# Change Impact Radar — Technical Overview

## Purpose

Change Impact Radar is a **structural change amplification detector** for Pull Requests.

It provides a **fast, domain-agnostic signal** answering one question:

> *Does this change propagate structurally beyond its apparent size?*

The tool is designed as an **instrument**, not a decision engine.
It surfaces **signals**, leaving interpretation and action to humans or downstream CI logic.

---

## High-Level Architecture

Pull Request diff
↓
Static file scan
↓
Local dependency graph (best-effort)
↓
Structural metrics extraction
↓
CSS / DRS / HCS computation
↓
Impact Score + Verdict
↓
Stable PR comment + CI outputs

  
Key properties:
- Static analysis only
- No code execution
- Deterministic and explainable outputs
- Graceful degradation when data is incomplete

---

## Core Signals

Change Impact Radar combines **change size** and **structural propagation** into a single signal.

### Change Size Score (CSS)

CSS estimates the **raw magnitude** of a change:
- number of files touched
- volume of additions/deletions
- dispersion across the repository

CSS answers:
> *How big is the change, independently of structure?*

---

### Dependency Reach Score (DRS)

DRS estimates **structural propagation potential** by analyzing a local dependency graph.

It captures:
- how central the touched files are
- how far changes may propagate through dependencies
- relative reach compared to repository structure

DRS answers:
> *If this file changes, how much of the system could be indirectly affected?*

---

### Hotspot & Coupling Score (HCS)

HCS increases impact when changes affect:
- user-defined sensitive paths (hotspots)
- areas with higher coupling or interaction density

HCS answers:
> *Is the change touching structurally sensitive zones?*

---

### Amplification Factor (AF)

AF represents the **difference between structural impact and raw size**.

- Positive AF → small change, large structural reach
- Negative AF → large change, limited propagation

AF answers:
> *Is this change amplified or dampened by structure?*

---

## Final Impact Score & Verdict

The final **Impact Score (0–100)** combines CSS, DRS, and HCS into a single scalar signal.

A qualitative verdict is derived:
- 🟢 Low impact
- 🟡 Medium impact
- 🔴 High impact

The score is **comparative**, not an absolute truth.
It is designed to support prioritization, not automation of decisions.

---

## Outputs

Change Impact Radar exposes CI-friendly outputs:

- `impact_score`
- `verdict`
- `verdict_emoji`
- `css`
- `drs`
- `hcs`
- `af`
- `comment_url` (when applicable)

These outputs allow downstream jobs to:
- gate workflows
- build dashboards
- correlate with external signals

---

## What the Tool Does

- Analyzes code structure statically
- Estimates propagation through local dependencies
- Surfaces amplification patterns
- Updates a single, stable PR comment
- Works across domains and repositories

---

## What the Tool Does NOT Do

- Execute code
- Run tests
- Evaluate correctness or quality
- Measure performance or security issues
- Make business or deployment decisions
- Replace human review

---

## Language & Dependency Support

- Python: import-based dependency inference (best-effort)
- JavaScript / TypeScript: local import resolution (best-effort)

External dependencies, runtime wiring, and dynamic imports are intentionally excluded.

---

## Known Limitations

- Dependency graphs are partial by design
- Dynamic or runtime dependencies are not resolved
- Very large repositories may produce truncated graphs
- Scores are signals, not guarantees

When dependency data is unavailable, the tool **degrades gracefully** and relies on size-based signals only.

---

## Design Philosophy

Change Impact Radar is intentionally:
- **Domain-agnostic**
- **Non-prescriptive**
- **Explainable**
- **Hard to game**
- **Safe by default**

It is meant to be trusted as an **early warning instrument**, not as an automated judge.

---

## Intended Audience

- Software engineers
- ML / data engineers
- Security and reliability teams
- Quantitative and engineering pipelines
- CI/CD and platform teams

The same signal can be interpreted differently depending on context — by design.

---

## Summary

Change Impact Radar detects **structural amplification of change**.

It answers *“where should we look first?”*,  
not *“what should we do?”*.
