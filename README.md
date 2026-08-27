# Open Source Scout 🎯

Open Source Scout is an AI Agent that helps you proactively find, track, and execute on open-source issues. Instead of aimlessly browsing GitHub, you configure your intent, and Scout's Mission Control takes over.

## 🚀 The Scout Lifecycle

Scout operates via a structured, agentic pipeline driven by **LLaMa3-8B** (via Groq) and **Supabase Edge Functions**.

### 1. Discovery (`EVALUATED`)
- Every 15 minutes, Scout batches recently opened GitHub issues matching your criteria.
- It uses Groq to analyze the issue body against your personal goals.
- If it's a strong match (e.g. >80%), it surfaces in your **Scouted Opportunities** feed.

### 2. Triage & Tracking (`DRAFTED` -> `ENGAGED`)
- When you save an issue, it drops into your **Mission Control Pipeline**.
- The contextual **Dossier Side Panel** breaks the issue down into undeniable GitHub Facts vs AI Analysis.
- Scout generates a contextual Draft comment based on your intent (e.g., "Ask for Assignment" or "Ask a Clarifying Question").
- **Human-in-the-loop:** You review, edit, and click "Post to GitHub". Scout posts the comment and moves the issue to `ENGAGED`.

### 3. Background Reconciliation & Claim AI (`ASSIGNED`)
- A background `pg_cron` job continuously monitors your active pipeline via the `global-sync` Edge Function.
- If a maintainer replies to an issue you are `ENGAGED` with, Scout passes the reply through an AI Claim Analyzer.
- If the AI determines the maintainer gave you permission (e.g., "Go ahead!", "Assigned to you"), Scout automatically transitions the pipeline state to `ASSIGNED`—completely bypassing formal GitHub UI assignments.

### 4. Execution (`COMPLETED`)
- Once `ASSIGNED`, the Dossier unlocks a **Contribution Checklist**:
  - `[ ]` Work Done
  - `[ ]` PR Sent
  - `[ ]` Merged
  - `[ ]` Issue Closed
- When you tick the **Merged** box, Scout completes the lifecycle and drops the issue into your `COMPLETED` archive.

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS, Vite
- **Backend:** Supabase (PostgreSQL, Edge Functions, pg_cron)
- **AI/LLM:** Groq (LLaMa3-8B)
- **Icons:** Lucide React

## 📦 Setup

1. Copy `.env.example` to `.env` and fill in your Supabase and Groq keys.
2. Run `npm install` in both the root and `/apps/web`.
3. Start the dev server with `npm run dev`.
