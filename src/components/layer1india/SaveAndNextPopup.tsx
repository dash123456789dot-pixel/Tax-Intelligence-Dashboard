import React, { useState } from 'react';

interface SaveAndNextPopupProps {
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function SaveAndNextPopup({ onConfirm, onCancel, isSubmitting = false }: SaveAndNextPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-[400px] shadow-2xl">
        <h3 className="text-lg font-medium text-white mb-2">Save & Next</h3>
        <p className="text-sm text-white/60 mb-6">
          Are you sure you want to save this step's data and proceed to the next section?
        </p>
        <div className="flex justify-end gap-3">
          <button
            disabled={isSubmitting}
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
