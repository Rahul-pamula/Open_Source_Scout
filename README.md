<div align="center">

# Open Source Scout 🦅

### Find open-source issues you can actually work on.

Open Source Scout helps developers find GitHub issues that match their skills, understand whether they can solve them, and track the issues they want to work on.

<p align="center">
  <a href="https://github.com/Rahul-pamula/Open_Source_Scout/issues">
    <img src="https://img.shields.io/github/issues/Rahul-pamula/Open_Source_Scout?style=flat-square&color=blue" alt="GitHub Issues" />
  </a>
  <a href="https://github.com/Rahul-pamula/Open_Source_Scout/pulls">
    <img src="https://img.shields.io/github/issues-pr/Rahul-pamula/Open_Source_Scout?style=flat-square&color=blue" alt="Pull Requests" />
  </a>
  <a href="https://github.com/Rahul-pamula/Open_Source_Scout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22">
    <img src="https://img.shields.io/github/issues/Rahul-pamula/Open_Source_Scout/good%20first%20issue?style=flat-square&color=10b981&label=Good%20First%20Issues" alt="Good First Issues" />
  </a>
  <a href="https://github.com/Rahul-pamula/Open_Source_Scout/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/Rahul-pamula/Open_Source_Scout/ci.yml?branch=main&style=flat-square" alt="CI Status" />
  </a>
</p>
</div>

---

## 😩 Finding Open Source Issues Takes Too Much Time

You want to contribute to open source.

So you open GitHub and search:

`good first issue`  
`help wanted`  
`javascript`  
`react`  
`bug`  

You find an issue. You read the description. You check the code. You spend 30 minutes trying to understand it.

Then you discover:
* someone already claimed it
* the issue is outdated
* it needs skills you don't have
* the maintainer is no longer looking for contributions

Then you start searching again.

## 💡 That's Why I Built Open Source Scout

Open Source Scout helps you spend less time searching and more time contributing.

It looks for GitHub issues based on your skills and interests, analyzes the issue, and helps you track what you want to work on.

```text
Your Skills
     ↓
Find GitHub Issues
     ↓
Check Issue
     ↓
AI Analysis
     ↓
You Decide
     ↓
Track Your Contribution
```

## 🔎 What Can It Do?

### 🎯 Find Issues
Search GitHub for issues based on:
* programming language
* technology
* issue labels
* difficulty
* your interests

### 🧠 Understand Issues
Scout uses AI to help answer:
* What is this issue about?
* How difficult is it?
* What skills are needed?
* Is this a good match for me?
* Does it look like someone already claimed it?

### 📋 Track Your Work
Once you find something interesting, track it.

```text
Discovered
    ↓
Interested
    ↓
Engaged
    ↓
Working
    ↓
Completed
```

## 🚀 How It Works

### Step 1 — Tell Scout What You Know
You provide your skills (e.g. JavaScript, React, Python).

### Step 2 — Scout Finds Issues
Scout searches GitHub for issues that match your profile.

### Step 3 — Scout Analyzes & Evaluates
The AI helps you understand difficulty, required skills, and issue status. It can even **automatically evaluate and choose** the best issues for you based on your unique profile.

### Step 4 — Engage & Claim
Once an issue is chosen, Scout can **automatically draft and post a comment** directly to GitHub on your behalf to claim the issue or ask clarifying questions!

### Step 5 — Track It
Keep track of issues you have discovered, claimed, or are working on.

## 🔐 Your Backend, Your Data

Open Source Scout does not require you to send your GitHub tokens and personal data to a central Open Source Scout server.

You create your own Supabase project and deploy the backend there.

Your database, API keys, GitHub credentials, and AI credentials stay in your own Supabase project.

```text
             Open Source Scout
                    │
                    ▼
              Your Supabase
             ┌──────────────┐
             │  Database    │
             │  Edge Funcs  │
             │  Vault       │
             └──────────────┘
                    │
              GitHub / Groq
```

## 🚀 Get Started

### Requirements
Before starting, you need:
* [Node.js](https://nodejs.org/) (v18 or newer)
* A free [Supabase](https://supabase.com) account
* A [GitHub Fine-grained Personal Access Token](https://github.com/settings/tokens?type=beta)
* A [Groq API key](https://console.groq.com/keys)

### 1. Clone the project
```bash
git clone https://github.com/Rahul-pamula/Open_Source_Scout.git
cd Open_Source_Scout
```

### 2. Create a Supabase project
Go to supabase.com and create a new project. You will need your Project ID and your Database Password.

### 3. Run Scout setup
```bash
npx open-source-scout setup
```
*(Or run `node packages/cli/bin/setup.js` if cloning locally)*

This command will:
```text
Connect Supabase
 ↓
Create database tables
 ↓
Store secrets securely
 ↓
Deploy backend functions
 ↓
Ready
```

### 4. Start the frontend
```bash
cd apps/web
npm install
npm run dev
```
Open the local server URL in your browser to begin onboarding.

---

# 🤝 Want to Contribute?

You don't need to be an expert to contribute.

If you know JavaScript, TypeScript, React, Node.js, Python, SQL, UI/UX, testing, documentation, or GitHub workflows, there may be something you can work on.

## Find an Issue
Check out our open issues:
* [Good First Issues](https://github.com/Rahul-pamula/Open_Source_Scout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
* [Help Wanted](https://github.com/Rahul-pamula/Open_Source_Scout/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
* [All Open Issues](https://github.com/Rahul-pamula/Open_Source_Scout/issues)

```text
1. Find an issue
2. Read the description
3. Check if someone is already working on it
4. Comment that you'd like to work on it
5. Wait for maintainer confirmation when required
6. Fork/branch the repository
7. Make your changes
8. Add tests
9. Open a Pull Request
```

## 🌱 Making Your First Contribution?

If this is your first open-source contribution, don't worry.

You can start with:
* documentation
* small bugs
* tests
* UI improvements
* developer experience

If you are confused about an issue, ask a question before coding. 
For detailed local setup instructions, please read our [CONTRIBUTING.md](CONTRIBUTING.md).

## 📁 Project Structure

```text
Open_Source_Scout/
│
├── apps/
│   └── web/          # React frontend application
│
├── packages/
│   └── cli/          # Node.js setup CLI for deployment
│
├── scripts/          # Automation and security tools
│
├── supabase/         # Database migrations and Edge Functions
│
├── docs/             # Technical Documentation
│
└── README.md
```

## 🏗️ Architecture

Want to understand how everything works internally?

Read: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

```text
Frontend (React) <---> Supabase Edge Functions <---> GitHub API & Groq AI
```

## 🛠️ Built With

* TypeScript
* React (Vite)
* Supabase
* PostgreSQL
* GitHub API
* Groq

## 🗺️ Roadmap

- [x] Issue discovery
- [x] AI issue analysis
- [x] Contribution tracking
- [x] CI pipeline
- [ ] Automated CLI testing
- [ ] More contributor tools

## 🚧 Project Status

Open Source Scout is actively being developed.

The core workflow is working, and the project has recently been hardened with automated tests, CI pipelines, and a robust architecture. We are now focusing on contributor tooling and community features.

## 💬 Need Help?

Found a bug?
[Open an issue](https://github.com/Rahul-pamula/Open_Source_Scout/issues/new).

Want to contribute?
Check the [good-first-issue label](https://github.com/Rahul-pamula/Open_Source_Scout/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).

Have a question?
Start a discussion or open an issue!
