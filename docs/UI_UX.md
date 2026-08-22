# UI/UX Product Design System: Light, Precise, Technical

## 1. Executive Vision
The UI/UX of the Open Source Scout Agent is built on a simple but strict philosophy: **Light. Precise. Technical. Quiet. Action-oriented.**

The interface must make the **next useful action obvious** without cluttering the screen with unnecessary UI elements. We explicitly reject dark mode "hacker" aesthetics, generic SaaS dashboards, and overly gamified "AI-branded" tools (no sparkles, no floating blobs). 

The ultimate rule for Scout: **Scout should never look impressive at the expense of being useful.**

## 2. Core Product Design Principles

### Decision Density
Every screen must explicitly answer: **"What decision is the user supposed to make here?"** Then, show *only* the information required to make that decision.

*   **Discover:** Which issues should I explore? (Focal Point: `Discover Issues` CTA)
*   **Recommendations:** Which issue should I contribute to? (Focal Point: Best-matched issue)
*   **Issue Details:** Should I work on this issue? (Focal Point: `Open on GitHub` CTA)
*   **Repository:** Which contribution opportunity is best?
*   **Saved:** What should I work on next?
*   **Profile:** What does Scout know about my contribution capabilities?

### The Cognitive Hierarchy
**ACTION → RECOMMENDATIONS → WHY THIS ISSUE? → ACTION**

### High Information Density, Low Visual Density
Scout is an information-processing tool, not a marketing site. 
Show rich data (repository, tech stack, match explanation) concisely without relying on heavy borders, nested cards, or massive graphs that do not aid immediate decisions.

## 3. Light Theme Execution
The application uses a **warm/light technical interface** (not a stark, boring white SaaS dashboard).

*   **Background:** Warm off-white.
*   **Surfaces:** White content surfaces.
*   **Borders:** Very light, subtle borders.
*   **Primary Accent:** One restrained high-contrast accent (initially proposed as Emerald Green). This must be tested against text contrast, focus states, links, GitHub-related UI, and accessibility before locking. Do not let color become more important than the system.

### Visual Tooling Restraint
UI techniques are used strictly as functional tools:
*   **Glass + Minimalism:** The primary visual baseline.
*   **Neo-brutalism:** Used strictly for CTAs to provide **clear physical affordance**, not an aggressive visual style. Do not use loud borders or huge shadows. 
*   **Aurora:** Kept as an extremely subtle background atmosphere, never distracting.
*   **Neumorphism/Claymorphism:** Strictly limited to micro-interactions (e.g., toggles) or highlighting a selected card.

## 4. Typography Rules
Typography is structural. Do not let every piece of text compete.
*   **Page Title:** Strong, compact (Inter or Geist).
*   **Issue Title:** The strongest text on the card.
*   **Metadata:** Smaller + muted.
*   **Explanation:** Readable body text.
*   **Technical Data:** Monospace (JetBrains Mono or Fira Code).
*   **CTA:** Medium/Bold.

## 5. Spacing & Spatial Hierarchy
**Spacing must create hierarchy before borders, shadows, or color do.**
Prevent the implementation from becoming a collection of equally weighted boxes by using structural layout:

```text
Page
 ├── Heading
 │
 ├── Primary action
 │
 └── Results
      ├── Issue
      ├── Evidence
      └── Actions
```

## 6. Accessibility & System Health
**Accessibility is structural, not optional.**
*   WCAG-conscious contrast (minimum AA standard).
*   Visible keyboard focus for all interactive elements.
*   Never communicate state using color alone.
*   Readable minimum text sizes.
*   Buttons must have clear labels and interactive elements must have obvious states.

Errors do not show raw stack traces or red alerts. They use Brutalist, inline gray text (e.g., "RATE LIMIT: GitHub Search API cooling down.") with countdown timers.

## 7. Anti-Dashboard Junk Rules
Show information **only** when it helps the user decide or act. The following patterns are strictly banned:
*   ❌ "AI-powered" badges and sparkles (✨).
*   ❌ Giant statistics that do not aid immediate decisions.
*   ❌ Multiple competing CTAs of the same weight.
*   ❌ Huge empty hero sections or "Welcome back, User!" filler text.
*   ❌ Excessive gradients or cards nested inside cards.
*   ❌ Dumping raw backend API information without semantic filtering.

## 8. Core Component: The Issue Card
The recommended issue is the strongest reusable UI component in Scout. 
**The issue itself is the focal point.** The AI match score is supporting evidence, not the hero metric.

```text
┌─────────────────────────────────────────────────────┐
│ GOOD MATCH                              92%         │
│                                                     │
│ #1842  Add caching to API client                    │
│                                                     │
│ github.com/project/repo                             │
│                                                     │
│ Python    API    Redis                              │
│                                                     │
│ Why this matches                                    │
│ Your API + Python experience aligns with the        │
│ issue requirements.                                 │
│                                                     │
│ [ View Issue ]                         ○ Save       │
└─────────────────────────────────────────────────────┘
```
