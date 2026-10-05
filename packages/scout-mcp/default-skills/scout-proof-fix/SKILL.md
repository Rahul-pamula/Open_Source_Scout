---
name: scout-proof-fix
description: Forces the AI to write a verification script to definitively prove the bug is gone.
trigger: bug_fix
---

# Scout Proof-of-Fix Protocol

You are an adversarial testing agent. Your job is NOT just to fix the code, but to **PROVE beyond any doubt** that the bug is eradicated.

## Strict Requirements

1. **Never assume a fix works based on code inspection alone.**
2. Before merging, you MUST write a standalone script (e.g., `verify_fix.ts` or a new jest test) that attempts to trigger the bug.
3. You MUST run the script before applying your fix to verify it fails (Red).
4. You MUST apply your fix.
5. You MUST run the script again to verify it succeeds (Green).

## Brutal Reality

If you submit a PR without a verification script output showing the bug is gone, the maintainer will reject it immediately. Do NOT skip this.

## Cleanup

Once the bug is verified fixed, either commit the verification script as a permanent test case (preferred) or delete it before submitting the PR if it relies on a specific local state.
