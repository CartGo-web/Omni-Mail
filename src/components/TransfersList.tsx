import React, { useState } from 'react';
import {
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  Trash2,
  Calendar,
  FileText,
  User,
  Mail,
  Zap,
} from 'lucide-react';
import { TransferRecord } from '../lib/types.ts';
import { updateTransferStatus, removeTransfer } from '../lib/store.ts';
import { sendGmailMessage } from '../lib/gmail.ts';

interface TransfersListProps {
  transfers: TransferRecord[];
  accessToken: string | null;
  senderEmail: string;
  onSelectRecipientForNewTransfer: (email: string) => void;
}

export const TransfersList: React.FC<TransfersListProps> = ({
  transfers,
  accessToken,
  senderEmail,
  onSelectRecipientForNewTransfer,
}) => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'sent'>('all');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const filteredTransfers = transfers.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const scheduledCount = transfers.filter((t) => t.status === 'scheduled').length;
  const sentCount = transfers.filter((t) => t.status === 'sent').length;

  const handleCancelScheduled = async (id: string) => {
    if (window.confirm('Cancel this scheduled transfer?')) {
      try {
        await updateTransferStatus(id, 'cancelled');
      } catch (err) {
        console.error('Failed to cancel scheduled transfer:', err);
      }
    }
  };

  const handleSendScheduledNow = async (transfer: TransferRecord) => {
    if (!window.confirm(`Dispatch transfer to ${transfer.recipientEmail} right now?`)) {
      return;
    }

    setIsProcessingId(transfer.id);
    try {
      if (accessToken) {
        await sendGmailMessage(accessToken, {
          from: senderEmail,
          to: transfer.recipientEmail,
          cc: transfer.sendCopyToSelf ? senderEmail : undefined,
          subject: transfer.subject,
          body: transfer.body,
          attachments: [],
        });
      } else {
        await fetch('/api/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderEmail,
            to: transfer.recipientEmail,
            subject: transfer.subject,
            body: transfer.body,
            attachments: [],
            sendCopyToSelf: transfer.sendCopyToSelf,
          }),
        });
      }

      await updateTransferStatus(transfer.id, 'sent', new Date().toISOString());
    } catch (err) {
      console.error('Immediate dispatch failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to send scheduled transfer');
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Delete this transfer log record?')) {
      try {
        await removeTransfer(id);
      } catch (err) {
        console.error('Failed deleting transfer record:', err);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transfer Logs &amp; Queue</h2>
            <p className="text-xs text-slate-500">
              Audit delivered files and manage automated scheduled queues
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({transfers.length})
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'scheduled' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scheduled Queue ({scheduledCount})
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'sent' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Delivered ({sentCount})
          </button>
        </div>
      </div>

      {/* Transfer Items */}
      {filteredTransfers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No transfer records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Sent emails and scheduled deliveries will appear here with delivery timestamps and attached file audits.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransfers.map((item) => {
            const isScheduled = item.status === 'scheduled';
            const isSent = item.status === 'sent';
            const isCancelled = item.status === 'cancelled';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {isScheduled && (
                      <span className="inline-flex items-center text-xs font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" />
                        Scheduled for {item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : 'Later'}
                      </span>
                    )}
                    {isSent && (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Delivered via Gmail
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Cancelled
                      </span>
                    )}

                    <span className="font-bold text-slate-900 text-sm truncate">
                      {item.subject || '(No Subject)'}
                    </span>
                  </div>

                  {/* Recipient & Sender */}
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>To: <strong className="font-mono text-slate-800">{item.recipientEmail}</strong></span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <span>From: {item.senderEmail}</span>
                    </div>

                    {item.sendCopyToSelf && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Copy sent to self
                      </span>
                    )}
                  </div>

                  {/* Files list / audit */}
                  {item.fileCount > 0 && (
                    <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-700">
                        {item.fileCount} file(s) ({formatSize(item.totalSizeBytes)}):
                      </span>
                      <span className="truncate italic text-slate-600">
                        {item.fileNames || 'Documents & Media'}
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {item.sentAt
                        ? `Sent: ${new Date(item.sentAt).toLocaleString()}`
                        : `Queued: ${new Date(item.createdAt).toLocaleString()}`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0 self-end md:self-center">
                  {isScheduled && (
                    <>
                      <button
                        onClick={() => handleSendScheduledNow(item)}
                        disabled={isProcessingId === item.id}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Send Right Now</span>
                      </button>
                      <button
                        onClick={() => handleCancelScheduled(item.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => onSelectRecipientForNewTransfer(item.recipientEmail)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer text-xs font-bold inline-flex items-center space-x-1"
                    title="Send another transfer to this recipient"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send Another</span>
                  </button>

                  <button
                    onClick={() => handleDeleteRecord(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
