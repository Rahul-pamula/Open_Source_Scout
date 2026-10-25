# 100-Point Mathematical Relevance Scoring Engine

Open Source Scout uses an explainable, deterministic mathematical scoring engine to match developers with open source opportunities. Rather than arbitrary random shuffling or hardcoding `good first issue` filters for everyone, Scout ranks candidates using a rigorous multi-factor scoring formula.

---

## 1. Master Formula

Every candidate issue discovered by Scout is scored out of **100 potential points**:

$$\text{Relevance Score} = \text{Clamp}\left(0, 100, S_{\text{lang}} + S_{\text{tech}} + S_{\text{recency}} + S_{\text{competition}} + S_{\text{difficulty}} - P_{\text{penalties}}\right)$$

```
Total Relevance = Clamp(0, 100, S_lang + S_tech + S_recency + S_competition + S_difficulty - P_penalties)
```

---

## 2. Factor Breakdown

### 2.1 Language Alignment ($S_{\text{lang}} \in [0, 35]$)

Measures the match between the repository's primary programming language and your registered language skills (validated against GitHub Linguist):

- **35 Points (100%)**: Direct match between your language and repository primary language (e.g., `TypeScript` $\leftrightarrow$ `TypeScript`).
- **30 Points (85%)**: Language detected in issue labels (e.g., `label: python`).
- **21 Points (60%)**: Language mentioned in issue title or snippet.
- **0 Points**: No correlation.

### 2.2 Frameworks & Topics ($S_{\text{tech}} \in [0, 25]$)

Cross-references your framework skills (e.g., `React`, `Next.js`, `FastAPI`, `Docker`, `Tailwind`) against repository topics and issue labels using topic synonyms:

- **25 Points (100%)**: 2 or more technology/topic matches.
- **19 Points (75%)**: 1 technology/topic match.
- **0 Points**: No framework overlap.

### 2.3 Recency & Fresh Activity ($S_{\text{recency}} \in [0, 15]$)

Rewards actively maintained issues with recent author/maintainer engagement:

- **15 Points (100%)**: Updated within the last 7 days.
- **12 Points (80%)**: Updated within 8 – 30 days.
- **8 Points (50%)**: Updated within 31 – 90 days.
- **4 Points (25%)**: Updated within 91 – 180 days.
- **0 Points**: Inactive for over 180 days.

### 2.4 Opportunity & Competition ($S_{\text{competition}} \in [0, 15]$)

Evaluates whether an issue is accessible and unclaimed or overcrowded with discussion:

- **15 Points (100%)**: 0 comments (unclaimed opportunity).
- **13 Points (85%)**: 1 comment (initial triaging).
- **10 Points (65%)**: 2 comments.
- **6 Points (40%)**: 3 – 5 comments.
- **2 Points (15%)**: $> 5$ comments (high competition).

### 2.5 Experience Level Alignment ($S_{\text{difficulty}} \in [0, 10]$)

Aligns issue complexity markers with your profile's configured `experience_level`:

- **Beginner**:
  - 10 pts for `good first issue`, `starter`, `beginner`, `easy`.
  - 7 pts for `help wanted`, `documentation`.
  - 2 pts for advanced RFCs / architecture.
- **Intermediate**:
  - 10 pts for `help wanted`, `bug`, `enhancement`, `feature`.
  - 6 pts for entry-level labels.
- **Senior**:
  - 10 pts for `architecture`, `rfc`, `performance`, `security`, `core`.
  - 3 pts for trivial beginner typos.

---

## 3. Penalty Deductions ($P_{\text{penalties}} \ge 0$)

Scout automatically deducts points for anti-patterns:

- **$-50$ Points**: Issues flagged with `wontfix`, `invalid`, `duplicate`, or `stale`.
- **$-25$ Points**: Stale repositories with no commit activity for $> 365$ days.
- **$-10$ Points**: Extreme discussion clutter ($> 25$ comments).

---

## 4. UI Controls & Inspection

- **Relevance Badges**: Click or hover the badge on any card to view the exact point breakdown.
- **Score Threshold Filter**: Filter candidates by minimum score (e.g., $\ge 70\%$ or $\ge 85\%$).
- **Deterministic Sorting**: Sort candidates by Highest Relevance, Most Recent, or Lowest Competition.
- **Deterministic Pagination**: Browse candidates page-by-page without random shuffling.
