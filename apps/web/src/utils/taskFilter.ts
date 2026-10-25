import type { Task } from '../types';

/**
 * Filters a collection of tasks/issues by repository name, title, or external URL.
 * Matches case-insensitively.
 */
export function filterTasksByQuery(tasks: Task[], query: string): Task[] {
  if (!query || !query.trim()) {
    return tasks;
  }

  const normalized = query.trim().toLowerCase();

  return tasks.filter((task) => {
    const repo = (task.repo_name || '').toLowerCase();
    const title = (task.title || '').toLowerCase();
    const url = (task.external_url || task.github_issue_url || '').toLowerCase();
    const externalId = (task.external_id || '').toLowerCase();

    // Direct match on repository name (e.g., 'facebook/react' or 'tabularis')
    if (repo.includes(normalized)) return true;

    // Match on issue title
    if (title.includes(normalized)) return true;

    // Match on issue URL or external issue number (e.g., '#1030' or '1030')
    if (url.includes(normalized)) return true;
    if (externalId && (`#${externalId}`.includes(normalized) || externalId.includes(normalized))) {
      return true;
    }

    return false;
  });
}
