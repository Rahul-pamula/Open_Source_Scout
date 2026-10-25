# Phase 2 Changelog: Dynamic Query Generation & Skill Taxonomy Engine

## Overview

Phase 2 eliminates hardcoded, static issue queries across Open Source Scout. Prior to this phase, the discovery engine naively prepended `language:` to all skills (causing syntax errors on frameworks like React or Docker) and hardcoded `label:"good first issue"` for all developers regardless of senior or intermediate seniority.

With Phase 2 complete, Scout dynamically parses developer skills against canonical GitHub Linguist languages, maps frameworks to repository topics, calibrates label qualifiers according to developer experience tiers, enforces API query safety bounds, automatically relaxes queries on zero-result states, and exposes live telemetry for development auditing.

---

## Completed Issues & Milestones

### 1. Taxonomy & Canonical Language Registry

- **#358 (PR #438)**: Built canonical GitHub Linguist language registry dictionary (`linguistLanguages.ts`) with aliases.
- **#359 (PR #439)**: Added 100% test coverage for Linguist language validation, alias resolution, and normalization.
- **#360 (PR #440)**: Implemented `classifySkills` taxonomy utility partitioning flat skill arrays into languages, frameworks, and domains (`skillClassifier.ts`).
- **#361 (PR #441)**: Added comprehensive unit tests for `skillClassifier.ts` testing casing, deduplication, and fallback behavior.
- **#372 (PR #452)**: Created framework-to-topic synonym dictionary (`topicSynonyms.ts`) mapping top 30+ frameworks to official GitHub repository topics.
- **#373 (PR #453)**: Added unit test suite for `topicSynonyms.ts`.

### 2. Query Builder & Safety Constraints

- **#362 (PR #442)**: Implemented experience tier label qualifier mapper (`getLabelQualifiersForLevel`) in `queryBuilder.ts`.
- **#363 (PR #443)**: Implemented primary GitHub query builder `buildGitHubSearchQuery`.
- **#364 (PR #444)**: Added unit tests for `buildGitHubSearchQuery` asserting valid qualifiers and sorting options.
- **#365 (PR #445)**: Implemented automated fallback query generator `buildRelaxedGitHubSearchQuery`.
- **#366 (PR #446)**: Added unit tests for relaxed query builder.
- **#367 (PR #447)**: Implemented query validation and character sanitization (`validateGitHubQuery` and `sanitizeGitHubQuery`), guarding against 256-character and 5-qualifier limits.

### 3. Mission Control Integration & User Experience

- **#368 (PR #448)**: Replaced hardcoded `good first issue` query in `MissionControl.tsx` with dynamic query synthesis.
- **#369 (PR #449)**: Injected authenticated user `experience_level` into search options so candidate issues match developer tiers.
- **#370 (PR #450)**: Added subtle dev-only query telemetry inspector badge in `MissionControl.tsx`.
- **#371 (PR #451)**: Added automated query relaxation trigger on empty search results with toast notice banner.
- **#376 (PR #456)**: Extracted query state, relaxation, and telemetry into reusable custom hook `useIssueDiscovery.ts`, reducing `MissionControl.tsx` line count by over 100 lines.

### 4. Documentation & Architectural Guides

- **#374 (PR #454)**: Updated Issue Scanner user guide with dynamic query mechanics in `02_Issue_Scanner.md`.
- **#375 (PR #455)**: Authored comprehensive `github-query-engine.md` architectural guide with API limits, syntax rules, and lifecycle flowcharts.
- **#377 (PR #457)**: Compiled Phase 2 changelog and completed verification milestone.

---

## Verification Summary

- **Test Suite**: 66/66 passing tests (`npm test` in `apps/web`).
- **Build Verification**: Clean production build with Vite & TypeScript (`npm run build`).
- **Performance & Safety**: Zero broken routes or regressions; GitHub search queries guaranteed valid and bounded.
