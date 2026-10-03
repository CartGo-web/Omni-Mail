import React from 'react';
import { Send, X, FileText, Image as ImageIcon, Video, AlertCircle, Clock } from 'lucide-react';
import { FileAttachment } from '../lib/types.ts';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  senderEmail: string;
  recipientEmail: string;
  sendCopyToSelf: boolean;
  subject: string;
  attachments: FileAttachment[];
  scheduledFor?: string | null;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  senderEmail,
  recipientEmail,
  sendCopyToSelf,
  subject,
  attachments,
  scheduledFor,
}) => {
  if (!isOpen) return null;

  const totalSize = attachments.reduce((acc, curr) => acc + curr.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {scheduledFor ? 'Confirm Scheduled Transfer' : 'Confirm Email Transfer'}
              </h3>
              <p className="text-xs text-slate-500">Will be dispatched via your connected Gmail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Sender & Recipient Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-sm">
            <div className="flex items-start justify-between">
              <span className="text-slate-500 font-medium w-24">From:</span>
              <span className="font-semibold text-slate-800 text-right break-all">{senderEmail}</span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-slate-500 font-medium w-24">To:</span>
              <span className="font-semibold text-blue-600 text-right break-all">{recipientEmail}</span>
            </div>
            {sendCopyToSelf && (
              <div className="flex items-start justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
                <span className="text-slate-500">Self Copy:</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                  Copy sent to {senderEmail}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium w-24">Subject:</span>
              <span className="text-slate-800 text-right font-medium italic break-words flex-1 ml-2">
                "{subject || '(No Subject)'}"
              </span>
            </div>
            {scheduledFor && (
              <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="flex items-center font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Scheduled Delivery:
                </span>
                <span className="font-semibold">{new Date(scheduledFor).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Attachments Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Attachments ({attachments.length})
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Total size: {formatSize(totalSize)}
              </span>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center">
                No attachments added. Message will send text only.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      {getFileIcon(file.type)}
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                    </div>
                    <span className="text-slate-500 whitespace-nowrap">{formatSize(file.size)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notice banner */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-xs text-blue-800">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p>
              By confirming, this email and attached documents/media will be dispatched directly through your connected Gmail account with your explicit permission.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel &amp; Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Dispatching...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{scheduledFor ? 'Schedule Email Transfer' : 'Confirm & Send via Gmail'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
