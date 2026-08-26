# Quick Setup Guide

Open Source Scout uses a secure, decentralized architecture. That means we don't store your private GitHub tokens on our servers. Instead, you deploy your own personal "Backend" using Supabase.

Follow these simple steps to get started!

## Prerequisites

Before you begin, make sure you have:
1. A free [Supabase account](https://supabase.com).
2. A [GitHub Personal Access Token](https://github.com/settings/tokens) (Fine-grained).
3. A [Groq API Key](https://console.groq.com/keys) (for the AI analysis).

## Step 1: Create a Supabase Project

1. Log in to Supabase and create a new project.
2. Note down your **Project ID** (found in the Project Settings -> General) and your **Database Password**.
3. Note down your **Anon Key** (found in Project Settings -> API).

## Step 2: Run the Setup Tool

Open your computer's terminal and run the following command:

```bash
npx open-source-scout setup
```

This automated wizard will securely connect to your new Supabase project, set up the database tables, securely store your API keys, and deploy the AI functions.

## Step 3: Connect the Web App

Once the setup tool finishes successfully:
1. Open the Open Source Scout web app.
2. Enter your **Supabase Project URL** and **Anon Key** into the Connect screen.
3. Click "Connect".

That's it! The web app will now communicate directly with your personal backend. You are ready to start finding issues!
