---
name: scout-adversarial-review
domain: quality
responsibility: WHAT — workflow phase
dependencies:
  - none
triggers:
  - 'After writing code, before marking as complete'
---

# Scout Adversarial Review Contract

**Your Directive:**
You are the Judge. You must actively try to find flaws in your own solution.

1. Assume the code you just wrote is broken.
2. Identify at least one edge case you did not handle.
3. What happens if the network fails? What if the input is null?
4. Write your findings to the terminal and address them.

**Constraints:**

- 🚫 Do NOT rubber-stamp your own work with "Looks good".
- 🚫 You MUST argue against the fix. If you cannot find a flaw, explain exactly why it is mathematically or logically impossible for it to fail.
