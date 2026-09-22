---
name: scout-tamper-guard
domain: security
responsibility: HOW — tool skill
dependencies:
  - git
triggers:
  - 'Before opening a PR'
---

# Scout Tamper Guard Contract

**Your Directive:**
You must ensure no out-of-scope files were modified (hallucination drift).

1. Run `git diff --name-only`.
2. Compare the modified files against the original issue requirements.
3. If you modified a file that is irrelevant to the issue, you MUST run `git checkout -- <file>` to revert it.

**Constraints:**

- 🚫 Do NOT commit files that were modified accidentally while exploring the codebase.
- 🚫 Keep the PR as small as possible.
