# Troubleshooting & FAQs

Having trouble? Here are solutions to the most common issues.

## Connection Problems

**"Invalid Supabase URL or Key"**
Double-check that you copied the **Anon Key** and not the Secret Service Role Key. Ensure there are no trailing spaces when you paste the URL into the Connect screen.

**"Network Error when fetching issues"**
Ensure that your Supabase Edge Functions were deployed successfully during setup. You can verify this by checking your Supabase dashboard under "Edge Functions".

## Setup Wizard Errors

**"CLI fails to push database schema"**
Make sure your Database Password is correct. If your password contains special characters like `@` or `#`, the Supabase CLI sometimes struggles to parse it. Try changing your database password to something alphanumeric and running the setup command again.

## AI / Groq Errors

**"Groq Rate Limit Exceeded"**
The free tier of Groq has aggressive rate limits. If you try to evaluate too many issues too quickly, the AI evaluation will fail. Wait 60 seconds and try again.

**"Missing GITHUB_TOKEN"**
The automated commenting feature requires a valid GitHub Personal Access Token. If this fails, run `npx open-source-scout setup` again and ensure you provide a valid token when prompted.
