# Deploying the BYOB Dashboard

Because the infrastructure belongs to you, Scout v1 requires several credentials. We don't hide the complexity; we structure it into a clear onboarding journey.

> [!IMPORTANT]
> You only need to do this if you want to use the v1 Cloud Dashboard for issue discovery. If you only want the v2 Local MCP Engine for safe AI execution, you can skip this entirely.

## The Hosted Dashboard

Scout v1 is publicly hosted at GitHub Pages — **no installation required to use it**:

> 🔗 **[https://rahul-pamula.github.io/Open_Source_Scout/](https://rahul-pamula.github.io/Open_Source_Scout/)**

Simply open the link, paste your Supabase credentials, and you are ready to discover issues. The section below explains how to set up the backend that powers it.

---

## Prerequisites

You will need free accounts at these three services:

| Service                                      | Purpose                            | Free Tier |
| -------------------------------------------- | ---------------------------------- | --------- |
| [Supabase](https://supabase.com)             | Database + Edge Functions + Auth   | ✅ Yes    |
| [GitHub](https://github.com/settings/tokens) | Personal Access Token for scanning | ✅ Yes    |
| [Groq](https://console.groq.com)             | AI evaluations via Llama 3         | ✅ Yes    |

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project** and give it a name (e.g., `open-source-scout`).
3. Choose a strong database password — **save this**, you will need it shortly.
4. Wait ~2 minutes for provisioning to complete.
5. From your project dashboard, navigate to **Settings → API** and note down:
   - **Project URL** (e.g., `https://abcdef.supabase.co`)
   - **Anon / Public Key**
   - **Service Role Key** (keep this secret!)

---

## Step 2: Get a GitHub Personal Access Token

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Give it a descriptive name like `Scout Issue Scanner`.
4. Check the `repo` scope (read access to public repositories and issues).
5. Click **Generate token** and copy it immediately — it is only shown once.

---

## Step 3: Get a Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com) and sign in.
2. Click **API Keys → Create API Key**.
3. Copy the key.

---

## Step 4: Run the CLI Setup

Open your terminal and run the interactive setup command:

```bash
npx open-source-scout setup
```

The CLI will walk you through entering all your credentials. It will:

1. Apply all PostgreSQL migrations to build the tables (`profiles`, `issues`, etc.).
2. Deploy the Deno Edge Functions (which power the Issue Scanner and AI Evaluator).
3. Configure `pg_cron` jobs to automatically scan GitHub every hour.
4. Securely store your API keys in the Supabase Vault.

> [!TIP]
> The CLI is idempotent — you can re-run it safely if something goes wrong. It will detect and skip already-applied migrations.

---

## Step 5: Connect the UI

Once the CLI finishes successfully, you are ready to connect the frontend.

### Using the Hosted URL (Recommended)

1. Visit **[https://rahul-pamula.github.io/Open_Source_Scout/](https://rahul-pamula.github.io/Open_Source_Scout/)**.
2. Click **Open v1 Dashboard**.
3. Enter your **Supabase Project URL** and **Anon Key** when prompted.
4. Sign in and you are done!

### Running Locally

If you have cloned the repository locally:

```bash
# From the repo root
npm install
npm run dev
```

Then open [http://localhost:5173/Open_Source_Scout/](http://localhost:5173/Open_Source_Scout/).

---

## Step 6: Configure Environment Variables (Self-Hosting Only)

If you are forking this repo and deploying your own copy of the frontend, create an `.env` file in `apps/web/`:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Then build and deploy:

```bash
npm run build --workspace=apps/web
# Output is in apps/web/dist/ — host as a static site anywhere
```

---

## Quick Reference

| Credential                | Where to Get It                              | Required For             |
| ------------------------- | -------------------------------------------- | ------------------------ |
| Supabase URL              | Supabase → Settings → API                    | v1 Dashboard UI          |
| Supabase Anon Key         | Supabase → Settings → API                    | v1 Dashboard UI          |
| Supabase Service Role Key | Supabase → Settings → API                    | CLI Setup only           |
| GitHub PAT                | GitHub → Developer Settings → Tokens         | Issue Scanner Scanning   |
| Groq API Key              | [console.groq.com](https://console.groq.com) | AI Evaluator Evaluations |
