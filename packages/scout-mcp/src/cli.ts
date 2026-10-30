/**
 * Scout MCP CLI argument parser, help text, and version metadata.
 */

export const SCOUT_MCP_VERSION = '2.0.6';

export const SCOUT_MCP_HELP = `
Scout MCP Server (open-source-scout-mcp)

Usage:
  scout-mcp [command|options]

Commands:
  doctor           Run environment, git worktree, and storage diagnostics
  run              Start Scout MCP server on stdio transport (default)

Options:
  -v, --version    Show version number
  -h, --help       Show help text

Documentation:
  https://github.com/Rahul-pamula/Open_Source_Scout
`.trim();

export function parseCliAction(args: string[]): 'help' | 'version' | 'doctor' | 'run' {
  if (args.includes('--version') || args.includes('-v') || args.includes('version')) {
    return 'version';
  }
  if (args.includes('--help') || args.includes('-h') || args.includes('help')) {
    return 'help';
  }
  if (args.includes('doctor')) {
    return 'doctor';
  }
  return 'run';
}
