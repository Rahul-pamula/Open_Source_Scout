#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let hasVulnerabilities = false;

function reportFinding(file, type, severity) {
  console.log(`[${severity}] Secret Exposure Detected!`);
  console.log(`  File: ${file}`);
  console.log(`  Type: ${type}`);
  hasVulnerabilities = true;
}

console.log('🛡️  Running Security Audit...\n');

// 1. Verify .gitignore protects .env files
console.log('Checking .gitignore rules...');
const gitignorePath = path.join(rootDir, '.gitignore');
if (!fs.existsSync(gitignorePath)) {
  console.log('[HIGH] .gitignore is missing!');
  hasVulnerabilities = true;
} else {
  const ignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  if (!ignoreContent.includes('.env\n') && !ignoreContent.includes('.env\r\n')) {
    console.log('[HIGH] .gitignore does not block .env!');
    hasVulnerabilities = true;
  }
  if (!ignoreContent.includes('.env.*')) {
    console.log('[HIGH] .gitignore does not block .env.*!');
    hasVulnerabilities = true;
  }
  if (!ignoreContent.includes('.env.temp')) {
    console.log('[HIGH] .gitignore does not block .env.temp!');
    hasVulnerabilities = true;
  }
}

// 2. Scan Git history and current files for exposed tokens
console.log('Scanning for exposed privileged credentials (GitHub, Groq, Supabase)...');
// Use git grep to search tracked files
const gitGrep = spawnSync('git', ['grep', '-nE', '(ghp_[A-Za-z0-9_]{36}|gsk_[A-Za-z0-9_]{48}|sbp_[A-Za-z0-9_]{40})'], {
  cwd: rootDir,
  encoding: 'utf-8'
});

if (gitGrep.status === 0 && gitGrep.stdout) {
  const lines = gitGrep.stdout.split('\n').filter(Boolean);
  for (const line of lines) {
    const file = line.split(':')[0];
    reportFinding(file, 'Hardcoded High-Privilege Token (Regex Match)', 'CRITICAL');
  }
}

// 3. Scan for frontend accidental exposure
console.log('Verifying frontend environment variables...');
const frontendEnvSearch = spawnSync('git', ['grep', '-nE', '(VITE_GITHUB_' + 'TOKEN|VITE_GROQ_' + 'KEY)'], {
  cwd: rootDir,
  encoding: 'utf-8'
});

if (frontendEnvSearch.status === 0 && frontendEnvSearch.stdout) {
  const lines = frontendEnvSearch.stdout.split('\n').filter(Boolean);
  for (const line of lines) {
    const file = line.split(':')[0];
    reportFinding(file, 'Frontend exposure of backend secrets', 'CRITICAL');
  }
}

if (hasVulnerabilities) {
  console.log('\n❌ Security audit failed. Please fix the above issues.');
  process.exit(1);
} else {
  console.log('\n✅ Security audit passed. No exposures found.');
  process.exit(0);
}
