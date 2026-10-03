import React, { useState, useEffect } from 'react';
import { FileEdit, Trash2, ArrowUpRight, Clock, Paperclip, Mail } from 'lucide-react';
import { Draft } from '../lib/types.ts';
import { removeDraft } from '../lib/store.ts';

interface DraftsManagerProps {
  drafts: Draft[];
  onOpenDraft: (draft: Draft) => void;
  onNewTransfer: () => void;
}

export const DraftsManager: React.FC<DraftsManagerProps> = ({
  drafts,
  onOpenDraft,
  onNewTransfer,
}) => {
  const [localDraft, setLocalDraft] = useState<{
    recipient?: string;
    subject?: string;
    body?: string;
    updatedAt?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('omnimail_active_draft');
      if (raw) {
        setLocalDraft(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleOpenLocalDraft = () => {
    if (!localDraft) return;
    const syntheticDraft: Draft = {
      id: 'local_active',
      userId: '',
      recipientEmail: localDraft.recipient || '',
      subject: localDraft.subject || '',
      body: localDraft.body || '',
      sendCopyToSelf: true,
      attachmentCount: 0,
      attachmentSummary: '',
      createdAt: new Date().toISOString(),
      updatedAt: localDraft.updatedAt || new Date().toISOString(),
    };
    onOpenDraft(syntheticDraft);
  };

  const clearLocalDraft = () => {
    localStorage.removeItem('omnimail_active_draft');
    setLocalDraft(null);
  };

  const handleDeleteCloudDraft = async (draftId: string) => {
    if (window.confirm('Delete this saved draft?')) {
      try {
        await removeDraft(draftId);
      } catch (err) {
        console.error('Failed deleting draft:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Saved Drafts</h2>
            <p className="text-xs text-slate-500">
              Restore and finalize draft email transfers before automated sending
            </p>
          </div>
        </div>

        <button
          onClick={onNewTransfer}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          + Compose New
        </button>
      </div>

      {/* Local Auto-Saved Draft Alert / Card */}
      {localDraft && (localDraft.recipient || localDraft.subject || localDraft.body) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Local Browser Storage
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Auto-saved {localDraft.updatedAt || 'recently'}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mt-1">
                {localDraft.subject || '(Un-titled draft)'}
              </h4>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                To: {localDraft.recipient || '(No recipient yet)'}
              </p>
              {localDraft.body && (
                <p className="text-xs text-slate-500 line-clamp-1 mt-1 italic">
                  "{localDraft.body}"
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={clearLocalDraft}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                onClick={handleOpenLocalDraft}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Continue Editing</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Saved Drafts List */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Cloud-Synced Drafts ({drafts.length})
        </h3>

        {drafts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FileEdit className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No cloud drafts saved</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When composing a transfer, click "Save Draft" to preserve your message, recipient, and automated attachments.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {draft.subject || '(No subject)'}
                    </span>
                    {draft.attachmentCount > 0 && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Paperclip className="w-3 h-3 mr-1" />
                        {draft.attachmentCount} files
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-mono truncate">{draft.recipientEmail || 'No recipient set'}</span>
                  </div>

                  {draft.body && (
                    <p className="text-xs text-slate-500 line-clamp-1 italic">
                      "{draft.body}"
                    </p>
                  )}

                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 pt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>Saved: {new Date(draft.updatedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleDeleteCloudDraft(draft.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onOpenDraft(draft)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-xl transition-all cursor-pointer"
                  >
                    <span>Resume Draft</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
