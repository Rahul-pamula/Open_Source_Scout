# Interview Defense System Architecture

The **Interview Defense System** bridges raw algorithmic issue scoring with executive communication, empowering developers to articulate and defend their open-source contributions during technical interviews.

---

## 1. System Overview & Objectives

In technical screenings, interviewers do not just evaluate code syntax; they evaluate **engineering judgement**:

- _Why did you pick this specific task out of thousands?_
- _How did you assess maintainer responsiveness and project viability?_
- _How did your solution integrate with the existing codebase without regressions?_

The system synthesizes the user's profile, the 100-point mathematical relevance breakdown, and repository metadata into structured elevator pitches, key talking points, and linked preparation notes.

```
+------------------------------------------------------------------------------------+
|                                    Scout Client                                     |
|                                                                                    |
|  [ NormalizedIssue ]  +  [ UserProfile ]  +  [ RelevanceScoreBreakdown ]           |
|                               |                                                    |
|                               v                                                    |
|           +-----------------------------------------------+                        |
|           |       interviewDefenseGenerator.ts            |                        |
|           |  - Elevator Pitch (30s opening hook)          |                        |
|           |  - 4 Structural Architecture Talking Points   |                        |
|           |  - Technical Keywords & Tags                  |                        |
|           +-----------------------------------------------+                        |
|                               |                                                    |
|         +---------------------+---------------------+                              |
|         |                                           |                              |
|         v                                           v                              |
|  [ DossierPanel ]                           [ PipelinePage ]                       |
|  - Defense Cheat-Sheet                      - Google Docs Home Launcher            |
|  - Copy-to-Clipboard Action                 - Inline Note URL Input & Validation   |
|                                             - Optimistic State Sync                |
+------------------------------------------------------------------------------------+
                                      |
                                      v HTTPS POST /functions/v1/tracking
+------------------------------------------------------------------------------------+
|                                Supabase Edge Layer                                 |
|                                                                                    |
|  tracking Edge Function                                                            |
|  - action: 'update_notes_url'                                                      |
|  - Auth verification via requireAuth(req)                                          |
|  - Invokes trackingService.updateNotesUrl()                                        |
+------------------------------------------------------------------------------------+
                                      |
                                      v
+------------------------------------------------------------------------------------+
|                                 Database Layer                                     |
|                                                                                    |
|  tasks table                                                                       |
|  - id (UUID PK)                                                                    |
|  - user_id (UUID FK)                                                               |
|  - interview_notes_url (TEXT nullable)                                             |
|  - updated_at (TIMESTAMPTZ)                                                        |
+------------------------------------------------------------------------------------+
```

---

## 2. Data Model & Schema

### 2.1 Database Schema

In Supabase PostgreSQL, the `tasks` table stores the persistent reference:

```sql
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS interview_notes_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_interview_notes_url
ON tasks (user_id, interview_notes_url)
WHERE interview_notes_url IS NOT NULL;
```

### 2.2 Client-Side Defense Interfaces

Defined in `apps/web/src/utils/interviewDefenseGenerator.ts`:

```typescript
export interface InterviewDefenseStrategy {
  /** Summary header for documentation */
  headline: string;
  /** 30-second conversational opening statement */
  elevatorPitch: string;
  /** Four structured talking points covering domain, relevance, scope, and tests */
  talkingPoints: string[];
  /** Core technologies and keywords to emphasize */
  technicalKeywords: string[];
}
```

---

## 3. Defense Talking Point Synthesis Engine

The synthesis pipeline executes deterministically in sub-millisecond time:

1. **Domain & Primary Language Extraction:** Resolves the developer's verified skills against the issue's primary language.
2. **Experience Tier Calibration:** Customizes tone for `Beginner`, `Intermediate`, or `Senior` tiers.
3. **Score Anchoring:** Quotes the exact 100-point relevance score (e.g., `92/100`), converting abstract numbers into concrete conversational evidence.
4. **Maintainer Empathy Framing:** Formulates arguments demonstrating that the candidate respected existing patterns, isolated change scope, and authored thorough regression tests.

---

## 4. URL Validation & Optimistic Sync

### 4.1 Client-Side Normalization

Before persistence, URLs are processed through `urlHelpers.ts`:

- Protocol auto-prefixing: `docs.google.com/...` -> `https://docs.google.com/...`
- Domain validation: `isValidWebUrl` checks protocol safety (`http:`, `https:`).
- Google Docs identification: `isValidGoogleDocsUrl` detects official Google Workspace URLs for tailored UI feedback.

### 4.2 Optimistic Updates

`PipelinePage.tsx` maintains local task state immediately upon submission, presenting visual feedback without waiting for network roundtrips. In the event of a network or auth error, the state reverts and an inline toast alerts the user.

---

## 5. Security & Privacy

1. **Authentication:** All note updates pass through `requireAuth(req)` in the Supabase Edge runtime, preventing unauthorized mutations.
2. **Safe Link Attributes:** All rendered external links use `rel="noopener noreferrer"` and `target="_blank"` to mitigate reverse tab-nabbing vulnerabilities.
3. **Protocol Whitelisting:** Disallows dangerous pseudo-protocols (e.g., `javascript:`, `data:`, `file:`) at validation time.
