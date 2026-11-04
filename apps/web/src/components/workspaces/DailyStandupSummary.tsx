import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare } from 'lucide-react';
import type { WorkspaceLink } from '../../types/workspaces';

interface DailyStandupSummaryProps {
  isOpen: boolean;
  workspaceName: string;
  links: WorkspaceLink[];
  onClose: () => void;
}

/** Closes #832: Format daily standup notes for Slack/Teams */
export const DailyStandupSummary: React.FC<DailyStandupSummaryProps> = ({
  isOpen,
  workspaceName,
  links,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const markdown = `*Daily Standup - ${workspaceName}*
📅 Date: ${new Date().toLocaleDateString()}

*🚀 Active Quick Links:*
${links.map((l) => `• ${l.title}: ${l.url}`).join('\n')}

*📝 Updates:*
• Continued feature implementation and PR validation
• Resolved integration tests and verified zero-knowledge secrets vault`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2 text-white">
            <MessageSquare size={20} className="text-emerald-400" />
            <h3 className="text-base font-semibold">Daily Standup Markdown Report</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <textarea
            readOnly
            rows={8}
            value={markdown}
            className="w-full bg-gray-800 text-xs font-mono text-gray-200 p-3 rounded-xl border border-gray-700 select-all focus:outline-none"
          />
        </div>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
