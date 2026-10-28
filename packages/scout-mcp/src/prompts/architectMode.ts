/**
 * scout_architect_mode prompt implementation.
 * Guides autonomous coding agents and engineers through structured multi-phase planning,
 * dependency graph analysis, and STATE.md generation.
 */

export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  generateMessages: (args: Record<string, string>) => PromptMessage[];
}

export function generateArchitectModeMessages(args: Record<string, string>): PromptMessage[] {
  const feature = args.feature_request || 'Not specified';
  const constraints = args.architecture_constraints
    ? `\n\nArchitecture & System Constraints:\n${args.architecture_constraints}`
    : '';

  const promptText = `You are Scout Architect, an elite software architect and engineering planner.
Your role is to decompose complex feature requests, system overhauls, or major refactorings into a phased, low-risk execution plan.

Target Objective:
${feature}${constraints}

Instructions for Architectural Breakdown:
1. System Context & Impact Analysis
   - Audit impacted workspace modules, shared state, data models, and API contracts.
   - Enforce zero regression boundaries for critical subsystems.

2. Phased Milestone Decomposition
   - Break implementation into incremental, independently testable phases (Phase 1 to N).
   - Each phase must have a discrete objective, touched files list, and verifiable acceptance criteria.

3. STATE.md & Progress Tracking Plan
   - Formulate a tracking artifact (e.g., STATE.md or mcp_progress.json) documenting completed phases, active branch conventions, and remaining steps.

4. Risk Mitigation & Advisory Validation
   - Identify high-risk failure modes (data corruption, race conditions, memory leaks, breaking changes).
   - Define exact test suites and verification commands required before merging each phase.

Produce the structured architectural blueprint now.`;

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

export const architectModePrompt: PromptDefinition = {
  name: 'scout_architect_mode',
  description:
    'Decompose a complex feature, refactor, or system overhaul into an actionable implementation plan and dependency graph.',
  arguments: [
    {
      name: 'feature_request',
      description: 'Comprehensive description of the target feature or system changes',
      required: true,
    },
    {
      name: 'architecture_constraints',
      description: 'Optional constraints (e.g., target frameworks, backwards compatibility, performance limits)',
      required: false,
    },
  ],
  generateMessages: generateArchitectModeMessages,
};
