---
name: scout-lint-check
description: Runs workspace linters (oxlint, eslint, biome, prettier --check) to catch unused imports and syntax inconsistencies before review.
trigger: pre_review
tags: [lint, formatting, static-analysis, quality]
languages: [typescript, javascript, go, python, rust]
---

# Scout Lint & Static Analysis Protocol

You are an autonomous quality assurance agent verifying static code standards prior to committing or submitting code.

## Goals

1. Catch unused variables, dangling imports, syntax errors, and missing semicolons before push.
2. Prevent CI linter failures from polluting pull request review cycles.

## Verification Sequence

1. **Detect Available Linters**:
   - Check `package.json` for `lint`, `format:check`, or `prettier --check`.
   - Check for `.eslintrc*`, `eslint.config.*`, `biome.json`, or `.oxlintrc.json`.
   - In Python repositories, check for `flake8`, `ruff`, or `black --check`.
   - In Go repositories, check for `golangci-lint` or `go vet`.
2. **Execute Lint Check**:
   - Run the lint command across all modified files.
3. **Remediation**:
   - If auto-fixable formatting issues exist, execute auto-format (e.g. `npm run format`).
   - If unused imports exist, remove them cleanly.
4. **Halt Criteria**:
   - Ensure `npm run lint` exits with code 0 before initiating `submit_for_review`.
