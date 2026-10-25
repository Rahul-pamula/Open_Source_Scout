# Profile State Synchronization Architecture

## 1. Overview & Data Flow

Open Source Scout tracks developer profile parameters (GitHub handle, bio, categorized skills, and experience level) to calibrate the automated issue scanner and AI dossier evaluator.

```mermaid
sequenceDiagram
    participant UI as User Interface (Identity / Onboarding)
    participant Svc as profileService.ts
    participant DB as Supabase PostgreSQL (public.users)
    participant Ctx as AuthContext.tsx
    participant MC as MissionControl.tsx (Discovery Engine)

    UI->>Svc: updateUserProfile(userId, { skills, experience_level, ... })
    Svc->>Svc: buildProfileUpdatePayload (Sanitize & Normalize)
    Svc->>DB: UPDATE public.users SET experience_level, skills, ...
    DB-->>Svc: Success Response (200 OK)
    Svc-->>UI: Resolution
    UI->>Ctx: updateExperienceLevel(level) (Optimistic Local State)
    UI->>Ctx: refreshProfile()
    Ctx->>DB: SELECT bio, skills, experience_level FROM public.users
    DB-->>Ctx: User Profile Row
    Ctx-->>MC: Reactive Context Broadcast (userProfile)
    MC->>MC: Trigger Dynamic GitHub Query Synthesis
```

---

## 2. Database Schema Contract

Defined in migration `20260907100000_add_experience_level.sql`:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS experience_level TEXT
CHECK (experience_level IN ('Beginner', 'Intermediate', 'Senior'));
```

### Normalization & Defensive Fallbacks

To ensure total backward compatibility for legacy users with null values:

- Any `NULL`, empty, or unrecognized string is normalized to `'Beginner'` by `normalizeExperienceLevel()`.
- Client context never surfaces an `undefined` or null experience tier.

---

## 3. Type System Integration

```ts
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Senior';

export interface UserProfile {
  bio: string;
  skills: string[];
  github_handle: string;
  automation_count_today: number;
  last_automation_date: string;
  custom_comment_enabled: boolean;
  custom_comment_text: string | null;
  experience_level?: ExperienceLevel;
}
```

---

## 4. Performance & Reactivity Guarantees

1. **Optimistic UI Updates**: Updating the experience tier in settings changes the in-memory state instantly, preventing UI stutter.
2. **Context Synchronization**: Calling `refreshProfile()` ensures all cross-cutting tabs (Mission Control, Pipeline, Dossier) re-render with fresh profile data.
3. **Decoupled Architecture**: `profileService.ts` encapsulates pure database operations, keeping presentation components testable and isolated.
