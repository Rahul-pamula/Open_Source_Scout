import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the root of the repository
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

import { githubAdapter } from './services/github.js';
import { filterEngine } from './services/filter.js';

// Basic health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'scout-api' });
});

// GitHub API Proxy
app.get('/api/github/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const rawIssues = await githubAdapter.searchIssues(query, limit);
    const eligibleIssues = filterEngine.filterEligibleIssues(rawIssues);

    res.json({ 
      meta: {
        total_fetched: rawIssues.length,
        total_eligible: eligibleIssues.length,
        filtered_out: rawIssues.length - eligibleIssues.length
      },
      data: eligibleIssues 
    });
  } catch (error: any) {
    console.error('[scout-api] GitHub Search Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.get('/api/github/issues/:owner/:repo/:number/comments', async (req: Request, res: Response) => {
  try {
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const number = req.params.number as string;
    const page = parseInt(req.query.page as string) || 1;
    
    const comments = await githubAdapter.fetchIssueComments(owner, repo, parseInt(number), page);
    res.json({ data: comments });
  } catch (error: any) {
    console.error('[scout-api] GitHub Comments Fetch Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

import { groqEvaluator } from './services/groq.js';

// Groq Evaluation Proxy
app.post('/api/evaluate', async (req: Request, res: Response) => {
  try {
    const { issue, profile } = req.body;
    
    if (!issue || !profile) {
      return res.status(400).json({ error: 'Both "issue" and "profile" are required in the request body' });
    }

    const result = await groqEvaluator.evaluateIssue(issue, profile);
    res.json({ data: result });
  } catch (error: any) {
    console.error('[scout-api] Groq Evaluation Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`[scout-api] Server running on http://localhost:${PORT}`);
});
