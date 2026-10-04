# The Radar

The Radar is your personal open-source discovery engine.

Instead of endlessly scrolling GitHub, the Radar actively scans repositories in the background and brings highly relevant issues directly to your screen.

## How it Works

1. **Profile Matching:** The Radar reads your Developer Profile (languages, frameworks, labels you care about like `good first issue`).
2. **Background Cron:** Every hour, a `pg_cron` job triggers the Supabase Edge Function.
3. **Intelligent Filtering:** It fetches issues from GitHub, filtering out stale issues, locked issues, or issues already assigned to someone else.

## Using the Radar UI

When you open the Mission Control dashboard, you will see a list of discovered issues.

- Click **Engage** to move an issue to the Dossier for deep AI evaluation.
- Click **Dismiss** to remove it from your Radar permanently.
