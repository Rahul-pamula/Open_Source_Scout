---
name: scout-planner
domain: core
responsibility: WHAT — workflow phase
dependencies:
  - none
triggers:
  - 'When starting a new issue'
---

# Scout Planner Contract

**Your Directive:**
You are the Handoff Engine. Before writing any code, you MUST create or update the `.scout/STATE.md` file in the repository root.

1. Read the provided issue context.
2. Break the implementation down into a checklist in `STATE.md`.
3. You MUST check off boxes `[x]` as you complete steps.
4. Log the current `task_id` at the top of the file.

**Constraints:**

- 🚫 Do NOT start coding until `STATE.md` is written and approved.
- 🚫 Never assume previous steps were completed unless they are marked `[x]`.
