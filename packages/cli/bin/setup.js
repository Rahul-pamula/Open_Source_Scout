#!/usr/bin/env node

import { execa } from 'execa';
import enquirer from 'enquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const { prompt } = enquirer;
const repoUrl = 'https://github.com/Rahul-pamula/Open_Source_Scout.git';

const requestedCommand = process.argv[2];
if (requestedCommand && !['setup', 'help', '--help', '-h'].includes(requestedCommand)) {
  console.log(chalk.red(`Unknown command: ${requestedCommand}`));
  console.log(chalk.cyan('Usage: npx open-source-scout setup'));
  process.exit(1);
}

if (requestedCommand === 'help' || requestedCommand === '--help' || requestedCommand === '-h') {
  console.log(chalk.bold.green('\n🚀 Open Source Scout Setup\n'));
  console.log(chalk.gray('This wizard deploys your own self-hosted Open Source Scout backend.\n'));
  console.log(chalk.cyan('Usage: npx open-source-scout setup\n'));
  process.exit(0);
}

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
    console.log(chalk.cyan('npm i -g supabase'));
    process.exit(1);
  }

  // 1. Get Authentication & Project ID
  const accessToken = process.env.SCOUT_ACCESS_TOKEN || (await prompt({
    type: 'password',
    name: 'accessToken',
    message: 'Enter your Supabase Access Token (from https://supabase.com/dashboard/account/tokens):',
    required: true
  })).accessToken;

  const projectId = process.env.SCOUT_PROJECT_ID || (await prompt({
    type: 'input',
    name: 'projectId',
    message: 'Enter your Supabase Project ID (e.g., abcdefghijklmnopqrst):',
    required: true
  })).projectId;

  const tempDir = path.resolve(process.cwd(), '.scout-tmp');
  const originalCwd = process.cwd();

  console.log(chalk.bold('\n📥 Cloning Repository (Invisible Clone)'));
  try {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    await execa('git', ['clone', '--depth', '1', repoUrl, tempDir], { stdio: 'ignore' });
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
    const dbPush = execa('supabase', ['db', 'push'], { 
      env: { SUPABASE_ACCESS_TOKEN: accessToken }
    });
    if (dbPush.stdout) dbPush.stdout.pipe(process.stdout);
    if (dbPush.stderr) dbPush.stderr.pipe(process.stderr);
    await dbPush;
    console.log(chalk.green('✅ Database schema deployed.'));
  } catch (e) {
    const errorOutput = e.stderr || e.message || '';
    console.log(chalk.red('\n✖ Failed to push database schema.'));
    
    if (errorOutput.includes('42710') || errorOutput.includes('already exists')) {
      console.log(chalk.yellow('\n⚠️ Partial Deployment Detected!'));
      console.log(chalk.gray('Your Supabase database already contains one or more Scout database objects.'));
      console.log(chalk.cyan('Manually remove the conflicting object in Supabase, then rerun the setup command.'));
      
      if (!process.stdin.isTTY) {
        console.log(chalk.white('\nTo safely recover and retry:'));
        console.log(chalk.cyan('1. Go to your Supabase Dashboard -> Project Settings -> Database -> "Reset database".'));
        console.log(chalk.cyan('2. Run the setup command again.'));
        process.exit(1);
      }

      const { skipMigration } = await prompt({
        type: 'confirm',
        name: 'skipMigration',
        message: 'Do you want to skip the database migration and proceed with updating Secrets & Edge Functions?',
        initial: true
      });

      if (skipMigration) {
        console.log(chalk.green('✅ Skipping database migration.'));
      } else {
        console.log(chalk.white('\nTo safely recover and retry:'));
        console.log(chalk.cyan('1. Go to your Supabase Dashboard -> Project Settings -> Database -> "Reset database".'));
        console.log(chalk.cyan('2. Run the setup command again.'));
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow('\nYour Supabase database might be in a partially deployed state.'));
      console.log(chalk.cyan('Check the error output above, or reset your database if this is a fresh setup.'));
      process.exit(1);
    }
  }

  // 3. Setup Secrets
  console.log(chalk.bold('\n🔑 Configure Secrets'));
  const secrets = {
    githubToken: process.env.SCOUT_GITHUB_TOKEN || (await prompt({
      type: 'input',
      name: 'githubToken',
      message: 'GitHub Classic Personal Access Token (Requires "public_repo" scope. Do NOT use Fine-grained tokens as they cannot access external repos):',
      required: true
    })).githubToken,
    groqApiKey: process.env.SCOUT_GROQ_KEY || (await prompt({
      type: 'input',
      name: 'groqApiKey',
      message: 'Groq API Key (e.g., gsk_xxxx...):',
      required: true
    })).groqApiKey
  };

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

  // 5. Success Instructions
  console.log(chalk.bold.green('\n✅ Deployment Complete!'));
  console.log(chalk.gray('\nYour backend is now fully operational on Supabase.'));
  console.log(chalk.gray('You can now log in to the Open Source Scout web app using your GitHub account!'));
  console.log(chalk.cyan.bold('\n👉 https://rahul-pamula.github.io/Open_Source_Scout/'));
  
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
