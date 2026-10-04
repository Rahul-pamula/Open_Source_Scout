# Deploying the BYOB Dashboard

Because the infrastructure belongs to you, Scout v1 requires several credentials. We don't hide the complexity; we structure it into a clear onboarding journey.

> [!IMPORTANT]
> You only need to do this if you want to use the v1 Cloud Dashboard for issue discovery. If you only want the v2 Local MCP Engine for safe AI execution, you can skip this entirely.

## Prerequisites

You will need:

1. **Supabase Account:** Free tier is perfect. Create a new project.
2. **GitHub Personal Access Token (Classic):** Needs `repo` scope to read issues.
3. **Groq API Key:** For lightning-fast AI evaluations.

## Step 1: Run the CLI Setup

Open your terminal and run the interactive setup command:

```bash
npx open-source-scout setup
```

The CLI will prompt you for:

- Supabase Project URL
- Supabase Service Role Key
- Database Password
- GitHub Token
- Groq API Key

## Step 2: What the CLI Does

The setup script is completely automated. It will:

1. Apply all PostgreSQL migrations to build the tables (`profiles`, `issues`, etc.).
2. Deploy the Deno Edge Functions (which power the Radar and Dossier).
3. Set up cron jobs (`pg_cron`) to automatically scan GitHub for you every hour.
4. Securely store your API keys in the Supabase Vault.

## Step 3: Connect the UI

Once the CLI finishes, open the web dashboard:

1. Go to `http://localhost:5173` (or the hosted URL).
2. Click **Open v1 Dashboard**.
3. Paste your Supabase URL and Anon Key.
4. Sign in and start discovering issues!
