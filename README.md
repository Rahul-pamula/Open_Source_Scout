# Open Source Scout 🎯

Find the issues worth solving. Understand them faster. Contribute with confidence.

**[Try the Hosted App](https://rahul-pamula.github.io/Open_Source_Scout/)**  
_(You do not need to deploy the frontend yourself to use Scout)_

## What is Scout?

Open Source Scout is an AI-assisted workflow that helps you discover, understand, claim, and manage open-source contributions. Instead of aimlessly browsing GitHub for issues you can solve, you configure your intent, and Scout's Mission Control pipeline helps you evaluate and engage with the right opportunities.

## Why Scout?

Developers waste hours scrolling through irrelevant GitHub issues, guessing true difficulty, and checking if issues are secretly claimed by someone else. Scout brings discovery, AI evaluation, and contribution tracking into one unified workflow so you can focus exclusively on writing code.

## How it works

1. **Discovery:** Aggressively filters GitHub to find issues matching your exact skills.
2. **AI Dossier:** Groq LLMs analyze issue context, estimate difficulty, and assign a match score.
3. **Claim & Assignment:** Generate context-aware draft comments to request assignment.
4. **Contribution Tracking:** Manage PRs, assignments, and reviews in a tabbed pipeline.

## Architecture

```text
Your Browser
      │
React/Vite Application (Hosted Frontend)
      │
Your Supabase (PostgreSQL + Auth)
      │
Your Edge Functions (Serverless Backend)
      │
GitHub & Groq APIs
```

## Why Bring Your Own Backend (BYOB)?

Every deployment of Open Source Scout is **100% decentralized**.

There is no central Scout server storing everyone's data. **Each developer uses their own Supabase project.**
You own your database, your infrastructure, your API execution costs, and your credentials. This ensures complete privacy and prevents rate limits from being shared across users.

## Required Services

| Service      | Why Scout needs it                                                    | Where configured                                 |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------ |
| **Supabase** | To host your database, Edge Functions, and manage authentication.     | You create a free project at supabase.com.       |
| **GitHub**   | To fetch issues, post claim comments, and authenticate you.           | You generate a PAT and an OAuth App.             |
| **Groq**     | To power the AI evaluation and generate context-aware draft comments. | You generate a free API key at console.groq.com. |

---

# 🚀 Path A: Using Scout

You do NOT need to clone this repository to use Scout. Just follow these 3 steps:

### 1. Open the App

Go to the **[Hosted Scout App](https://rahul-pamula.github.io/Open_Source_Scout/)** and click "Sign Up (New Setup)".

### 2. Get Your Keys

The setup guide in the app will ask you to gather 4 keys:

- A Supabase project ID & access token
- A Groq API key
- A GitHub Personal Access Token
- A GitHub OAuth App Client ID/Secret

### 3. Run the Setup CLI

Once you have your keys, run this command anywhere in your terminal:

```bash
npx open-source-scout setup
```

This CLI securely pushes the database schema, edge functions, and API keys directly into your Supabase project.

Once finished, return to the hosted app, enter your Supabase Connection URL, and sign in!

---

# 🛠 Path B: Developing Scout

_Only follow these instructions if you want to modify Scout's source code and contribute to the project itself._

## Local Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Rahul-pamula/Open_Source_Scout.git
   cd Open_Source_Scout
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the frontend:**

   ```bash
   npm run dev --workspace=apps/web
   ```

   The app will run at `http://localhost:5173`.

4. **Connect a backend:**
   You must still use `npx open-source-scout setup` to deploy a backend to your Supabase project, then connect your `localhost:5173` frontend to that backend.

## CLI Development

To test the CLI locally:

```bash
npm run start --workspace=packages/cli
```

## Data & Privacy

Because of the BYOB architecture, the developers of Open Source Scout have zero access to your data, your GitHub connection, or your database. All interactions happen directly between your browser, your Supabase project, and GitHub/Groq APIs.
