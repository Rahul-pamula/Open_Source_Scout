<div align="center">
  <h1 align="center">Open Source Scout 🦅</h1>
  <p align="center">
    <strong>Your AI-powered agent for crushing open source.</strong>
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
## 🗑️ The BYOB (Bring Your Own Backend) Architecture

Instead of building another SaaS that stores your data and GitHub tokens centrally, Open Source Scout uses a **100% decentralized, data-sovereign architecture**.

The architecture is split into two parts:
- **1 Universal Static Frontend:** Hosted centrally on GitHub Pages, acting purely as a UI layer.
- **Your Self-Hosted Backend:** You deploy your own Supabase Edge Functions, PostgreSQL database, and Vault. 

The frontend acts as a glass window into *your* personal infrastructure. **Your data. Your compute. Your API keys.**

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
