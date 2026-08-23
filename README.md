<div align="center">
  <img src="https://img.icons8.com/?size=120&id=D7Jc0g0f5N1O&format=png&color=10b981" alt="Open Source Scout Logo" />
  <h1 align="center">Open Source Scout 🦅</h1>
  <p align="center">
    <strong>Stop scrolling. Start coding. Your AI-powered agent for crushing open source.</strong>
  </p>
  <p align="center">
    <a href="https://github.com/Rahul-pamula/Open_Source_Scout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22">
      <img src="https://img.shields.io/github/issues/Rahul-pamula/Open_Source_Scout/good%20first%20issue?style=flat-square&color=10b981&label=Good%20First%20Issues" alt="Good First Issues" />
    </a>
    <a href="https://github.com/Rahul-pamula/Open_Source_Scout/pulls">
      <img src="https://img.shields.io/github/issues-pr/Rahul-pamula/Open_Source_Scout?style=flat-square&color=blue" alt="Pull Requests" />
    </a>
  </p>
</div>

<br />

## 😩 The Open Source Struggle is Real

We've all been there:
- 🔍 **The Scroll of Despair:** Spending 3 hours searching for a "good first issue" only to find it requires deep knowledge of a codebase you've never seen.
- 😭 **The Silent Claim:** Finding the *perfect* issue, reading the entire thread, only to realize at the very bottom that someone claimed it 3 weeks ago and the maintainer forgot to assign them.
- 🧠 **Context Overload:** Trying to figure out if you actually have the skills to solve a bug based on a 2-sentence description.

## ⚡ Meet Scout

**Open Source Scout** is a local-first AI agent that fixes this broken workflow. It acts as your personal open-source manager, aggressively filtering GitHub to find issues that *actually* match your skills, evaluating their difficulty using Groq's lightning-fast LLMs, and tracking your workflow.

### 🌟 What it does:
1. **The Radar:** Scout scans GitHub based on your custom developer profile and filters out the noise.
2. **The AI Dossier:** For every issue, Scout generates a "Match Score", detects if the issue is secretly claimed, and estimates the true difficulty of the ticket.
3. **The Operations Board:** A highly technical, automated Kanban board that tracks your pipeline (Discovered → Engaged → Completed) via a strict state machine.
4. **[WIP] Auto-Engagement:** (Coming in Phase 4!) Scout will draft professional, context-aware comments requesting assignment or asking clarifying questions—all requiring your explicit 1-click approval before posting.

---

## 🤝 We Need Your Help! (Yes, YOU!)

Scout is built **by** open source contributors, **for** open source contributors. 

We are currently building out **Phase 4 (Draft Engagement)** and polishing the UI. Whether you are a beginner looking for your first PR or a seasoned architect, there is a place for you here.

### Where to start?
1. Check out our [Good First Issues](https://github.com/Rahul-pamula/Open_Source_Scout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).
2. We need help with:
   - 🎨 **Frontend:** Refining the Tailwind UI, adding subtle animations, and improving empty states.
   - 🧠 **AI/Prompting:** Tweaking Groq prompts to better detect issue difficulty.
   - 🛠️ **Backend:** Strengthening the Express/Supabase state machine.

*Our Design Philosophy:* **Light. Precise. Technical. Quiet.** We build serious developer tools, not noisy, flashing dashboards. Keep it clean!

---

## 🏗️ How It Works (Architecture)

Scout is strictly local-first. The frontend never talks directly to external APIs, ensuring your secrets stay safe on the server.

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

## 🚀 Quickstart (Run it locally)

You need to provide your own API keys. **Secrets are never exposed to the Vite frontend.**

1. **Clone & Install:**
   \`\`\`bash
   git clone https://github.com/Rahul-pamula/Open_Source_Scout.git
   cd Open_Source_Scout
   npm install
   \`\`\`

2. **Configure Environment:**
   Create a \`.env\` file in the root of the repository:
   \`\`\`env
   # Supabase (Canonical Tracking State)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Groq (AI Evaluation)
   GROQ_API_KEY=your_groq_api_key

   # GitHub (API Access)
   GITHUB_TOKEN=your_github_personal_access_token
   
   API_PORT=3001
   \`\`\`

3. **Ignition:**
   \`\`\`bash
   npm run dev
   \`\`\`
   - Frontend starts on \`http://localhost:5173\`
   - Backend API starts on \`http://localhost:3001\`

---

<div align="center">
  <p><i>Built with ☕️ to make open source less intimidating. Join us!</i></p>
</div>
