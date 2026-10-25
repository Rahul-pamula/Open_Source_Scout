import { Search, X } from 'lucide-react';

interface TabSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  totalCount?: number;
  filteredCount?: number;
  className?: string;
}

export function TabSearchBar({
  value,
  onChange,
  placeholder = 'Search by repo name...',
  totalCount,
  filteredCount,
  className = '',
}: TabSearchBarProps) {
  const isFiltered =
    value.trim().length > 0 && totalCount !== undefined && filteredCount !== undefined;

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative flex items-center w-full sm:w-64">
        <Search
          size={13}
          className="absolute left-2.5 text-zinc-400 pointer-events-none shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full pl-8 pr-16 py-1 text-xs font-mono bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded shadow-sm"
        />
        {value ? (
          <div className="absolute right-2 flex items-center gap-1">
            {isFiltered && (
              <span className="font-mono text-[9px] text-zinc-400 hidden sm:inline">
                {filteredCount}/{totalCount}
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
              title="Clear search"
              aria-label="Clear search filter"
            >
              <X size={12} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
