import React from 'react';
import { X } from 'lucide-react';
import type { WorkspaceLink } from '../../types/workspaces';

interface AppLauncherGridProps {
  links: WorkspaceLink[];
  onOpenLink?: (link: WorkspaceLink) => void;
  onDeleteLink?: (linkId: string) => void;
  onContextMenu?: (e: React.MouseEvent, link: WorkspaceLink) => void;
}

/** Closes #796: Responsive container for squircle app tiles with direct launch and deletion */
export const AppLauncherGrid: React.FC<AppLauncherGridProps> = ({
  links,
  onOpenLink,
  onDeleteLink,
  onContextMenu,
}) => {
  return (
    <div
      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 p-4"
      role="grid"
      aria-label="App Launcher Grid"
    >
      {links.map((link) => (
        <div key={link.id} className="relative group/tile flex flex-col items-center">
          <button
            type="button"
            onClick={() => onOpenLink?.(link)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu?.(e, link);
            }}
            className="group flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl p-2 transition-transform duration-150 hover:-translate-y-1 active:scale-95 cursor-pointer w-full"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpenLink?.(link);
            }}
          >
            <div className="w-16 h-16 rounded-[22%] bg-white border border-zinc-200 shadow-xs flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:shadow-emerald-500/10 group-hover:border-emerald-500/40">
              {link.icon_url ? (
                <img src={link.icon_url} alt={link.title} className="w-10 h-10 object-contain" />
              ) : (
                <span className="text-sm font-bold text-zinc-700">
                  {link.title.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="mt-2 text-xs font-semibold text-zinc-700 group-hover:text-emerald-600 text-center line-clamp-2 max-w-[84px] leading-tight break-words tracking-tight select-none text-[11px] transition-colors">
              {link.title}
            </span>
          </button>

          {onDeleteLink && (
            <button
              type="button"
              title={`Remove ${link.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLink(link.id);
              }}
              className="absolute top-1 right-2 w-5 h-5 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/tile:opacity-100 transition-opacity shadow-sm cursor-pointer z-10"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
