import { useState, useEffect } from 'react';

/** Closes #802: Persistent local collapse state for sections */
export function useSectionCollapse(workspaceId: string) {
  const key = `scout_collapsed_${workspaceId}`;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(collapsed));
    } catch {}
  }, [collapsed, key]);

  const toggle = (sectionName: string) => {
    setCollapsed((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  return { collapsed, toggle };
}
