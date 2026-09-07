# Open Source Scout 🎯

## What is Open Source Scout?

Open Source Scout is an autonomous open-source contribution discovery and engagement agent. Instead of aimlessly browsing GitHub for issues you can solve, you configure your intent, and Scout's Mission Control takes over to find and help you engage with open-source opportunities.

## Why does it exist?

Finding high-quality, relevant open source issues that match your skill set is incredibly time-consuming and often discouraging. Scout solves this by acting as a filter and engagement layer, automating the tedious discovery phase and streamlining the communication process, so you can focus exclusively on writing code.

## Features

- **Client-Driven Automation:** Automate discovery and initial engagement (like asking to be assigned) with full control over the pace.
- **Context-Aware AI Drafts:** Generates draft comments based on issue context, using Groq (LLaMa3-8B).
- **Tabbed Pipeline UI (Mission Control):** A clear state machine to track your contributions (Discovery, Claimed, Assigned, Review, Dropped).
- **Contribution Checklists:** Built-in checklists to track execution steps (PR Sent, Merged, etc.) for assigned issues.
- **Optimistic UI:** Fast, responsive UI that immediately reflects state changes while syncing asynchronously with the backend.

## Architecture

```text
Browser
  |
  +--> React/Vite Application (Frontend)
  |
  +--> Supabase Auth (Authentication)
  |
  +--> Supabase Edge Functions (Serverless Backend)
  |       |
  |       +--> GitHub API (Fetch issues, post comments)
  |       +--> AI/Groq (Evaluate intent, draft comments)
  |
  +--> Supabase Database (State and rate limit tracking)
```

## BYOS (Bring Your Own Supabase) Architecture

Every deployment of Open Source Scout is fully decentralized. **Each developer uses their own Supabase project and GitHub OAuth App.** There is no central database storing everyone's data. You own 100% of your data and API execution costs.

## Authentication

Scout uses **GitHub OAuth** orchestrated through **Supabase Auth**.

- The frontend initiates the OAuth flow via Supabase Auth.
- Supabase Auth redirects you to GitHub.
- GitHub redirects back to your Supabase Auth callback.
- Supabase Auth redirects you back to your deployed frontend.

## Setup

### 1. Create a Supabase Project

Go to [supabase.com](https://supabase.com), create an account, and start a new project.

### 2. Configure GitHub OAuth App

In GitHub, create an OAuth App (Settings -> Developer Settings -> OAuth Apps):

- **Homepage URL:** The URL of your frontend deployment (e.g. `https://<your-username>.github.io/<your-repo>/`)
- **Authorization callback URL:** `https://<your-project>.supabase.co/auth/v1/callback`

### 3. Configure Supabase Auth

In your Supabase Dashboard, go to **Authentication -> Providers -> GitHub** and paste your GitHub Client ID and Client Secret.
Then go to **Authentication -> URL Configuration**:

- **Site URL:** The URL of your frontend deployment (e.g. `https://<your-username>.github.io/<your-repo>`)
- **Redirect URLs:** Add a wildcard URL (e.g. `https://<your-username>.github.io/<your-repo>/*`)

### 4. Deploy Database & Edge Functions

Use the Supabase CLI to push the schema and Edge Functions to your project:

```bash
supabase link --project-ref <your-project-id>
supabase db push
supabase functions deploy
```

Set your secrets (like `GITHUB_TOKEN` and `GROQ_API_KEY`) using `supabase secrets set`.

### 5. Frontend Setup

Run the frontend locally:

```bash
npm install
npm run dev --workspace=apps/web
```

When you open the frontend, click "Connect Backend" and paste your Supabase Project URL and Anon Key.

## Mission Control

The Mission Control UI organizes your issues into a tabbed pipeline:

- **Discovery:** Newly scouted issues ready for evaluation.
- **Claimed/Engaged:** Issues you have asked to be assigned to.
- **Assigned:** Issues the maintainer has assigned to you. Unlocks the contribution checklist.
- **Review:** Issues where you have submitted a PR.
- **Completed / Dropped:** Archived issues.

## Automation & Rate Limits

Automation is **client-driven**. From the Automation tab, you can instruct your browser to batch process discovered issues.

- **Rate Limit:** To prevent spamming open source repositories, automation is strictly limited to **25 issues per day** globally across your account.
- **Enforcement:** Rate limits are enforced at the Edge Function level (`engage`) and tracked in the `users` database table.

## Manual Claims

For issues you want to handle personally, you can use **Context-Aware AI Drafts**. The backend will generate a tailored draft comment, which you can review, edit, and post directly from the UI.

## Troubleshooting

- **"The redirect_uri is not associated with this application" (GitHub OAuth error):** You pasted your frontend URL into the GitHub OAuth App's "Authorization callback URL" field instead of your Supabase callback URL. Update it to `https://<your-project>.supabase.co/auth/v1/callback`.
- **Silent Redirect to the Wrong Frontend:** You configured your Supabase Site URL or Redirect URLs incorrectly. Make sure they point to _your_ deployment (e.g., `https://<your-username>.github.io/...`).
- **Edge Function HTTP 500 Errors:** Ensure you have deployed all edge functions (`supabase functions deploy`) and set the required secrets in the Supabase Vault.
- **Database Errors (e.g., Column Does Not Exist):** You forgot to run `supabase db push`. Ensure your database schema matches the latest migrations.

## Deployment

To deploy the frontend to GitHub Pages, you can use the included `.github/workflows/deploy.yml` workflow. Ensure your repository settings allow GitHub Actions to deploy to Pages. You will configure your Supabase URL/Key through the UI on first load.
