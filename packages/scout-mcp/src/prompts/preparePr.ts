/**
 * scout_prepare_pr prompt implementation.
 * Generates maintainer-empathetic, comprehensive pull request descriptions with
 * change summaries, verification checklists, linked issues, and co-author attribution.
 */

import type { PromptDefinition, PromptMessage } from './architectMode.js';

export function generatePreparePrMessages(args: Record<string, string>): PromptMessage[] {
  const title = args.pr_title || 'feat(core): update implementation';
  const summary = args.changes_summary || 'Summary of implemented changes';
  const issue = args.issue_number ? `\n\nLinked Issue:\nCloses #${args.issue_number.replace(/^#/, '')}` : '';
  const verification = args.test_verification
    ? `\n\nTest Verification Notes:\n${args.test_verification}`
    : '';
  const coauthor = args.coauthor ? `\n\nRequired Git Co-Author Trailer:\n${args.coauthor}` : '';

  const promptText = `You are Scout PR Drafter, a senior open-source contributor and technical writer.
Your job is to draft an empathetic, structured, and review-ready pull request description for maintainers.

Pull Request Context:
Title: ${title}
Changes Summary:
${summary}${issue}${verification}${coauthor}

Drafting Requirements:
1. Pull Request Title
   - Adhere to Conventional Commits: feat(scope), fix(scope), refactor(scope), test(scope), docs(scope).

2. Overview & Objective
   - Provide a 1-2 sentence executive summary of what problem this PR solves and why.

3. Detailed Technical Changes
   - Use clean markdown bullet points grouped by subsystem or file.
   - Highlight architectural decisions, boundary validations, or backwards-compatibility considerations.

4. Test Plan & Verification Checklist
   - Explicit list of automated tests added, unit/integration runs executed, and pass counts.
   - Mention edge case testing (concurrency, error recovery, bounds).

5. Attribution & Co-Authors
   - Ensure an empty line precedes any "Co-authored-by: Name <email>" git trailer at the very end.

Produce the polished pull request description now in standard GitHub Markdown.`;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: promptText,
      },
    },
  ];
}

export const preparePrPrompt: PromptDefinition = {
  name: 'scout_prepare_pr',
  description:
    'Draft a comprehensive, maintainer-empathetic pull request description with summary, verification notes, and co-author attribution.',
  arguments: [
    {
      name: 'pr_title',
      description: 'Conventional commit title for the pull request',
      required: true,
    },
    {
      name: 'changes_summary',
      description: 'Bullet points or summary describing the core changes made',
      required: true,
    },
    {
      name: 'issue_number',
      description: 'GitHub issue number to close (e.g., 589)',
      required: false,
    },
    {
      name: 'test_verification',
      description: 'Summary of automated tests executed and verification evidence',
      required: false,
    },
    {
      name: 'coauthor',
      description: 'Git co-author trailer (e.g., Co-authored-by: Name <email>)',
      required: false,
    },
  ],
  generateMessages: generatePreparePrMessages,
};
