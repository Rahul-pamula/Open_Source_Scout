# Open Source Scout API Reference

*(Work in Progress)*

The API for Open Source Scout is primarily facilitated through Supabase Edge Functions to ensure secrets remain secure.

## Core Endpoints

### `/api/scout`
*   **Method:** POST
*   **Purpose:** Triggers the discovery pipeline based on a natural language intent.
*   **Payload:** `{ "intent": "Find React beginner issues" }`

### `/api/engage`
*   **Method:** POST
*   **Purpose:** Executes the Engagement Safety Gate and posts a comment on an issue if authorized.

### `/api/sync`
*   **Method:** POST
*   **Purpose:** Triggered by GitHub Actions to synchronize Supabase state with live GitHub facts for all tracked issues.

## Data Schemas

Reference schemas for `state.json`, `profile.json`, and `candidate.json` will be located in the `schemas/` directory.
