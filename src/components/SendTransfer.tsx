import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  X,
  Clock,
  Save,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Mail,
  UserCheck,
  Zap,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { FileAttachment, Contact, Draft, TransferRecord } from '../lib/types.ts';
import { sendGmailMessage, createGmailDraft } from '../lib/gmail.ts';
import { saveTransfer, saveDraft, saveContact } from '../lib/store.ts';
import { ConfirmationModal } from './ConfirmationModal.tsx';

interface SendTransferProps {
  user: User;
  assignedUserId?: string;
  accessToken: string | null;
  contacts: Contact[];
  onOpenContacts: () => void;
  onTransferCompleted: () => void;
  initialRecipient?: string;
  initialDraft?: Draft | null;
  onClearInitialDraft?: () => void;
  onConnectGmail?: () => Promise<void>;
}

export const SendTransfer: React.FC<SendTransferProps> = ({
  user,
  assignedUserId,
  accessToken,
  contacts,
  onOpenContacts,
  onTransferCompleted,
  initialRecipient = '',
  initialDraft = null,
  onClearInitialDraft,
  onConnectGmail,
}) => {
  const [recipient, setRecipient] = useState<string>(initialRecipient);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [sendCopyToSelf, setSendCopyToSelf] = useState<boolean>(true);
  const [saveRecipientToContacts, setSaveRecipientToContacts] = useState<boolean>(true);
  
  // Attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Scheduling
  const [scheduleType, setScheduleType] = useState<'now' | '15m' | '1h' | 'tomorrow' | 'custom'>('now');
  const [customDateTime, setCustomDateTime] = useState<string>('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [showContactDropdown, setShowContactDropdown] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial recipient if passed from address book
  useEffect(() => {
    if (initialRecipient) {
      setRecipient(initialRecipient);
    }
  }, [initialRecipient]);

  // Sync initial draft if selected from Drafts tab
  useEffect(() => {
    if (initialDraft) {
      setRecipient(initialDraft.recipientEmail || '');
      setSubject(initialDraft.subject || '');
      setBody(initialDraft.body || '');
      setSendCopyToSelf(initialDraft.sendCopyToSelf !== undefined ? initialDraft.sendCopyToSelf : true);
      setDraftSavedAt('Restored from draft');
      if (onClearInitialDraft) onClearInitialDraft();
    }
  }, [initialDraft, onClearInitialDraft]);

  // Auto-save draft locally on typing (debounced)
  useEffect(() => {
    if (!recipient && !subject && !body && attachments.length === 0) return;

    const timer = setTimeout(() => {
      try {
        const localDraftData = {
          recipient,
          subject,
          body,
          sendCopyToSelf,
          updatedAt: new Date().toLocaleTimeString(),
        };
        localStorage.setItem('omnimail_active_draft', JSON.stringify(localDraftData));
        setDraftSavedAt(`Auto-saved at ${localDraftData.updatedAt}`);
      } catch (e) {
        console.warn('Could not auto-save draft locally', e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [recipient, subject, body, sendCopyToSelf, attachments.length]);

  // Restore active draft from localStorage on initial mount if available and empty
  useEffect(() => {
    if (!recipient && !subject && !body) {
      const saved = localStorage.getItem('omnimail_active_draft');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.recipient || parsed.subject || parsed.body) {
            setRecipient(parsed.recipient || '');
            setSubject(parsed.subject || '');
            setBody(parsed.body || '');
            if (parsed.sendCopyToSelf !== undefined) setSendCopyToSelf(parsed.sendCopyToSelf);
            setDraftSavedAt(`Restored local draft (${parsed.updatedAt || 'earlier'})`);
          }
        } catch {
          // ignore corrupted local storage
        }
      }
    }
  }, []);

  // Filter contacts for autocomplete
  const filteredContacts = contacts.filter((c) =>
    recipient ? c.email.toLowerCase().includes(recipient.toLowerCase()) || c.name.toLowerCase().includes(recipient.toLowerCase()) : false
  );

  // File processing engine
  const processFiles = async (files: FileList | File[]) => {
    setIsProcessingFiles(true);
    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64Data = await readFileAsBase64(file);
        const attachment: FileAttachment = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64Data,
        };
        newAttachments.push(attachment);
      } catch (err) {
        console.error('Failed reading file', file.name, err);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsProcessingFiles(false);

    // Auto-fill subject if subject is currently empty
    if (!subject && newAttachments.length > 0) {
      if (newAttachments.length === 1) {
        setSubject(`Transfer: ${newAttachments[0].name}`);
      } else {
        setSubject(`Transfer: ${newAttachments.length} Files (${newAttachments[0].name}, etc.)`);
      }
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:mime/type;base64, prefix
        const base64Only = result.split(',')[1] || '';
        resolve(base64Only);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Calculate scheduled date
  const computeScheduledTime = (): string | null => {
    if (scheduleType === 'now') return null;
    const now = new Date();
    if (scheduleType === '15m') {
      return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    }
    if (scheduleType === '1h') {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
    if (scheduleType === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow.toISOString();
    }
    if (scheduleType === 'custom' && customDateTime) {
      return new Date(customDateTime).toISOString();
    }
    return null;
  };

  // Validate before showing confirmation modal
  const handleReviewAndSend = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipient || !emailRegex.test(recipient.trim())) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid recipient Gmail address.',
      });
      return;
    }

    // Check size limit: Gmail allows up to 25MB total message size
    const totalSizeBytes = attachments.reduce((sum, f) => sum + f.size, 0);
    if (totalSizeBytes > 25 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'Total attachment size exceeds Gmail 25 MB limit.',
        details: 'Please remove some files or compress them before transferring.',
      });
      return;
    }

    setShowConfirmModal(true);
  };

  // Execute transfer after user confirmation
  const executeTransfer = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    const scheduledDate = computeScheduledTime();
    const cleanRecipient = recipient.trim();
    const cleanSubject = subject.trim() || 'File & Document Transfer';
    const cleanBody = body.trim() || 'Attached documents and media transfer via OmniMail.';

    try {
      // 1. If scheduled for later, record as scheduled transfer
      if (scheduledDate && new Date(scheduledDate) > new Date()) {
        const scheduledRecord: TransferRecord = {
          id: `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user.uid,
          assignedUserId: assignedUserId || undefined,
          senderEmail: user.email || '',
          recipientEmail: cleanRecipient,
          subject: cleanSubject,
          body: cleanBody,
          status: 'scheduled',
          fileCount: attachments.length,
          totalSizeBytes: attachments.reduce((acc, f) => acc + f.size, 0),
          fileNames: attachments.map((a) => a.name).join(', '),
          sendCopyToSelf,
          scheduledFor: scheduledDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveTransfer(scheduledRecord);

        // Also save draft to Gmail so it is stored safely
        try {
          if (accessToken) {
            await createGmailDraft(accessToken, {
              from: user.email || '',
              to: cleanRecipient,
              cc: sendCopyToSelf ? user.email || undefined : undefined,
              subject: `[Scheduled: ${new Date(scheduledDate).toLocaleString()}] ${cleanSubject}`,
              body: cleanBody,
              attachments,
            });
          }
        } catch (e) {
          console.warn('Gmail draft creation notice for scheduled item', e);
        }

        // Auto-save recipient to address book if requested
        if (saveRecipientToContacts && !contacts.some((c) => c.email.toLowerCase() === cleanRecipient.toLowerCase())) {
          await saveContact({
            id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userId: user.uid,
            name: cleanRecipient.split('@')[0],
            email: cleanRecipient,
            category: 'Auto-saved',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        setShowConfirmModal(false);
        setFeedback({
          type: 'success',
          message: `Transfer successfully scheduled for ${new Date(scheduledDate).toLocaleString()}!`,
          details: `Queued with ${attachments.length} attachment(s). It will be dispatched automatically when due.`,
        });
        resetForm();
        onTransferCompleted();
        return;
      }

      // 2. Immediate Send (via direct Gmail API if token available, or OmniMail Transfer API Engine)
      let dispatchId = '';
      if (accessToken) {
        const result = await sendGmailMessage(accessToken, {
          from: user.email || '',
          to: cleanRecipient,
          cc: sendCopyToSelf ? user.email || undefined : undefined,
          subject: cleanSubject,
          body: cleanBody,
          attachments,
        });
        dispatchId = result.id;
      } else {
        const res = await fetch('/api/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: user.email || '',
            to: cleanRecipient,
            subject: cleanSubject,
            body: cleanBody,
            attachments,
            sendCopyToSelf,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Transfer failed via API engine');
        dispatchId = data.transferId || 'omni_api';
      }

      // 3. Record in Firestore transfer history
      const transferRecord: TransferRecord = {
        id: `transfer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        assignedUserId: assignedUserId || undefined,
        senderEmail: user.email || '',
        recipientEmail: cleanRecipient,
        subject: cleanSubject,
        body: cleanBody,
        status: 'sent',
        fileCount: attachments.length,
        totalSizeBytes: attachments.reduce((acc, f) => acc + f.size, 0),
        fileNames: attachments.map((a) => a.name).join(', '),
        sendCopyToSelf,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTransfer(transferRecord);

      // Auto-save recipient to contacts if requested
      if (saveRecipientToContacts && !contacts.some((c) => c.email.toLowerCase() === cleanRecipient.toLowerCase())) {
        await saveContact({
          id: `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: user.uid,
          name: cleanRecipient.split('@')[0],
          email: cleanRecipient,
          category: 'Transfers',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Clear local draft cache
      localStorage.removeItem('omnimail_active_draft');

      setShowConfirmModal(false);
      setFeedback({
        type: 'success',
        message: 'Email & attachments sent successfully!',
        details: `Dispatched from ${user.email} to ${cleanRecipient} (Ref: ${dispatchId})${
          sendCopyToSelf ? ' • Copy sent to your inbox' : ''
        }.`,
      });

      resetForm();
      onTransferCompleted();
    } catch (error) {
      console.error('Transfer execution failed:', error);
      setShowConfirmModal(false);
      setFeedback({
        type: 'error',
        message: 'Transfer failed to send.',
        details: error instanceof Error ? error.message : 'An unexpected error occurred with the Gmail API.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft locally and in cloud
  const handleSaveDraft = async () => {
    if (!recipient && !subject && !body && attachments.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Draft is empty. Add a recipient, subject, or files first.',
      });
      return;
    }

    try {
      const draftData: Draft = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        recipientEmail: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
        sendCopyToSelf,
        attachmentCount: attachments.length,
        attachmentSummary: attachments.map((a) => a.name).join(', ').substring(0, 480),
        scheduledAt: computeScheduledTime() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save in Firestore
      await saveDraft(draftData);

      // 2. Save in localStorage
      localStorage.setItem('omnimail_active_draft', JSON.stringify({
        recipient,
        subject,
        body,
        sendCopyToSelf,
        updatedAt: new Date().toLocaleTimeString(),
      }));

      // 3. Try to save as Gmail Draft in the user's Gmail box if token available
      try {
        if (accessToken) {
          await createGmailDraft(accessToken, {
            from: user.email || '',
            to: recipient.trim() || user.email || '',
            subject: subject.trim() || 'OmniMail Draft',
            body: body.trim() || '',
            attachments,
          });
        }
      } catch (err) {
        console.warn('Gmail draft sync notice:', err);
      }

      setDraftSavedAt(`Draft saved in Local Storage & Cloud (${new Date().toLocaleTimeString()})`);
      setFeedback({
        type: 'success',
        message: 'Draft saved successfully!',
        details: 'You can restore and send this draft at any time from the Drafts tab.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to save draft.',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const resetForm = () => {
    setRecipient('');
    setSubject('');
    setBody('');
    setAttachments([]);
    setScheduleType('now');
    setCustomDateTime('');
    setDraftSavedAt(null);
    localStorage.removeItem('omnimail_active_draft');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAttachmentIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500 flex-shrink-0" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv'))
      return <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
    return <File className="w-5 h-5 text-blue-500 flex-shrink-0" />;
  };

  const totalAttachmentsSize = attachments.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Sender Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sender Account</span>
              {accessToken ? (
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                  Connected Gmail
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3 mr-1 text-blue-600" />
                  OmniMail Transfer Engine
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base">{user.email}</span>
              {assignedUserId && (
                <span className="inline-flex items-center text-[11px] font-mono font-bold bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-md border border-slate-300">
                  ID: {assignedUserId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {!accessToken && onConnectGmail && (
            <button
              type="button"
              onClick={onConnectGmail}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 py-1.5 px-3 rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Connect Gmail API (Optional)</span>
            </button>
          )}
          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white/80 py-1.5 px-3 rounded-xl border border-slate-200">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Automated attachment processing</span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start space-x-3 text-sm animate-in fade-in duration-150 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{feedback.message}</p>
            {feedback.details && <p className="text-xs mt-1 opacity-90">{feedback.details}</p>}
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Composer Card */}
      <form onSubmit={handleReviewAndSend} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-800">Automated Email Transfer</h2>
            {draftSavedAt && (
              <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                • {draftSavedAt}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              title="Reset fields"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Recipient Input with Autocomplete */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="recipientEmail" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Receiver Gmail <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={onOpenContacts}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Address Book ({contacts.length})</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                id="recipientEmail"
                type="email"
                required
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setShowContactDropdown(true);
                }}
                onFocus={() => setShowContactDropdown(true)}
                placeholder="colleague@gmail.com, client@company.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all"
              />
              {recipient && (
                <button
                  type="button"
                  onClick={() => setRecipient('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Contact Matching Dropdown */}
            {showContactDropdown && filteredContacts.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  Address Book Suggestions
                </div>
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setRecipient(contact.email);
                      setShowContactDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50/70 flex items-center justify-between text-xs border-b border-slate-50 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{contact.name}</span>
                      <span className="text-slate-500 ml-2 font-mono">{contact.email}</span>
                    </div>
                    {contact.category && (
                      <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {contact.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="subjectLine" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Subject
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSubject('Urgent Documents & Assets Transfer')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setSubject('Project Media & Deliverables')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  Deliverables
                </button>
              </div>
            </div>
            <input
              id="subjectLine"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Contract Documents, High-Res Images &amp; Video Package"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all"
            />
          </div>

          {/* AUTOMATED ATTACHMENT DROPZONE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <span>Automated File Attachments</span>
                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
                  {attachments.length} selected ({formatFileSize(totalAttachmentsSize)})
                </span>
              </label>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAttachments([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Drop area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-600 bg-blue-50/80 scale-[1.005]'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) processFiles(e.target.files);
                }}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Drag and drop any Document, Image, or Video here
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supports PDF, Word, Excel, CSV, PNG, JPG, WebP, MP4, MOV, Audio, and Zip archives
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    <FileText className="w-3.5 h-3.5 mr-1 text-blue-500" /> Documents
                  </span>
                  <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    <ImageIcon className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Images
                  </span>
                  <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                    <Video className="w-3.5 h-3.5 mr-1 text-purple-500" /> Videos
                  </span>
                </div>
              </div>

              {isProcessingFiles && (
                <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold text-slate-700">Automating attachments &amp; encoding...</span>
                </div>
              )}
            </div>

            {/* Attachment Chips List */}
            {attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs shadow-2xs hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      {getAttachmentIcon(file.type)}
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatFileSize(file.size)} • {file.type.split('/')[1] || 'binary'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(file.id);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Body / Message */}
          <div>
            <label htmlFor="messageBody" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Message Note (Optional)
            </label>
            <textarea
              id="messageBody"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi, please find the attached files from my transfer workflow..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 text-sm font-medium transition-all resize-y"
            />
          </div>

          {/* Delivery & Automation Controls */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            {/* Scheduled Sending Options */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Scheduled Sending Options</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType('now')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    scheduleType === 'now'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Send Immediately
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('15m')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    scheduleType === '15m'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  +15 Minutes
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('1h')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    scheduleType === '1h'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('tomorrow')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    scheduleType === 'tomorrow'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Tomorrow 9 AM
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('custom')}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    scheduleType === 'custom'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Custom Time...
                </button>
              </div>

              {scheduleType === 'custom' && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                  <label htmlFor="customScheduleInput" className="text-xs font-semibold text-slate-600">Pick date &amp; time:</label>
                  <input
                    id="customScheduleInput"
                    type="datetime-local"
                    value={customDateTime}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-medium text-slate-800 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Checkbox Options */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendCopyToSelf}
                  onChange={(e) => setSendCopyToSelf(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-800">
                  <strong>Send a copy to my Gmail ({user.email})</strong> — Keeps a backup in your sent/inbox history
                </span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveRecipientToContacts}
                  onChange={(e) => setSaveRecipientToContacts(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-800">
                  Auto-save receiver to <strong>Address Book</strong> for future instant transfers
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Authenticated as <strong>{user.email}</strong></span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{scheduleType === 'now' ? 'Review & Send via Gmail' : 'Review & Schedule Transfer'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={executeTransfer}
        isLoading={isSubmitting}
        senderEmail={user.email || ''}
        recipientEmail={recipient}
        sendCopyToSelf={sendCopyToSelf}
        subject={subject}
        attachments={attachments}
        scheduledFor={computeScheduledTime()}
      />
    </div>
  );
};
