import { FileText, ExternalLink } from 'lucide-react';

interface GoogleDocsLinkButtonProps {
  className?: string;
  label?: string;
  title?: string;
  docsUrl?: string;
}

export function GoogleDocsLinkButton({
  className = '',
  label = 'Google Docs',
  title = 'Open Google Docs in a new tab',
  docsUrl = 'https://docs.google.com/',
}: GoogleDocsLinkButtonProps) {
  return (
    <a
      href={docsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium text-zinc-700 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300 transition-colors ${className}`}
    >
      <FileText size={13} className="text-blue-600 shrink-0" />
      <span>{label}</span>
      <ExternalLink size={11} className="text-zinc-400 shrink-0 ml-0.5" />
    </a>
  );
}
