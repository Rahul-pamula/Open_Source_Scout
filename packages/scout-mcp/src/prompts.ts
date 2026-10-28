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
import { debugIssuePrompt } from './prompts/debugIssue.js';
import { preparePrPrompt } from './prompts/preparePr.js';

export const SCOUT_PROMPTS: PromptDefinition[] = [
  architectModePrompt,
  debugIssuePrompt,
  preparePrPrompt,
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
