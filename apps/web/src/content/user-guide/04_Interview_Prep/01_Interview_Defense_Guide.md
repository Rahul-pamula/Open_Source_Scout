# Interview Defense Workflow & Talking Points Guide

The **Interview Defense System** equips developers with structured, defensible arguments explaining _why_ they chose a particular open-source task and how their contribution directly demonstrates production engineering competence to hiring managers.

---

## 1. Why Interview Defense Matters

When discussing open-source contributions in technical interviews, engineers are frequently asked:

1. _"Why did you select this specific repository and issue?"_
2. _"How does this bug fix or feature relate to production software architecture?"_
3. _"How did you evaluate the risk, maintainer responsiveness, and codebase impact?"_

Rather than offering vague answers, Scout gives candidates a concrete, mathematically defensible rationale rooted in deterministic relevance scoring.

---

## 2. Core Defense Components

### 2.1 The 30-Second Elevator Pitch

A concise opening summary highlighting:

- The target repository and issue number
- The core language and technology stack
- The developer's experience tier and architectural focus
- Measurable impact on codebase reliability

> **Example:**  
> _"In facebook/react, I identified and resolved #28540 using TypeScript. I specifically targeted this issue because it directly demonstrates Senior-tier proficiency in production debugging, maintainer collaboration, and clean unit testing."_

### 2.2 Structured Architectural Talking Points

Each issue includes 4 defense arguments:

1. **Targeted Domain Alignment:** Explaining how the issue aligns with primary languages (e.g., TypeScript, Go, Python) and eliminates onboarding friction.
2. **Algorithmic Selection:** Citing the 100-point relevance score to prove the issue was selected based on recency, low contention, and maintainer responsiveness.
3. **Maintainer Empathy & Scope Isolation:** Emphasizing surgical changes, regression prevention, and non-breaking implementations.
4. **Production Readiness:** Showcasing reproduction steps, git commit cleanliness, and test validation.

---

## 3. Preparation Notes Integration

### 3.1 Dual-Action Document Linking

Within the **Pipeline Management** view, candidates can maintain live preparation notes for each tracked task:

- **`+ New Doc` Button:** Launches Google Docs home in a new tab (`https://docs.google.com/document/u/0/`) to create a fresh preparation document.
- **Notes URL Input:** Accepts Google Docs or Markdown URLs with instant client-side validation.
- **`Open Doc` Button:** Dynamically links to the saved preparation document.

### 3.2 Optimistic Persistence

Changes saved in the interview notes field update optimistically with inline status indicators and persist to Supabase via `update_notes_url`.

---

## 4. Tips for Technical Screenings

- **Copy Cheat-Sheet:** Use the **Copy Notes** button in the Dossier panel to export structured talking points directly into your scratchpad or preparation document.
- **Quantify Relevance:** Reference the arithmetic score breakdown (e.g., _"Scored 94/100 due to maintainer activity within 7 days and exact language alignment"_).
- **Emphasize Tests:** Mention that all PRs were validated against existing test suites with zero regressions.
