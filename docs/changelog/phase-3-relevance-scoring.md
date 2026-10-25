# Phase 3 Milestone Changelog: 100-Point Mathematical Relevance Scoring Engine

**Milestone Completion**: Phase 3 (GitHub Issues #378 – #397, Issues 41 – 60)  
**Deliverable**: Explainable, deterministic mathematical relevance scoring and ranking engine replacing non-deterministic random shuffles and hardcoded label qualifiers.

---

## 1. Summary of Changes

### 1.1 Types & Scoring Pipeline Core

- **`apps/web/src/types/relevance.ts` (#378 / PR #458)**: Defined `RelevanceScoreBreakdown`, `ScoringWeights`, `DEFAULT_SCORING_WEIGHTS`, and `IssueScoringTarget`.
- **`apps/web/src/utils/relevanceScorer.ts` (#379 – #385 / PRs #459 – #465)**:
  - $S_{\text{lang}} \in [0, 35]$: Evaluates exact repository language matches, label mentions, and keyword search.
  - $S_{\text{tech}} \in [0, 25]$: Cross-references framework synonyms and topic taxonomy against repository metadata.
  - $S_{\text{recency}} \in [0, 15]$: Time-decay scoring across $\le 7$d, $\le 30$d, $\le 90$d, $\le 180$d tiers.
  - $S_{\text{competition}} \in [0, 15]$: Inversely scores comment competition for unclaimed opportunities.
  - $S_{\text{difficulty}} \in [0, 10]$: Matches developer experience tiers (Beginner, Intermediate, Senior) with issue complexity markers.
  - $P_{\text{penalties}} \ge 0$: Point deductions for stale repositories ($>365$d), wontfix/invalid tags, and comment clutter.
  - Master pipeline `calculateRelevanceScore(target, profile)` returning clamped total $[0, 100]$.

### 1.2 Deterministic Ranking & Discovery Architecture

- **`apps/web/src/hooks/useIssueDiscovery.ts` (#387 / PR #467)**: Replaced `0.5 - Math.random()` shuffle with deterministic descending sort by `relevanceScore` and recency tie-breaking.
- **`apps/web/src/components/IssueCard.tsx` (#388, #389 / PRs #468, #469)**:
  - Added visual color-coded relevance score badge (Emerald $\ge 80\%$, Amber $\ge 50\%$, Zinc $< 50\%$).
  - Implemented interactive popover detailing the exact 100-point breakdown across all 5 factors and deductions.
- **`apps/web/src/pages/DiscoveryPage.tsx` (#390 – #392 / PRs #470 – #472)**:
  - Added sorting selector ("Highest Relevance", "Most Recent", "Lowest Competition").
  - Added relevance threshold filter slider (All, $\ge 50\%$, $\ge 70\%$, $\ge 85\%$).
  - Added deterministic pagination preserving sorted ranking order.

### 1.3 Quality Assurance, Performance & Documentation

- **`apps/web/src/utils/relevanceScorer.test.ts` (#386 / PR #466)**: 27 comprehensive unit test cases verifying factor math, clamping, and edge cases.
- **`apps/web/src/components/IssueCard.test.ts` (#393 / PR #473)**: Component-level presentation tests for badges and breakdown data.
- **`apps/web/src/content/user-guide/03_V1_Cloud_Dashboard/05_Relevance_Scoring_Engine.md` (#394 / PR #474)**: End-user documentation for scoring mechanics.
- **`docs/architecture/relevance-scoring-engine.md` (#395 / PR #475)**: Technical architecture specification and complexity analysis.
- **`apps/web/src/utils/relevanceBenchmark.test.ts` (#396 / PR #476)**: Performance benchmark evaluating 1,000 issues in $\sim 42\text{ ms}$ ($< 0.05\text{ ms}$ per issue).

---

## 2. Test Verification

- **Total Unit & Integration Tests**: 98 passing tests (100% pass rate).
- **TypeScript & Production Build**: 0 type errors, 0 warnings.
- **Benchmarked Execution**: 1,000 issues scored in $42.7\text{ ms}$.
