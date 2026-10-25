# Architectural Contract: Mathematical Relevance Scoring Engine

## 1. System Overview & Objective

The **Relevance Scoring Engine** delivers an explainable, deterministic $\mathcal{O}(N \times M)$ ranking pipeline for candidate issues discovered via GitHub API searches. It supersedes non-deterministic client-side shuffling (`Math.random()`) and rigid hardcoded query filters (`good first issue`), giving developers tailored matching across language skills, technology stacks, freshness, claim availability, and experience tiers.

```
                           +---------------------------+
                           |  UserProfile / Directive  |
                           |  (skills, exp_level)      |
                           +-------------+-------------+
                                         |
                                         v
   +--------------------+          +-----+------------------------+
   |  GitHub Search     |          |  Taxonomy Subsystem          |
   |  Raw Issue Pool    +--------->|  - Linguist Registry         |
   +---------+----------+          |  - Topic Synonyms Dictionary |
             |                     +-------------+----------------+
             v                                   |
   +---------+-----------------------------------+----------------+
   |            100-Point Mathematical Relevance Scorer           |
   |   S_lang (35) + S_tech (25) + S_recency (15) +               |
   |   S_competition (15) + S_difficulty (10) - Penalties         |
   +-----------------------------+--------------------------------+
                                 |
                                 v
   +-----------------------------+--------------------------------+
   |            Deterministic Ranking & Sorting Pipeline          |
   |   - useIssueDiscovery (hook)                                 |
   |   - DiscoveryPage (sort by relevance / recency / opp)        |
   |   - Threshold Filter (>= 50%, >= 70%, >= 85%)                |
   |   - Deterministic Pagination                                 |
   |   - IssueCard (Score Badge & 100-pt Breakdown Popover)       |
   +--------------------------------------------------------------+
```

---

## 2. Mathematical Definition

For any issue candidate $T \in \mathcal{T}$ and developer profile $P$:

$$\text{Relevance}(T, P) = \text{Clamp}\Big(0, 100, S_{\text{lang}}(T, P) + S_{\text{tech}}(T, P) + S_{\text{recency}}(T) + S_{\text{competition}}(T) + S_{\text{difficulty}}(T, P) - P_{\text{penalties}}(T)\Big)$$

### Component Scoring Weights

| Component                | Metric                     | Max Weight | Logic / Tiers                                                                     |
| :----------------------- | :------------------------- | :--------: | :-------------------------------------------------------------------------------- |
| $S_{\text{lang}}$        | Programming Language Match |   **35**   | Exact repo match: $35$, Label match: $30$, Keyword match: $21$, None: $0$         |
| $S_{\text{tech}}$        | Frameworks & Tools         |   **25**   | $\ge 2$ tool matches: $25$, $1$ tool match: $19$, None: $0$                       |
| $S_{\text{recency}}$     | Freshness / Activity       |   **15**   | $\le 7$d: $15$, $\le 30$d: $12$, $\le 90$d: $8$, $\le 180$d: $4$, $> 180$d: $0$   |
| $S_{\text{competition}}$ | Opportunity Availability   |   **15**   | $0$ comments: $15$, $1$ comment: $13$, $2$ comments: $10$, $3-5$: $6$, $> 5$: $2$ |
| $S_{\text{difficulty}}$  | Experience Alignment       |   **10**   | Beginner: `good first issue` ($10$), Senior: `architecture`/`RFC` ($10$)          |
| $P_{\text{penalties}}$   | Anti-pattern Deductions    |  Variable  | `wontfix`/`stale`: $-50$, Inactive repo $> 365$d: $-25$, Clutter $> 25$: $-10$    |

---

## 3. Data Contracts & Interfaces

Defined in `apps/web/src/types/relevance.ts`:

```typescript
export interface RelevanceScoreBreakdown {
  langScore: number;
  techScore: number;
  recencyScore: number;
  competitionScore: number;
  difficultyScore: number;
  penalties: number;
  total: number;
}

export interface ScoringWeights {
  languageWeight: number;
  techWeight: number;
  recencyWeight: number;
  competitionWeight: number;
  difficultyWeight: number;
}
```

---

## 4. Complexity & Performance

- **Time Complexity**: $\mathcal{O}(N \times M)$ where $N$ is candidate pool size ($N \le 100$) and $M$ is developer skill count ($M \le 25$).
- **Benchmarked Runtime**: Processing $100$ candidate issues against a multi-skill profile completes in under $1.5\text{ ms}$, ensuring 60 FPS UI responsiveness without web worker overhead.
- **Memory Footprint**: Transient objects are garbage collected after memoization in `useIssueDiscovery` and `useMemo` hooks.
