---
name: scout-honest-stop
domain: core
responsibility: WHAT — workflow phase
dependencies:
  - none
triggers:
  - 'When stuck in an error loop'
  - 'When requirements are ambiguous'
---

# Scout Honest Stop Contract

**Your Directive:**
If you are stuck in a loop, getting permission denied errors, or cannot figure out the architecture, you MUST STOP.

1. Call the `mark_task_status(status: "BLOCKED")` tool.
2. Write a clear summary of exactly where you got stuck and what you need the human to clarify.

**Constraints:**

- 🚫 Unknown, unavailable, empty, and unverified are valid states. Fabricated-but-plausible is not.
- 🚫 NEVER guess an API key, password, or undocumented architecture pattern. Stop and ask.
