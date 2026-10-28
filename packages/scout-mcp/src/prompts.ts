/**
 * Scout MCP Prompts registry and handler functions.
 * Provides pre-engineered workflows for software engineering, architecture,
 * debugging, and pull request preparation.
 */

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  generateMessages: (args: Record<string, string>) => Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}

import { architectModePrompt } from './prompts/architectMode.js';

export const SCOUT_PROMPTS: PromptDefinition[] = [
  architectModePrompt,
  {
    name: 'scout_debug_issue',
    description:
      'Perform systematic root cause analysis, trace error logs, formulate hypotheses, and identify minimal bug reproductions.',
    arguments: [
      {
        name: 'issue_description',
        description: 'Description of the failing behavior or regression',
        required: true,
      },
      {
        name: 'error_logs',
        description: 'Stack traces, console error output, or test failures',
        required: false,
      },
      {
        name: 'failing_file',
        description: 'Suspected file path or component name',
        required: false,
      },
    ],
    generateMessages: (args) => {
      const issue = args.issue_description || 'Not provided';
      const logs = args.error_logs ? `\nError Logs:\n${args.error_logs}` : '';
      const file = args.failing_file ? `\nSuspected File: ${args.failing_file}` : '';
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are Scout Debugger, a specialist in systematic root cause isolation. Investigate the following issue, trace causality, identify failure modes, and propose a minimal fix with unit test coverage.\n\nIssue Description:\n${issue}${file}${logs}\n\nInvestigation Protocol:\n1. Failure Mode Classification\n2. Execution Flow & Trace Analysis\n3. Root Cause Hypothesis\n4. Targeted Verification & Minimal Patch`,
          },
        },
      ];
    },
  },
  {
    name: 'scout_prepare_pr',
    description:
      'Draft a comprehensive pull request description including summary, verification, breaking changes, and co-author attribution trailer.',
    arguments: [
      {
        name: 'pr_title',
        description: 'Conventional commit title for the pull request',
        required: true,
      },
      {
        name: 'changes_summary',
        description: 'Bullet list or prose summarizing key implementation changes',
        required: true,
      },
      {
        name: 'issue_number',
        description: 'GitHub issue number to link (e.g., 586)',
        required: false,
      },
      {
        name: 'coauthor',
        description: 'Git co-author trailer (e.g. Co-authored-by: Name <email>)',
        required: false,
      },
    ],
    generateMessages: (args) => {
      const title = args.pr_title || 'Update';
      const summary = args.changes_summary || 'No summary provided';
      const issue = args.issue_number ? `\nCloses #${args.issue_number}` : '';
      const coauthor = args.coauthor ? `\n\n${args.coauthor}` : '';

      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Draft a high-quality GitHub pull request for the following changes:\n\nTitle: ${title}\nSummary of Changes:\n${summary}${issue}${coauthor}\n\nFormat the output using GitHub Markdown with:\n- Summary\n- Key Changes\n- Verification and Tests\n- Linked Issues & Attribution`,
          },
        },
      ];
    },
  },
];

/**
 * Returns metadata list of all available Scout workflow prompts.
 */
export function listScoutPrompts() {
  return SCOUT_PROMPTS.map(({ name, description, arguments: promptArgs }) => ({
    name,
    description,
    arguments: promptArgs,
  }));
}

/**
 * Generates prompt messages for a specific requested prompt name.
 */
export function getScoutPrompt(name: string, args: Record<string, string> = {}) {
  const prompt = SCOUT_PROMPTS.find((p) => p.name === name);
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }

  // Validate required arguments
  for (const arg of prompt.arguments || []) {
    if (arg.required && !args[arg.name]) {
      throw new Error(`Missing required argument '${arg.name}' for prompt '${name}'`);
    }
  }

  return {
    description: prompt.description,
    messages: prompt.generateMessages(args),
  };
}
