#!/usr/bin/env node

import { execa } from 'execa';
import enquirer from 'enquirer';
import ora from 'ora';
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

  // 1. Get Project ID
  const { projectId } = await prompt({
    type: 'input',
    name: 'projectId',
    message: 'Enter your Supabase Project ID (from your dashboard URL):',
    required: true
  });

  const spinner = ora('Linking Supabase project...').start();
  try {
    await execa('supabase', ['link', '--project-ref', projectId], { stdio: 'ignore' });
    spinner.succeed('Linked Supabase project.');
  } catch (e) {
    spinner.fail('Failed to link Supabase project. Ensure you are logged in (supabase login).');
    console.error(e);
    process.exit(1);
  }

  // 2. Setup Database
  spinner.start('Pushing database schema...');
  try {
    await execa('supabase', ['db', 'push'], { stdio: 'ignore' });
    spinner.succeed('Database schema deployed.');
  } catch (e) {
    spinner.fail('Failed to push database schema.');
    console.error(e);
  }

  // 3. Setup Secrets
  console.log(chalk.bold('\n🔑 Configure Secrets'));
  const secrets = await prompt([
    {
      type: 'input',
      name: 'githubToken',
      message: 'GitHub Personal Access Token (classic, with repo access):',
      required: true
    },
    {
      type: 'input',
      name: 'groqApiKey',
      message: 'Groq API Key:',
      required: true
    }
  ]);

  spinner.start('Setting secrets in Supabase...');
  try {
    // We write to a temporary .env file to push secrets
    const tempEnvPath = path.join(process.cwd(), '.env.temp');
    fs.writeFileSync(tempEnvPath, `GITHUB_TOKEN=${secrets.githubToken}\nGROQ_API_KEY=${secrets.groqApiKey}\n`);
    
    await execa('supabase', ['secrets', 'set', '--env-file', '.env.temp'], { stdio: 'ignore' });
    fs.unlinkSync(tempEnvPath);
    spinner.succeed('Secrets configured.');
  } catch (e) {
    spinner.fail('Failed to set secrets.');
    console.error(e);
  }

  // 4. Deploy Edge Functions
  spinner.start('Deploying Edge Functions...');
  try {
    const functions = ['search', 'evaluate', 'engage', 'worker', 'sync', 'dossier', 'tracking'];
    for (const fn of functions) {
      await execa('supabase', ['functions', 'deploy', fn], { stdio: 'ignore' });
    }
    spinner.succeed('Edge Functions deployed.');
  } catch (e) {
    spinner.fail('Failed to deploy Edge Functions.');
    console.error(e);
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
