<div align="center">
  <h1 align="center">Open Source Scout 🦅</h1>
  <p align="center">
    <strong>I just deleted my entire backend API. Here's why.</strong>
  </p>
  <p align="center">
    <a href="https://github.com/Rahul-pamula/Open_Source_Scout/issues">
      <img src="https://img.shields.io/github/issues/Rahul-pamula/Open_Source_Scout/good%20first%20issue?style=flat-square&color=10b981&label=Good%20First%20Issues" alt="Good First Issues" />
    </a>
    <a href="https://github.com/Rahul-pamula/Open_Source_Scout/pulls">
      <img src="https://img.shields.io/github/issues-pr/Rahul-pamula/Open_Source_Scout?style=flat-square&color=blue" alt="Pull Requests" />
    </a>
  </p>
</div>

<br />

## 🗑️ The BYOB (Bring Your Own Backend) Revolution

Instead of building another SaaS that hoards your data and GitHub tokens, Open Source Scout uses a **100% decentralized, data-sovereign architecture**.

The setup:
- **1 Static Frontend** (Hosted centrally on GitHub Pages for everyone)
- **10,000 Users**
- **10,000 Self-Hosted Backends** (Supabase Edge Functions, AWS Lambdas, personal databases)

The frontend just acts as a glass window into *your* personal infrastructure. **Your data. Your compute. Your API keys.**

## 🧩 The Massive UX Paradox (We Need Your Help!)

If there is **zero central server**, how does the universal frontend "remember" which personal Edge environment or database to connect to when you clear your browser history? (Without forcing you to re-paste your connection keys every single time).

*Note: Building a central "phonebook" database defeats the whole purpose of being 100% decentralized.*

We have spent intense research and 150+ commits trying to crack this UX puzzle. We haven't fully solved it yet. 

If you are:
👉 **Interested in serverless computing**
👉 **New to open-source and eager to learn**
👉 **A senior developer willing to offer guidance**

Come check out what we're building and help us solve this decentralized UX paradox!

---

## ⚡ What is Open Source Scout?

Open Source Scout acts as your personal open-source manager, aggressively filtering GitHub to find issues that *actually* match your skills, evaluating their difficulty using Groq's lightning-fast LLMs, and tracking your workflow.

### 🌟 Features:
1. **The Radar:** Scout scans GitHub based on your dynamic developer profile and filters out the noise.
2. **The AI Dossier:** For every issue, Scout generates a "Match Score", detects if the issue is secretly claimed, and estimates the true difficulty of the ticket.
3. **The Operations Board:** A highly technical, automated Kanban board that tracks your pipeline via a strict state machine.

---

## 🚀 Quickstart (Deploy your own Backend)

You don't need to deploy the frontend. Just run the deployment CLI to spin up your personal backend infrastructure!

1. **Prerequisites:**
   - Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
   - Create a free project at [supabase.com](https://supabase.com)
   - Grab a GitHub Personal Access Token and a Groq API Key

2. **Deploy your Infrastructure:**
   ```bash
   npx open-source-scout setup
   ```
   *(Or run `node packages/cli/bin/setup.js` if cloning locally)*

3. **Follow the Wizard:**
   The CLI will automatically push the database schema, securely inject your API keys into the Vault, and deploy your Edge Functions.

4. **Connect:**
   Go to our hosted frontend, paste your newly generated Supabase URL and Anon Key, and boom—you're connected to your own personal backend.

---

## 🏗️ Architecture

Check out the [ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand how the frontend seamlessly orchestrates Edge Functions without an API server.

<div align="center">
  <p><i>Built with ☕️ to make open source decentralized, secure, and less intimidating.</i></p>
</div>
