# Security & Trust

This document describes the **security properties and trust boundaries**
of the Change Impact Radar GitHub Action.

The goal is to make it clear **what the action does, what it does not do,
and why it is safe to run on Pull Requests**, including from forks.

---

## Threat Model

Change Impact Radar is designed to operate safely in the context of
untrusted Pull Requests.

**Assumptions:**
- Pull Request code may be malicious
- Contributors may be external (forks)
- CI runners must not execute untrusted code

---

## Security Design

### 1. No Code Execution

The action **never executes code from the repository**.

- No build
- No test
- No script execution
- No dependency installation

All analysis is performed using **static file inspection only**.

---

### 2. Static Analysis Only

Files are treated as plain text.

- No evaluation
- No dynamic imports
- No runtime resolution
- No reflection or execution paths

This prevents arbitrary code execution vectors.

---

### 3. Trusted Action Code

The action is executed from a **versioned release** (e.g. `@v1`).

It is **not executed from the Pull Request code itself**.

This ensures that untrusted contributors cannot modify the code being executed
by the CI runner.

---

### 4. Safe PR Event Handling

The recommended configuration uses the `pull_request_target` event.

- The action runs in the context of the base repository
- The PR code is checked out **read-only** for analysis
- No secrets are exposed to PR code

This configuration prevents common GitHub Actions attack vectors.

---

### 5. Minimal Permissions

The action requires only:

- `contents: read`
- `pull-requests: write`

No additional permissions are needed.

---

## Data Handling

- No data is sent to external services
- No network calls are performed
- No telemetry or tracking is included
- All processing happens within the GitHub runner

---

## Determinism & Reproducibility

- Analysis is deterministic for a given PR state
- Results do not depend on external systems
- Re-running the action on the same commit yields identical outputs

---

## Known Limitations

- Dependency graphs are best-effort and partial
- Dynamic or runtime dependencies are not resolved
- Large repositories may result in truncated graphs

These limitations affect **signal completeness**, not security.

---

## Trust Summary

Change Impact Radar is safe to run on:
- Internal Pull Requests
- External Pull Requests from forks
- Public and private repositories

It is designed as a **read-only, non-executing analysis tool**
with minimal permissions and a clear trust boundary.

---

## Reporting Security Issues

If you discover a security issue, please report it responsibly via:
- GitHub Issues (security label), or
- Private disclosure if required by your organization

We take security concerns seriously.
