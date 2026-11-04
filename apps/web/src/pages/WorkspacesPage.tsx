import { useState } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { AppLauncherGrid } from '../components/workspaces/AppLauncherGrid';
import { CredentialsVault } from '../components/workspaces/CredentialsVault';
import { WorkspaceEmptyState } from '../components/workspaces/WorkspaceEmptyState';
import { AddLinkModal } from '../components/workspaces/AddLinkModal';
import { workspaceLinkService } from '../services/workspaceLinkService';
import type { WorkspaceLink } from '../types/workspaces';

/** Closes #829: Workspaces page route component */
export function WorkspacesPage() {
  const { workspaces, loading } = useWorkspaces();
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const activeWorkspace = workspaces[0] || null;

  const handleAddLink = async (data: {
    title: string;
    url: string;
    section_name: string;
    icon_url?: string;
  }) => {
    if (!activeWorkspace) return;
    const created = await workspaceLinkService.addLink(activeWorkspace.id, data);
    setLinks((prev) => [...prev, created]);
  };

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading workspaces...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Centrally manage internal dashboards, HRMS tools, documentation, and zero-knowledge
            secrets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20"
        >
          + Add Tool Link
        </button>
      </div>

      {links.length === 0 ? (
        <WorkspaceEmptyState onAddFirstLink={() => setIsAddOpen(true)} />
      ) : (
        <AppLauncherGrid links={links} onOpenLink={(link) => window.open(link.url, '_blank')} />
      )}

      <CredentialsVault credentials={[]} />

      <AddLinkModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={handleAddLink} />
    </div>
  );
}
