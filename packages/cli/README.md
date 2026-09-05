# Open Source Scout CLI

The Open Source Scout CLI launches the guided setup flow for deploying your own backend with Supabase, GitHub, and Groq.

## Install and run

```bash
npx open-source-scout setup
```

This command checks that the Supabase CLI is available, prompts for the required keys, clones the repository into a temporary local directory, links the Supabase project, pushes the schema, configures secrets, and deploys the Edge Functions.

## Requirements

- Node.js 18 or newer
- npm
- Git
- Supabase CLI (`supabase`)

Install the Supabase CLI first if it is not already available:

```bash
npm i -g supabase
```

## What the setup wizard collects

- Supabase Access Token
- Supabase Project ID
- GitHub PAT for repository access
- Groq API key
- Database password and project details as required by the backend deployment

## Security notes

- Credentials are only used at runtime.
- Temporary setup files are cleaned up after the deployment step.
- Sensitive values are not written to the npm package or saved to the repository.

## Repository

- GitHub: https://github.com/Rahul-pamula/Open_Source_Scout
