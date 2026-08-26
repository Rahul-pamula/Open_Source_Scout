import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { BookOpen, FileText, FolderOpen, ChevronRight, Menu, X } from 'lucide-react';

// Dynamically load all user guide markdown files
const allDocsRaw = import.meta.glob('../content/user-guide/**/*.md', { query: '?raw', import: 'default', eager: true });

// Helper to clean up file paths into readable titles
const formatTitle = (path: string) => {
  const filename = path.split('/').pop()?.replace('.md', '') || '';
  return filename
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Organize docs into a simple flat structure for the sidebar
const buildSidebar = () => {
  const structure: Record<string, any> = { Guide: [] };

  // Sort paths alphabetically so 01_, 02_, etc. are ordered correctly
  Object.keys(allDocsRaw).sort().forEach(path => {
    // Determine the logical path name for the URL
    // e.g. ../content/user-guide/01_Welcome_to_Scout.md -> 01_welcome_to_scout
    const cleanPath = path.replace('../content/user-guide/', '').replace('.md', '').toLowerCase();
    
    // Remove the leading "01_" from the title for a cleaner display
    let title = formatTitle(path);
    title = title.replace(/^[0-9]+ /g, '');
    
    structure.Guide.push({ title, path: cleanPath, rawPath: path });
  });

  return structure;
};

const sidebarStructure = buildSidebar();

export function Docs() {
  const location = useLocation();
  const [content, setContent] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Extract the current doc path from the URL
  // e.g. /docs/01_welcome_to_scout
  const currentPath = location.pathname.replace('/docs', '').replace(/^\//, '') || '01_welcome_to_scout';

  useEffect(() => {
    // Find the raw markdown content for the current path
    const targetDoc = Object.keys(allDocsRaw).find(
      key => key.replace('../content/user-guide/', '').replace('.md', '').toLowerCase() === currentPath
    );

    if (targetDoc && allDocsRaw[targetDoc]) {
      setContent(allDocsRaw[targetDoc] as string);
    } else {
      setContent('# 404: Document Not Found\n\nThe requested document does not exist.');
    }
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2 font-bold text-zinc-900">
          <BookOpen size={20} className="text-emerald-500" />
          Scout Docs
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-zinc-100 rounded-md">
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 fixed md:sticky top-0 left-0 h-screen w-72 bg-zinc-50 border-r border-zinc-200 overflow-y-auto z-10 flex flex-col
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-zinc-200 bg-white sticky top-0 z-10">
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
            <BookOpen size={24} />
          </div>
          <h1 className="font-black text-xl tracking-tight text-zinc-900">Scout Docs</h1>
        </div>

        <nav className="p-4 space-y-8 flex-1">
          {Object.entries(sidebarStructure).map(([folder, items]) => (
            items.length > 0 && (
              <div key={folder}>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 px-3">
                  <FolderOpen size={14} />
                  {formatTitle(folder)}
                </h3>
                <ul className="space-y-1">
                  {items.map((item: any) => {
                    const isActive = currentPath === item.path;
                    return (
                      <li key={item.path}>
                        <Link
                          to={`/docs/${item.path}`}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`
                            flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors
                            ${isActive 
                              ? 'bg-emerald-50 text-emerald-700 font-bold' 
                              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={16} className={isActive ? 'text-emerald-500' : 'text-zinc-400'} />
                            <span className="truncate">{item.title}</span>
                          </div>
                          {isActive && <ChevronRight size={14} className="text-emerald-500 flex-shrink-0" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl px-6 py-8 md:p-12 w-full overflow-x-hidden">
        {content ? (
          <div className="bg-white rounded-2xl md:border md:border-zinc-200 md:shadow-sm md:p-10">
            <MarkdownRenderer content={content} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400 font-mono text-sm">
            Loading document...
          </div>
        )}
      </main>
    </div>
  );
}
