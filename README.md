<div align="center">
  <img src="https://img.icons8.com/?size=100&id=D7Jc0g0f5N1O&format=png&color=10b981" alt="Open Source Scout Logo" />
  <h1>Open Source Scout</h1>
  <p><strong>An AI-powered local agent for discovering, evaluating, and tracking open-source contribution opportunities.</strong></p>
</div>

---

## 🎯 The Problem

Navigating open source can be overwhelming. As a developer, finding issues that actually match your skills, evaluating their true difficulty, and tracking your active contributions across dozens of repositories is a fragmented, manual, and exhausting process. 

## ✨ The Solution

**Open Source Scout** is your personal, local-first agent. It cuts through the noise by:
1. **Discovering** issues matching your specific developer profile.
2. **Evaluating** them using Groq's blazing-fast LLMs to generate a "Match Score", extract alignment intent, and estimate effort.
3. **Tracking** your open-source pipeline (from *Discovered* to *Engaged* to *Completed*) using a strict state machine.

Scout is designed as a **serious developer tool**. No noisy dashboards, no AI "sparkles" — just a light, precise, technical interface that helps you answer one question: *"Should I contribute to this issue?"*

---

## 🏗️ Architecture

Scout is built with a local-first philosophy. The frontend never talks directly to the AI models or external databases; all state transitions and API calls are strictly validated by the backend.

\`\`\`mermaid
graph TD
    UI[Frontend: React + Vite + Tailwind]
    API[Backend: Express API]
    DB[(Supabase: Tracking State)]
    GH[GitHub API: Issues & Comments]
    Groq[Groq API: Llama 3 Evaluation]

    UI -- "HTTP (Auth Token)" --> API
    API -- "Validate State Transition" --> DB
    API -- "Fetch Context" --> GH
    API -- "Evaluate/Draft" --> Groq
\`\`\`

---

## 🚀 Features

- **Radar:** Discover issues tailored to your profile.
- **Dossier:** A deep-dive workspace for a single issue, pulling in the comment thread, GitHub facts, claimant detection, and AI evaluation.
- **Operations Board:** A dense technical list tracking your contribution pipeline, backed by a strict state machine to prevent illegal tracking states.

---

## ⚙️ Environment Variables

To run Scout locally, you must provide secrets to the backend. **Secrets are never exposed to the Vite frontend.**

Create a \`.env\` file in the root of the repository:

\`\`\`env
# Supabase (Canonical Tracking State)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq (AI Evaluation)
GROQ_API_KEY=your_groq_api_key

# GitHub (API Access)
GITHUB_TOKEN=your_github_personal_access_token

# Backend Port (Optional, defaults to 3001)
API_PORT=3001
\`\`\`

---

## 🛠️ Local Development

1. **Install Dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Run the Development Server:**
   \`\`\`bash
   npm run dev
   \`\`\`
   - Frontend starts on \`http://localhost:5173\`
   - Backend API starts on \`http://localhost:3001\`

---

## 🤝 Contributing

We welcome contributions! Scout itself is an open-source project designed to help people contribute to open source. 

**Want to help build Scout?**
Look for issues labeled \`good first issue\` on our tracker. We are currently building out **Phase 4 (Draft Engagement)** and welcome help with:
- Frontend UI/UX refinements
- Markdown parsing in the Dossier
- Expanding AI evaluation criteria

*Note: All PRs must maintain the "Light. Precise. Technical." design philosophy. Please review our architecture constraints before opening large structural PRs.*
