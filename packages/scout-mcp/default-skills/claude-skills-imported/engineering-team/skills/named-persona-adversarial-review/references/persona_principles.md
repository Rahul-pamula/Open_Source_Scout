# Persona Principles — sourced, with confidence levels

This file is the anti-fabrication backbone of the skill. Each persona's review lens must be grounded
in a **documented** principle listed here (or an equally verifiable source you find). Every attribution
carries a confidence level:

- **high** — the person is documented saying/demonstrating this, with the source named below.
- **moderate** — widely attributed and consistent with their body of work, but the exact wording/source
  is not pinned. Paraphrase; do not put it in quotation marks as if verbatim.
- **low / unknown** — you are inferring from their general reputation. Usable as a _lens_ to direct
  attention, but label it, and never present it as a quote.

> **Rule:** cite the principle, not an invented verbatim quote. If you cannot reach at least _moderate_
> confidence for a persona on the point you're making, drop that persona rather than fabricate.

---

## Engineers

### Linus Torvalds

- **"Good taste": eliminate the special case.** In his 2016 TED talk he walks through a linked-list
  deletion example where restructuring removes the conditional branch entirely — the special case
  _disappears_ rather than being handled. Use as a lens on branchy logic and data structures.
  _(confidence: high — TED, "The mind behind Linux," Feb 2016)_
- **"Never break userspace."** A long-standing, repeatedly stated kernel rule: a change that breaks
  existing user-space programs is a regression, full stop. Lens on backward compatibility / public APIs.
  _(confidence: high — documented across LKML; e.g. the 2012 "we do not break userspace" thread)_

### Ken Thompson

- **Trust boundaries — "you can't trust code you didn't totally create yourself."** The central thesis
  of his 1984 Turing Award lecture _Reflections on Trusting Trust_ (compiler backdoor). Lens on supply
  chain, third-party code, and input you didn't write. _(confidence: high — CACM, Aug 1984)_
- **Do one thing well.** The Unix philosophy of small, composable tools (McIlroy's formulation; Thompson
  co-created Unix and embodies it). Lens on functions/modules doing too much. _(confidence: high for the
  Unix philosophy; moderate as a *direct* Thompson quote — it is McIlroy's phrasing)_

### John Carmack

- **Measure before you optimize; optimization is craft, not guesswork.** Consistent across his .plan
  files, QuakeCon talks, and interviews — profile the real hot path rather than speculate. Lens on
  performance claims made without data. _(confidence: high as a documented stance; moderate on any
  specific verbatim wording)_

### Kent Beck

- **Simple design + "make it work, make it right, make it fast" (in that order).** From _Extreme
  Programming Explained_ (1999) and the XP simple-design rules (passes tests, reveals intent, no
  duplication, fewest elements). Lens on premature complexity and testability. _(confidence: high —
  *XP Explained*, Addison-Wesley, 1999)_

### Fred Brooks

- **Essential vs. accidental complexity.** From _No Silver Bullet_ (1986) and _The Mythical Man-Month_
  (1975): some complexity is inherent to the problem; some is self-inflicted by tooling/design. Lens on
  whether complexity in the diff is essential or accidental. _(confidence: high — IEEE Computer, 1987;
  MMM, 1975)_

---

## Product

### Steve Jobs

- **"Start with the customer experience and work backwards to the technology."** Stated on stage at
  WWDC 1997. Also "Design is not just what it looks like — design is how it works" (NYT Magazine, 2003).
  Lens on error surfaces, onboarding, and complexity the user is forced to absorb. _(confidence: high —
  WWDC 1997; NYT Magazine, Nov 30, 2003)_

### Marty Cagan

- **"Fall in love with the problem, not the solution."** Core theme of _Inspired_ (2008/2017) and
  _Empowered_ (2020), SVPG. Lens on scope creep, feature-first thinking, and goal misalignment.
  _(confidence: high — SVPG / *Inspired*)_

### Des Traynor (Intercom)

- **The first-run experience decides adoption; onboarding and messaging are product.** Documented across
  Intercom's _Onboarding_ writing and his talks. Lens on READMEs, quick-starts, first 30 seconds.
  _(confidence: high as Intercom's documented position; moderate on exact attribution to Traynor
  personally)_

---

## Theory basis (why multiple named lenses work)

- **Edward de Bono, _Six Thinking Hats_ (1985)** — deliberately switching perspective surfaces issues a
  single stance misses. The named personas are "hats" with documented content. _(confidence: high)_
- **Daniel Kahneman, _Thinking, Fast and Slow_ (2011)** — forcing an explicit, effortful (System 2)
  pass counters the fast, confirmation-biased read. Grounding + the integrity check are System-2 forcing.
  _(confidence: high)_
- **Richard Feynman, _Cargo Cult Science_ (Caltech commencement, 1974)** — "you must not fool yourself,
  and you are the easiest person to fool." The integrity check operationalizes this. _(confidence: high)_

---

## How to use this file during a review

1. Pick the personas per the Routing table in `SKILL.md`.
2. For each, take the principle(s) above as the lens **before** reading the code.
3. Every finding names the principle and a confidence level. If your point isn't covered here and you
   can't verify it by search to at least _moderate_, either find a persona whose documented principle
   _does_ cover it, or report the finding on its own technical merit without a name attached.
