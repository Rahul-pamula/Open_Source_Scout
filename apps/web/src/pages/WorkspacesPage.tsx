import { useState, useEffect } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { AppLauncherGrid } from '../components/workspaces/AppLauncherGrid';
import { CredentialsVault } from '../components/workspaces/CredentialsVault';
import { WorkspaceEmptyState } from '../components/workspaces/WorkspaceEmptyState';
import { AddLinkModal } from '../components/workspaces/AddLinkModal';
import { workspaceLinkService } from '../services/workspaceLinkService';
import type { WorkspaceLink } from '../types/workspaces';
import { Plus, Filter } from 'lucide-react';

export const DEFAULT_STARTER_PACK = [
  {
    title: 'GitHub',
    url: 'https://github.com',
    section_name: 'Developer Tools',
    icon_url: 'https://github.githubassets.com/favicons/favicon.png',
  },
  {
    title: 'Supabase',
    url: 'https://supabase.com/dashboard',
    section_name: 'Cloud & Database',
    icon_url: 'https://supabase.com/favicon/favicon-196x196.png',
  },
  {
    title: 'Linear',
    url: 'https://linear.app',
    section_name: 'Project Management',
    icon_url: 'https://linear.app/favicon.ico',
  },
  {
    title: 'Vercel',
    url: 'https://vercel.com/dashboard',
    section_name: 'Deployment',
    icon_url: 'https://vercel.com/favicon.ico',
  },
  {
    title: 'Figma',
    url: 'https://www.figma.com',
    section_name: 'Design',
    icon_url: 'https://static.figma.com/app/icon/1/favicon.png',
  },
  {
    title: 'Claude AI',
    url: 'https://claude.ai',
    section_name: 'AI Assistants',
    icon_url: 'https://claude.ai/favicon.ico',
  },
];

/** Closes #829: Simple, elegant Workspaces page focused on quick tools and links */
export function WorkspacesPage() {
  const { workspaces, loading } = useWorkspaces();
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('All');

  const activeWorkspace = workspaces[0] || null;
  const activeWorkspaceId = activeWorkspace?.id || 'default-personal-workspace';

  // Load links whenever active workspace is resolved
  useEffect(() => {
    let isMounted = true;
    workspaceLinkService.listLinks(activeWorkspaceId).then((items) => {
      if (isMounted) {
        setLinks(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeWorkspaceId]);

  const handleAddLink = async (data: {
    title: string;
    url: string;
    section_name: string;
    icon_url?: string;
  }) => {
    const created = await workspaceLinkService.addLink(activeWorkspaceId, data);
    setLinks((prev) => [...prev, created]);
  };

  const handleDeleteLink = async (linkId: string) => {
    await workspaceLinkService.deleteLink(activeWorkspaceId, linkId);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  if (loading && !activeWorkspace) {
    return <div className="p-8 text-sm text-zinc-500 font-medium">Loading workspace...</div>;
  }

  // Derive unique sections
  const sections = Array.from(new Set(links.map((l) => l.section_name || 'General')));
  const filteredLinks =
    selectedSection === 'All'
      ? links
      : links.filter((l) => (l.section_name || 'General') === selectedSection);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">
            {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Centrally manage your frequently used tools, internal dashboards, and quick links.
          </p>
        </div>

        {/* Action Button: Single, prominent + Add Link */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Link</span>
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      {links.length > 0 && sections.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs">
          <Filter size={13} className="text-zinc-400 shrink-0" />
          <button
            type="button"
            onClick={() => setSelectedSection('All')}
            className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
              selectedSection === 'All'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All ({links.length})
          </button>
          {sections.map((sec) => {
            const count = links.filter((l) => (l.section_name || 'General') === sec).length;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  selectedSection === sec
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {sec} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid or Empty State */}
      {links.length === 0 ? (
        <WorkspaceEmptyState onAddFirstLink={() => setIsAddOpen(true)} />
      ) : (
        <AppLauncherGrid
          links={filteredLinks}
          onOpenLink={(link) => window.open(link.url, '_blank')}
          onDeleteLink={handleDeleteLink}
        />
      )}

      {/* Credentials Vault */}
      <CredentialsVault credentials={[]} />

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddLink}
        sections={sections}
      />
    </div>
  );
}
