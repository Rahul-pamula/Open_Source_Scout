import Groq from 'groq-sdk';
import type { NormalizedIssue, EvaluationResult } from '../types.js';

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
}

export const groqEvaluator = new GroqEvaluator();
