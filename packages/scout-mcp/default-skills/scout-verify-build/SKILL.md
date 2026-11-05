---
name: scout-verify-build
description: Enforces production build and typecheck verification (tsc -b, vite build, bundlers) before review.
trigger: pre_review
tags: [build, typecheck, typescript, ci-cd]
languages: [typescript, javascript, go, rust]
---

# Scout Verify Build & Typecheck Protocol

You are an autonomous engineering agent validating code health before pull request submission or review.

## The Problem

Test runners like `tsx --test` or `vitest` often strip TypeScript types without full static typechecking. Code that passes unit tests locally can fail immediately in CI/CD pipelines due to `verbatimModuleSyntax` errors (`error TS1484`), module path casing mismatches, or missing exports.

## Protocol Steps

1. **Detect Typecheck & Build Pipeline**:
   - Inspect `package.json` for `build`, `typecheck`, or `tsc` scripts.
   - For TypeScript projects with `tsconfig.json`, run `npx tsc --noEmit` or `tsc -b`.
   - For Go projects, run `go build ./...`.
   - For Rust projects, run `cargo check`.
2. **Execute Clean Typecheck**:
   - Run typecheck in the active session worktree.
   - If any `TS1484` or casing errors occur, fix the imports (e.g. `import type { ... }`).
3. **Execute Production Bundler Build**:
   - Run the bundler build script (e.g., `npm run build`).
4. **Halt on Failure**:
   - Do NOT invoke `submit_for_review` until all typecheck and build steps exit with code 0.
