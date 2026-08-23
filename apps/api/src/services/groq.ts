import Groq from 'groq-sdk';
import type { NormalizedIssue, EvaluationResult, EngagementIntent, DraftResult } from '../types.js';

export class GroqEvaluator {
  private client: Groq | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.client = new Groq({ apiKey });
    } else {
      console.warn('[GroqEvaluator] No GROQ_API_KEY provided. Evaluation will fail if called.');
    }
  }

  /**
   * Evaluate a single eligible issue against the user's profile.
   * Forces JSON output.
   */
  async evaluateIssue(issue: NormalizedIssue, userProfile: string): Promise<EvaluationResult> {
    if (!this.client) {
      throw new Error('Groq client is not initialized (missing API key).');
    }

    const prompt = `
You are a senior engineering manager evaluating open-source GitHub issues for a developer on your team.
Your goal is to determine if this issue is a good match for them based on their profile.

USER PROFILE:
${userProfile}

GITHUB ISSUE:
Title: ${issue.title}
Repository: ${issue.repoName}
Labels: ${issue.labels.join(', ')}
Description:
${issue.body.substring(0, 1500)} // Truncated for context limits

You MUST output ONLY valid JSON in the following strict format, with no markdown formatting or extra text:
{
  "matchScore": <integer between 0 and 100>,
  "intent": "<Very brief 3-5 word summary of what needs to be done>",
  "explanation": "<1-2 sentence technical explanation of WHY this is a good match or bad match>",
  "difficulty": "EASY" | "MEDIUM" | "HARD",
  "estimatedEffort": "<human readable estimate, e.g. 2-4 hours>"
}
`;

    const chatCompletion = await this.client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192', // Fast, cheap model perfect for classification
      response_format: { type: 'json_object' },
      temperature: 0.1, // Keep it deterministic
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from Groq API');
    }

    try {
      const result = JSON.parse(responseContent) as EvaluationResult;
      // Ensure bounds
      result.matchScore = Math.max(0, Math.min(100, result.matchScore));
      
      // Ensure valid difficulty
      const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
      if (!validDifficulties.includes(result.difficulty)) {
        result.difficulty = 'MEDIUM'; // fallback
      }
      if (!result.estimatedEffort) {
         result.estimatedEffort = 'Unknown effort';
      }

      return result;
    } catch (err) {
      throw new Error('Groq API returned invalid JSON');
    }
  }

  /**
   * Generate a professional GitHub comment draft.
   */
  async generateCommentDraft(
    issue: NormalizedIssue, 
    comments: any[], 
    userProfile: string, 
    intent: EngagementIntent
  ): Promise<DraftResult> {
    if (!this.client) {
      throw new Error('Groq client is not initialized (missing API key).');
    }

    const prompt = `
You are an expert open-source contributor writing a GitHub issue comment.
Your goal is to write a concise, professional, action-oriented comment based on the selected intent.

USER PROFILE:
${userProfile}

GITHUB ISSUE:
Title: ${issue.title}
Repository: ${issue.repoName}
Description:
${issue.body.substring(0, 1000)}

RECENT COMMENTS:
${comments.slice(-3).map(c => '@' + c.author + ': ' + c.body.substring(0, 200)).join('\n')}

INTENT: ${intent}

INSTRUCTIONS:
1. Do NOT use AI filler like "As an AI...", "Here is a draft", "Hope this helps", etc.
2. Do NOT invent experience or technical claims not present in the user profile.
3. Keep the tone natural, professional, and directly to the point.
4. Output ONLY valid JSON in the following strict format:
{
  "intent": "${intent}",
  "draft": "<The exact markdown text of the comment to post>",
  "reasoning": "<1-2 sentence explanation of why this draft was generated>"
}
`;

    const chatCompletion = await this.client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192', // Use 70b for better writing quality
      response_format: { type: 'json_object' },
      temperature: 0.2, 
    });

    const responseContent = chatCompletion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from Groq API');
    }

    try {
      const result = JSON.parse(responseContent) as DraftResult;
      
      const validIntents: EngagementIntent[] = ['REQUEST_ASSIGNMENT', 'PROPOSE_SOLUTION', 'ASK_CLARIFICATION', 'EXPRESS_INTEREST'];
      if (!validIntents.includes(result.intent)) {
        throw new Error('Invalid intent returned');
      }
      if (!result.draft) throw new Error('Empty draft returned');

      return result;
    } catch (err: any) {
      throw new Error(`Groq Draft Generation Failed: ${err.message}`);
    }
  }
}

export const groqEvaluator = new GroqEvaluator();
