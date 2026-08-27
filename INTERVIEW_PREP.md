# Open Source Scout: Interview Preparation Guide

This document contains deep architectural insights, clever engineering decisions, and technical details about the Open Source Scout project. These are great talking points for engineering interviews to demonstrate system design, full-stack knowledge, and problem-solving skills.

## 1. Bring-Your-Own-Backend (BYOB) Architecture
Instead of hosting a centralized database that stores everyone's data (which costs money and raises privacy concerns), Scout uses a **Decentralized BYOB model**.
- **How it works:** The frontend is a static single-page application (SPA) hosted for free on GitHub Pages. Users bring their own Supabase database.
- **Why it matters:** It demonstrates cost-effective system design. The core platform has $0 in server costs because compute and storage are distributed directly to the users' own Supabase instances. It also guarantees 100% data privacy.

## 2. The Invisible Setup CLI (`.scout-tmp`)
To make the BYOB model user-friendly, we built an NPM setup wizard (`npx open-source-scout setup`).
- **The Problem:** We need to push database migrations and backend Edge Functions to a user's Supabase instance, but they only have the NPM package, not the source code.
- **The Clever Solution:** The CLI performs an "invisible clone." It runs `git clone --depth 1` into a hidden `.scout-tmp` folder, extracts the `supabase/` directory to push schemas and deploy functions, and then immediately deletes the folder. 
- **Interview flex:** This shows you know how to automate developer experience (DX) securely without leaving garbage files on a user's machine.

## 3. Microservices via Edge Functions
Instead of a monolithic Node.js server, the backend is split into **7 isolated Deno Edge Functions**:
1. `search`: Interfaces with the GitHub API.
2. `evaluate`: Prompts the Groq LLM to calculate match scores.
3. `tracking`: Database operations for saving issues.
4. `dossier`: Deep analysis of a specific issue.
5. `engage`: AI generation of comments.
6. `sync`: Background reconciliation of issue states.
7. `worker`: Autonomous task queue runner.
- **Why it matters:** Edge functions spin up instantly (no cold starts) and run close to the user geographically. Separating them ensures that a failure in the LLM evaluation (`evaluate`) doesn't take down the basic GitHub fetching (`search`).

## 4. SPA Routing on Static Hosts (The `404.html` Hack)
- **The Problem:** The web app is built with React Router (client-side routing) but hosted on GitHub Pages (a static file server). If a user refreshes the page on `https://.../app/operations`, GitHub Pages looks for an actual folder named `/app/operations` and returns a 404 error.
- **The Solution:** During the build step (`tsc -b && vite build && cp dist/index.html dist/404.html`), we copy the main `index.html` to a `404.html` file. When GitHub Pages can't find a route, it serves `404.html` (which contains our React app). React Router then takes over and renders the correct view dynamically.

## 5. Graceful Degradation in the Database
- **The Problem:** When a user logs in via GitHub OAuth for the first time, Supabase creates a row in the secure `auth.users` table, but their public profile row in `public.users` (which holds their bio and skills) isn't created until they fill it out.
- **The Fix:** If the frontend uses `.single()` to query a missing profile, PostgREST throws a fatal `406 Not Acceptable` error, crashing the app. We engineered the app to use `.maybeSingle()` for reading and `.upsert()` for writing. This ensures the app gracefully handles missing data without crashing, allowing the user to browse default issues until they fill out their profile.

## 6. Real-time AI with Groq
- **Why Groq?** Traditional LLMs (like OpenAI) are too slow for real-time list filtering. By using Groq (which runs on specialized LPU hardware), we can evaluate multiple GitHub issues against a user's specific skills in milliseconds, providing an instant, seamless UX on the Radar page.

## 7. Security: Stateless JWT Verification
- **How backend auth works:** When the frontend talks to an Edge Function, it attaches the user's Supabase session JWT in the `Authorization` header. The Edge Functions use a shared `requireAuth()` module to securely verify this JWT using the Supabase client. This ensures that no one can spam the Edge Functions or incur Groq API costs without being an authenticated user.
