import Groq from 'https://esm.sh/groq-sdk@0.9.1';
import type { NormalizedIssue, NormalizedComment, ClaimResult, ClaimStatusType } from './types.ts';

export class ClaimDetector {
  private client: Groq | null = null;

  // Layer 1: Regex to catch strong claim signals
  private claimRegex = /assign|take this|work on this|can i have|d like to do|grab this/i;

  constructor() {
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (apiKey) {
      this.client = new Groq({ apiKey });
    }
  }

  public async detectClaimStatus(issue: NormalizedIssue, comments: NormalizedComment[]): Promise<ClaimResult> {
    if (issue.isAssigned) {
      return {
        claimStatus: 'MAINTAINER_ASSIGNED',
        confidence: 1.0,
        evidence: 'Issue is officially assigned on GitHub.',
      };
    }

    if (!comments || comments.length === 0) {
      return { claimStatus: 'NONE', confidence: 1.0 };
    }

    // Layer 1: Deterministic Candidate Detection
    const candidateComments = comments.filter(c => this.claimRegex.test(c.body));

    if (candidateComments.length === 0) {
      return { claimStatus: 'NONE', confidence: 0.9 };
    }

    // Layer 2: Groq Contextual Evaluation
    if (!this.client) {
      console.warn('[ClaimDetector] No Groq client. Falling back to UNCERTAIN for candidate comments.');
      return {
        claimStatus: 'UNCERTAIN',
        confidence: 0.5,
        evidence: 'Detected claim keywords, but LLM evaluation is disabled.',
      };
    }

    const commentsText = candidateComments.map(c => `[@${c.author}]: ${c.body}`).join('\n\n');

    const prompt = `
You are evaluating a GitHub issue's comment thread to determine if a developer has already claimed it or if a maintainer has assigned it.
The issue is currently UNASSIGNED officially on GitHub, but users might have asked to work on it in the comments.

ISSUE TITLE: ${issue.title}

CANDIDATE COMMENTS:
${commentsText}

Evaluate the claim status based on these comments.
Choose exactly one of these statuses:
- NONE (no one is actually trying to claim it, false positive keyword)
- INTEREST_EXPRESSED (someone asked to take it, e.g., "Can I take this?")
- MAINTAINER_ASSIGNED (a maintainer explicitly said "it's yours" or similar in the comments)
- UNCERTAIN (ambiguous)

Output ONLY valid JSON in this exact format:
{
  "claimStatus": "NONE" | "INTEREST_EXPRESSED" | "MAINTAINER_ASSIGNED" | "UNCERTAIN",
  "claimant": "<username of the person claiming it, or null>",
  "confidence": <float between 0.0 and 1.0>,
  "evidence": "<1 sentence quoting the relevant part of the comment>"
}
`;

    try {
      const chatCompletion = await this.client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const responseContent = chatCompletion.choices[0]?.message?.content;
      if (!responseContent) throw new Error('No response');

      const result = JSON.parse(responseContent) as ClaimResult;
      
      // Ensure the status is valid
      const validStatuses = ['NONE', 'INTEREST_EXPRESSED', 'MAINTAINER_ASSIGNED', 'UNCERTAIN'];
      if (!validStatuses.includes(result.claimStatus)) {
        result.claimStatus = 'UNCERTAIN';
      }
      
      return result;
    } catch (err) {
      console.error('[ClaimDetector] Groq evaluation failed:', err);
      return {
        claimStatus: 'UNCERTAIN',
        confidence: 0.0,
        evidence: 'LLM parsing failed.',
      };
    }
  }
}

export const claimDetector = new ClaimDetector();
