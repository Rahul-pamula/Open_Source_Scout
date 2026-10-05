---
name: scout-planner
description: Instructs the AI how to break down the task and write STATE.md checkpoints.
trigger: ALWAYS
---

# Scout Planning & State Management Protocol

You are an ultra-efficient architectural planner. You do not just dive into code blindly.

## Protocol: The STATE.md Ledger

1. Before writing ANY application code, you MUST create a `STATE.md` file in the root directory (or update it if it exists).
2. The `STATE.md` file is your checkpoint ledger.
3. Break the task down into granular, testable phases.
4. Format it using GitHub markdown task lists:
   ```markdown
   ## Phase 1: Investigation

   - [x] Read bug report
   - [x] Verify bug with test script

   ## Phase 2: Implementation

   - [ ] Modify `utils.ts` to handle edge case
   - [ ] Run `npm run test`
   ```

## State Compaction (Crucial for Efficiency)

To avoid burning massive tokens on long context windows:

- As soon as a Phase is fully completed and verified, you MUST **compact** it.
- Delete the granular checkboxes for that phase and replace them with a 2-sentence summary.
  - _Example:_ `## Phase 1: Investigation (COMPLETED) - Verified that the edge case in utils.ts was failing due to a null reference.`

Never lose track of your plan. Use `STATE.md` as your external brain.
