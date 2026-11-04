import { useState, useRef } from 'react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { AppLauncherGrid } from '../components/workspaces/AppLauncherGrid';
import { CredentialsVault } from '../components/workspaces/CredentialsVault';
import { WorkspaceEmptyState } from '../components/workspaces/WorkspaceEmptyState';
import { AddLinkModal } from '../components/workspaces/AddLinkModal';
import { workspaceLinkService } from '../services/workspaceLinkService';
import { exportWorkspaceBackup, validateWorkspaceBackup } from '../utils/workspaceBackup';
import type { WorkspaceLink } from '../types/workspaces';
import { Plus, Download, Upload, Sparkles, Filter } from 'lucide-react';

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

/** Closes #829: Workspaces page route component with complete action toolbar */
export function WorkspacesPage() {
  const { workspaces, loading } = useWorkspaces();
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLoadStarterPack = async () => {
    if (!activeWorkspace) return;
    for (const item of DEFAULT_STARTER_PACK) {
      await handleAddLink(item);
    }
  };

  const handleExportBackup = () => {
    if (!activeWorkspace) return;
    const linksMap = { [activeWorkspace.id]: links };
    const jsonString = exportWorkspaceBackup([activeWorkspace], linksMap);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-backup-${activeWorkspace.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = validateWorkspaceBackup(content);
      if (res.valid && res.data) {
        const importedLinks = Object.values(res.data.links || {}).flat();
        for (const item of importedLinks) {
          if (item?.title && item?.url) {
            await handleAddLink({
              title: item.title,
              url: item.url,
              section_name: item.section_name || 'Imported',
              icon_url: item.icon_url,
            });
          }
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading workspaces...</div>
    );
  }

  // Derive unique sections
  const sections = Array.from(new Set(links.map((l) => l.section_name || 'General')));
  const filteredLinks =
    selectedSection === 'All'
      ? links
      : links.filter((l) => (l.section_name || 'General') === selectedSection);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {activeWorkspace ? activeWorkspace.name : 'Personal Workspace'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Centrally manage internal dashboards, HRMS tools, documentation, and zero-knowledge
            secrets.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {links.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleExportBackup}
                title="Export Workspace JSON Backup"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition shadow-xs"
              >
                <Download size={14} />
                <span>Export</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Import Workspace JSON Backup"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition shadow-xs"
              >
                <Upload size={14} />
                <span>Import</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleLoadStarterPack}
            title="Load Popular Developer Tools"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition shadow-xs"
          >
            <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Starter Pack</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Plus size={15} />
            <span>Add Tool Link</span>
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
            className={`px-3 py-1 rounded-lg font-medium transition ${
              selectedSection === 'All'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
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
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  selectedSection === sec
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
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
        <WorkspaceEmptyState
          onAddFirstLink={() => setIsAddOpen(true)}
          onLoadStarterPack={handleLoadStarterPack}
          onImportBackup={() => fileInputRef.current?.click()}
        />
      ) : (
        <AppLauncherGrid
          links={filteredLinks}
          onOpenLink={(link) => window.open(link.url, '_blank')}
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
