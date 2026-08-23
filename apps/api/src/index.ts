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

app.get('/api/github/issues/:owner/:repo/:number', async (req: Request, res: Response) => {
  try {
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const number = req.params.number as string;
    
    const issue = await githubAdapter.fetchIssue(owner, repo, parseInt(number));
    res.json({ data: issue });
  } catch (error: any) {
    console.error('[scout-api] GitHub Issue Fetch Error:', error);
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

// Groq Draft Generation
app.post('/api/draft/generate', async (req: Request, res: Response) => {
  try {
    const { issue, comments, profile, intent } = req.body;
    
    if (!issue || !comments || !profile || !intent) {
      return res.status(400).json({ error: 'issue, comments, profile, and intent are required in the request body' });
    }

    const result = await groqEvaluator.generateCommentDraft(issue, comments, profile, intent);
    res.json({ data: result });
  } catch (error: any) {
    console.error('[scout-api] Groq Draft Generation Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

import { idempotencyService } from './services/idempotency.js';

// GitHub Write Service
app.post('/api/engagement/post', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const { userId, owner, repo, number, draft, intent } = req.body;
    
    if (!userId || !owner || !repo || !number || !draft || !intent) {
      return res.status(400).json({ error: 'userId, owner, repo, number, draft, and intent are required' });
    }

    // Validate intent
    const validIntents = ['REQUEST_ASSIGNMENT', 'PROPOSE_SOLUTION', 'ASK_CLARIFICATION', 'EXPRESS_INTEREST'];
    if (!validIntents.includes(intent)) {
      return res.status(400).json({ error: 'Invalid intent' });
    }

    // Validate issue exists and is open
    const issue = await githubAdapter.fetchIssue(owner, repo, parseInt(number));
    if (issue.state !== 'open') {
      return res.status(400).json({ error: 'Issue is not open' });
    }

    // 1. Generate Key and Acquire Lock (Idempotency)
    const idempotencyKey = await idempotencyService.checkAndLockEngagement(
      authHeader,
      userId,
      `${owner}/${repo}`,
      parseInt(number),
      intent,
      draft
    );

    // 2. Safely post comment
    const result = await githubAdapter.postComment(owner, repo, parseInt(number), draft);
    
    // 3. Record success
    await idempotencyService.recordSuccessfulEngagement(authHeader, idempotencyKey, result.commentId);

    res.json({ data: result });
  } catch (error: any) {
    console.error('[scout-api] GitHub Post Comment Error:', error);
    res.status(error.message.includes('IDEMPOTENCY_ERROR') ? 409 : 500).json({ error: error.message || 'Internal Server Error' });
  }
});

import { claimDetector } from './services/claimDetector.js';

// Claim Status Proxy
app.post('/api/claim-status', async (req: Request, res: Response) => {
  try {
    const { issue, comments } = req.body;
    
    if (!issue || !comments) {
      return res.status(400).json({ error: 'Both "issue" and "comments" are required in the request body' });
    }

    const result = await claimDetector.detectClaimStatus(issue, comments);
    res.json({ data: result });
  } catch (error: any) {
    console.error('[scout-api] Claim Status Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

import { trackingService } from './services/tracking.js';

// Tracking API
app.get('/api/tracking', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const issues = await trackingService.getTrackedIssues(authHeader);
    res.json({ data: issues });
  } catch (error: any) {
    console.error('[scout-api] GET Tracking Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tracking/save', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const { userId, issueData } = req.body;
    if (!userId || !issueData) return res.status(400).json({ error: 'Missing userId or issueData' });
    const result = await trackingService.saveIssue(authHeader, userId, issueData);
    res.json({ data: result });
  } catch (error: any) {
    console.error('[scout-api] POST Tracking Save Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tracking/:id/state', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id as string;
    const { newState } = req.body;
    if (!newState) return res.status(400).json({ error: 'Missing newState' });
    const result = await trackingService.updateIssueState(authHeader, id, newState);
    res.json({ data: result });
  } catch (error: any) {
    console.error('[scout-api] PATCH Tracking State Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tracking/sync', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    await trackingService.syncTrackingState(authHeader);
    res.json({ message: 'Tracking state synced successfully to local data directory' });
  } catch (error: any) {
    console.error('[scout-api] POST Tracking Sync Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[scout-api] Server running on http://localhost:${PORT}`);
});
