import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteLinkConfirmDialogProps {
  isOpen: boolean;
  linkTitle?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Closes #812: Destructive link removal confirmation */
export const DeleteLinkConfirmDialog: React.FC<DeleteLinkConfirmDialogProps> = ({
  isOpen,
  linkTitle,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-rose-900/40 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={24} />
        </div>
        <h4 className="text-sm font-semibold text-white">Delete Link?</h4>
        <p className="mt-1 text-xs text-gray-400">
          Are you sure you want to remove{' '}
          <span className="text-gray-200 font-medium">"{linkTitle}"</span> from this workspace?
        </p>
        <div className="mt-5 flex items-center justify-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center space-x-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-xl"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
