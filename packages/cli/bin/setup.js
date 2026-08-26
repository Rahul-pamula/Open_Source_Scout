#!/usr/bin/env node

import { execa } from 'execa';
import enquirer from 'enquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { prompt } = enquirer;

console.log(chalk.bold.green('\n🚀 Open Source Scout Setup\n'));
console.log(chalk.gray('This wizard will deploy your own self-hosted, data-sovereign instance of Scout.\n'));

async function checkSupabaseCLI() {
  try {
    await execa('supabase', ['--version']);
    return true;
  } catch (e) {
    return false;
  }
}

async function run() {
  const hasSupabase = await checkSupabaseCLI();
  
  if (!hasSupabase) {
    console.log(chalk.red('Supabase CLI not found. Please install it first:'));
    console.log(chalk.cyan('npm i -g supabase-cli'));
    process.exit(1);
  }

  const { isLoggedin } = await prompt({
    type: 'confirm',
    name: 'isLoggedin',
    message: 'Have you logged into the Supabase CLI? (You must run `supabase login` first)',
    initial: true
  });

  if (!isLoggedin) {
    console.log(chalk.yellow('\n⚠️  Please run `supabase login` first to authenticate your local computer, then run this setup again.'));
    process.exit(0);
  }

  // 1. Get Project ID
  const { projectId } = await prompt({
    type: 'input',
    name: 'projectId',
    message: 'Enter your Supabase Project ID (e.g., sskncjaaiuexwsdkmjpf):',
    required: true
  });

  console.log(chalk.bold('\n🔗 Linking Supabase Project'));
  try {
    await execa('supabase', ['link', '--project-ref', projectId], { stdio: 'inherit' });
    console.log(chalk.green('✅ Linked Supabase project.'));
  } catch (e) {
    console.log(chalk.red('\n✖ Failed to link Supabase project.'));
    console.log(chalk.yellow('This almost always happens because your CLI is not authenticated with your Supabase account.'));
    console.log(chalk.cyan('Please run `supabase login` to grant your terminal the correct privileges, and ensure the Project ID is correct.'));
    process.exit(1);
  }

  // 2. Setup Database
  console.log(chalk.bold('\n📦 Pushing Database Schema'));
  try {
    await execa('supabase', ['db', 'push'], { stdio: 'inherit' });
    console.log(chalk.green('✅ Database schema deployed.'));
  } catch (e) {
    console.log(chalk.red('✖ Failed to push database schema.'));
  }

  // 3. Setup Secrets
  console.log(chalk.bold('\n🔑 Configure Secrets'));
  const secrets = await prompt([
    {
      type: 'input',
      name: 'githubToken',
      message: 'GitHub Personal Access Token (e.g., ghp_xxxx...):',
      required: true
    },
    {
      type: 'input',
      name: 'groqApiKey',
      message: 'Groq API Key (e.g., gsk_xxxx...):',
      required: true
    }
  ]);

  console.log(chalk.bold('\n🔐 Setting Secrets in Supabase'));
  try {
    // We write to a temporary .env file to push secrets
    const tempEnvPath = path.join(process.cwd(), '.env.temp');
    fs.writeFileSync(tempEnvPath, `GITHUB_TOKEN=${secrets.githubToken}\nGROQ_API_KEY=${secrets.groqApiKey}\n`);
    
    await execa('supabase', ['secrets', 'set', '--env-file', '.env.temp'], { stdio: 'inherit' });
    fs.unlinkSync(tempEnvPath);
    console.log(chalk.green('✅ Secrets configured.'));
  } catch (e) {
    console.log(chalk.red('✖ Failed to set secrets.'));
  }

  // 4. Deploy Edge Functions
  console.log(chalk.bold('\n⚡ Deploying Edge Functions'));
  try {
    const functions = ['search', 'evaluate', 'engage', 'worker', 'sync', 'dossier', 'tracking'];
    for (const fn of functions) {
      console.log(chalk.gray(`Deploying ${fn}...`));
      await execa('supabase', ['functions', 'deploy', fn], { stdio: 'inherit' });
    }
    console.log(chalk.green('✅ Edge Functions deployed.'));
  } catch (e) {
    console.log(chalk.red('✖ Failed to deploy Edge Functions.'));
  }

  // 5. Deploy Frontend (Optional / Instructions)
  console.log(chalk.bold.green('\n✅ Deployment Complete!'));
  console.log(chalk.gray('\nYour backend is now fully operational on Supabase.'));
  console.log(chalk.gray('To deploy the frontend to Vercel/Netlify, run:'));
  console.log(chalk.cyan('  npm run build --prefix apps/web'));
  console.log(chalk.gray('\nMake sure to set these environment variables in your frontend deployment:'));
  console.log(chalk.cyan(`  VITE_SUPABASE_URL=https://${projectId}.supabase.co`));
  console.log(chalk.cyan('  VITE_SUPABASE_ANON_KEY=<your-anon-key>'));
  console.log(chalk.cyan(`  VITE_GITHUB_CLIENT_ID=<your-github-oauth-client-id>`));
  
  console.log(chalk.bold('\nHappy Open Sourcing! 🚀\n'));
}

run().catch(err => {
  console.error(chalk.red(err.message));
  process.exit(1);
});
