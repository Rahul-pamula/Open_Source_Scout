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

  // 1. Get Authentication & Project ID
  const { accessToken } = await prompt({
    type: 'password',
    name: 'accessToken',
    message: 'Enter your Supabase Access Token (from https://supabase.com/dashboard/account/tokens):',
    required: true
  });

  const { projectId } = await prompt({
    type: 'input',
    name: 'projectId',
    message: 'Enter your Supabase Project ID (e.g., abcdefghijklmnopqrst):',
    required: true
  });

  const tempDir = '.scout-tmp';
  const originalCwd = process.cwd();

  console.log(chalk.bold('\n📥 Cloning Repository (Invisible Clone)'));
  try {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    await execa('git', ['clone', '--depth', '1', 'https://github.com/Rahul-pamula/Open_Source_Scout.git', tempDir], { stdio: 'ignore' });
    process.chdir(tempDir);
    console.log(chalk.green('✅ Repository cloned.'));
  } catch (e) {
    console.log(chalk.red('✖ Failed to clone the repository. Make sure git is installed.'));
    process.exit(1);
  }

  try {

  console.log(chalk.bold('\n🔗 Linking Supabase Project'));
  try {
    await execa('supabase', ['link', '--project-ref', projectId], { 
      stdio: 'inherit',
      env: { SUPABASE_ACCESS_TOKEN: accessToken }
    });
    console.log(chalk.green('✅ Linked Supabase project.'));
  } catch (e) {
    console.log(chalk.red('\n✖ Failed to link Supabase project.'));
    console.log(chalk.yellow('This usually happens because your Access Token is invalid or you do not own the Project ID.'));
    console.log(chalk.cyan('Please check your token and Project ID and try again.'));
    process.exit(1);
  }

  // 2. Setup Database
  console.log(chalk.bold('\n📦 Pushing Database Schema'));
  try {
    await execa('supabase', ['db', 'push'], { 
      stdio: 'inherit',
      env: { SUPABASE_ACCESS_TOKEN: accessToken }
    });
    console.log(chalk.green('✅ Database schema deployed.'));
  } catch (e) {
    console.log(chalk.red('\n✖ Failed to push database schema.'));
    console.log(chalk.yellow('Your Supabase database might be in a partially deployed state.'));
    console.log(chalk.cyan('To fix this, go to your Supabase Dashboard -> Project Settings -> Database -> "Reset database", then try again.'));
    process.exit(1);
  }

  // 3. Setup Secrets
  console.log(chalk.bold('\n🔑 Configure Secrets'));
  const secrets = await prompt([
    {
      type: 'input',
      name: 'githubToken',
      message: 'GitHub Fine-grained Personal Access Token (Needs Read/Write for Issues & PRs. Set expiration to 1 year):',
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
    try {
      await execa('supabase', ['secrets', 'set', '--env-file', '.env.temp'], { 
        stdio: 'inherit',
        env: { SUPABASE_ACCESS_TOKEN: accessToken }
      });
      console.log(chalk.green('✅ Secrets configured.'));
    } finally {
      if (fs.existsSync(tempEnvPath)) {
        fs.unlinkSync(tempEnvPath);
      }
    }
  } catch (e) {
    console.log(chalk.red('\n✖ Failed to set secrets.'));
    process.exit(1);
  }

  // 4. Deploy Edge Functions
  console.log(chalk.bold('\n⚡ Deploying Edge Functions'));
  try {
    const functions = ['search', 'evaluate', 'engage', 'worker', 'sync', 'dossier', 'tracking'];
    for (const fn of functions) {
      console.log(chalk.gray(`Deploying ${fn}...`));
      await execa('supabase', ['functions', 'deploy', fn], { 
        stdio: 'inherit',
        env: { SUPABASE_ACCESS_TOKEN: accessToken }
      });
    }
    console.log(chalk.green('✅ Edge Functions deployed.'));
  } catch (e) {
    console.log(chalk.red('\n✖ Failed to deploy Edge Functions.'));
    process.exit(1);
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
  } finally {
    // Clean up invisible clone
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

run().catch(err => {
  console.error(chalk.red(err.message));
  process.exit(1);
});
