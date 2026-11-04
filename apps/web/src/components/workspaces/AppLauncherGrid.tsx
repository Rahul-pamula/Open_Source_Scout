import React from 'react';
import type { WorkspaceLink } from '../../types/workspaces';

interface AppLauncherGridProps {
  links: WorkspaceLink[];
  onOpenLink?: (link: WorkspaceLink) => void;
  onContextMenu?: (e: React.MouseEvent, link: WorkspaceLink) => void;
}

/** Closes #796: Responsive container for squircle app tiles */
export const AppLauncherGrid: React.FC<AppLauncherGridProps> = ({
  links,
  onOpenLink,
  onContextMenu,
}) => {
  return (
    <div
      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 p-4"
      role="grid"
      aria-label="App Launcher Grid"
    >
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          onClick={() => onOpenLink?.(link)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu?.(e, link);
          }}
          className="group flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl p-2 transition-transform duration-150 hover:-translate-y-1 active:scale-95"
          tabIndex={0}
        >
          <div className="w-16 h-16 rounded-[22%] bg-gray-800/80 border border-gray-700/60 shadow-lg flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:shadow-emerald-500/20 group-hover:border-emerald-500/40">
            {link.icon_url ? (
              <img src={link.icon_url} alt={link.title} className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-sm font-bold text-gray-300">
                {link.title.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="mt-2 text-xs font-medium text-gray-300 group-hover:text-emerald-400 text-center line-clamp-2 max-w-[80px]">
            {link.title}
          </span>
        </button>
      ))}
    </div>
  );
};
