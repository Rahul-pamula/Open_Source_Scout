# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-23

### Added

- **BYOB Supabase Architecture**: The foundational Bring-Your-Own-Backend architecture for Open Source Scout.
- **CLI Setup Wizard**: Interactive Node CLI (`npx open-source-scout setup`) that securely deploys the database schema, Edge Functions, and secrets directly into a user's Supabase instance.
- **Hosted Frontend**: A React/Vite unified dashboard pipeline to discover, claim, and track open-source contributions.
- **Supabase Edge Functions**: Includes AI dossier generation (Groq integration) and GitHub issue fetching.
- **PostgreSQL State Guard**: Database-level transition guard enforcing strict issue states (`DISCOVERED`, `EVALUATED`, `ENGAGED`, etc.) preventing API bypasses.
- **Platform-Agnostic Schema Foundation**: Initial schema implementation of the `tasks` and `task_sessions` tables to support future integrations beyond GitHub.
