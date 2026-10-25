# Issue Scanner

The Issue Scanner is your personal, real-time open-source discovery engine.

Instead of manually browsing GitHub or wading through noisy issue trackers, the Issue Scanner actively scans repositories and surfaces issues precisely calibrated to your verified skills and developer experience tier.

---

## Dynamic Query Synthesis Mechanics

The Scout search engine doesn't use hardcoded or generic search strings. Instead, it dynamically synthesizes search queries based on your Developer Profile:

### 1. Skill Taxonomy Classification

When you configure skills on your profile (e.g. `TypeScript`, `React`, `FastAPI`, `AI/ML`):

- **Programming Languages**: Verified against canonical GitHub Linguist language identifiers (e.g., `TypeScript`, `Python`, `Go`, `Rust`). Only true languages are injected into `language:XXX` qualifiers.
- **Frameworks & Libraries**: Matched against the topic synonym dictionary (e.g. `React` -> `react`, `FastAPI` -> `fastapi`, `Spring Boot` -> `spring-boot`).
- **Domains & Specializations**: Preserved for secondary relevance scoring (e.g. `AI/ML`, `DevOps`, `Cloud`).

### 2. Experience Level Calibration

Your chosen developer tier dictates how GitHub labels are queried:

- **Beginner**: Targets `label:"good first issue"`, ensuring accessible tickets with clear mentoring guidelines.
- **Intermediate**: Targets `label:"help wanted"`, surfacing community-assisted contributions and feature expansions.
- **Senior**: Operates without artificial entry-level label barriers, unlocking architectural overhauls, core subsystem features, performance optimizations, and refactoring tasks.

### 3. Automated Query Relaxation

If a strict query yields 0 candidate issues (for example, when a repository has closed its labeled beginner tickets), Scout automatically triggers a **Relaxed Query**:

- Broadens constraints by prioritizing your primary language.
- Relaxes strict label boundaries so you are never left with an empty screen.
- Emits a notification banner confirming the widened search parameter.

### 4. Query Length & API Safety

Every synthesized query undergoes automated validation:

- Enforces GitHub's 256-character search query ceiling.
- Enforces the 5-qualifier ceiling to prevent HTTP 422 Unprocessable Entity errors.
- Automatically consolidates secondary qualifiers when length thresholds are approached.

---

## Using the Issue Scanner in Mission Control

1. Navigate to **Mission Control** -> **Discovery**.
2. Click **Scan for Opportunities** (or let automated polling scan in the background).
3. Review discovered opportunities with real-time match scores and issue metadata.
4. Click **Engage** or **Add to Pipeline** to start tracking and working on the issue.
5. In development mode, check the **DEV TELEMETRY** badge above the workflow tabs to view the live GitHub query and candidate count.
