import { useState, useEffect } from 'react';
import { FileText, ExternalLink, Pencil, Check, X, Loader2 } from 'lucide-react';
import { normalizeDocUrl, isValidGoogleDocsUrl, isValidWebUrl } from '../utils/urlHelpers';

interface EditableInterviewNotesBlockProps {
  initialUrl?: string;
  onSave: (url: string) => Promise<void>;
  isPending?: boolean;
  className?: string;
}

export function EditableInterviewNotesBlock({
  initialUrl = '',
  onSave,
  isPending = false,
  className = '',
}: EditableInterviewNotesBlockProps) {
  const [isEditing, setIsEditing] = useState(!initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  useEffect(() => {
    setInputUrl(initialUrl || '');
    if (initialUrl) {
      setIsEditing(false);
    }
  }, [initialUrl]);

  const handleSave = async () => {
    const trimmed = inputUrl.trim();

    if (!trimmed) {
      // User cleared the URL
      setValidationError(null);
      setIsSavingLocal(true);
      try {
        await onSave('');
        setIsEditing(false);
      } catch (err: any) {
        setValidationError(err.message || 'Failed to save URL');
      } finally {
        setIsSavingLocal(false);
      }
      return;
    }

    const normalized = normalizeDocUrl(trimmed);

    // Validate that it's a valid web URL, ideally Google Docs
    if (!isValidWebUrl(normalized)) {
      setValidationError('Please enter a valid URL (e.g. https://docs.google.com/...)');
      return;
    }

    // Gentle warning if not google docs but allow saving
    if (!isValidGoogleDocsUrl(normalized)) {
      // Still allowed as generic doc link
    }

    setValidationError(null);
    setIsSavingLocal(true);
    try {
      await onSave(normalized);
      setIsEditing(false);
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save URL');
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleCancel = () => {
    setInputUrl(initialUrl || '');
    setValidationError(null);
    if (initialUrl) {
      setIsEditing(false);
    }
  };

  const busy = isPending || isSavingLocal;

  // View: Saved State
  if (!isEditing && initialUrl) {
    return (
      <div
        className={`flex items-center justify-between gap-2 p-2 bg-emerald-50/60 border border-emerald-200 rounded text-xs ${className}`}
      >
        <a
          href={initialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono font-bold text-emerald-800 hover:text-emerald-950 hover:underline transition-colors truncate max-w-[80%]"
          title={initialUrl}
        >
          <FileText size={13} className="text-emerald-600 shrink-0" />
          <span className="truncate">Open Interview Notes</span>
          <ExternalLink size={11} className="shrink-0" />
        </a>
        <button
          onClick={() => setIsEditing(true)}
          disabled={busy}
          className="text-zinc-400 hover:text-zinc-700 p-1 rounded hover:bg-emerald-100/50 transition-colors shrink-0 disabled:opacity-50"
          title="Edit Google Doc link"
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  // View: Editing or Empty State
  return (
    <div
      className={`flex flex-col gap-1 p-2 bg-zinc-50 border border-zinc-200 rounded text-xs ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <FileText size={13} className="text-zinc-400 shrink-0 ml-1" />
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => {
            setInputUrl(e.target.value);
            if (validationError) setValidationError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          disabled={busy}
          placeholder="Paste Google Doc URL (https://docs.google.com/...)"
          className="flex-1 bg-white border border-zinc-300 px-2 py-1 text-xs text-zinc-900 rounded focus:outline-none focus:border-emerald-500 font-mono"
        />
        <button
          onClick={handleSave}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
          title="Save link"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          <span>Save</span>
        </button>
        {initialUrl && (
          <button
            onClick={handleCancel}
            disabled={busy}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition-colors shrink-0"
            title="Cancel"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {validationError && (
        <span className="text-[11px] text-red-600 font-sans pl-1">{validationError}</span>
      )}
    </div>
  );
}
