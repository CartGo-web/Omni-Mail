/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Send,
  ShieldCheck,
  Zap,
  Clock,
  BookUser,
  Key,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { initAuth, logout, connectGmailAccount } from './lib/auth.ts';
import {
  subscribeContacts,
  subscribeDrafts,
  subscribeTransfers,
  subscribeApiKeys,
  updateTransferStatus,
  ensureUserProfile,
  subscribeUserProfile,
} from './lib/store.ts';
import { UserProfile, Contact, Draft, TransferRecord, ApiKeyRecord } from './lib/types.ts';
import { sendGmailMessage } from './lib/gmail.ts';
import { Navbar, TabType } from './components/Navbar.tsx';
import { AuthForm } from './components/AuthForm.tsx';
import { SendTransfer } from './components/SendTransfer.tsx';
import { AddressBook } from './components/AddressBook.tsx';
import { DraftsManager } from './components/DraftsManager.tsx';
import { TransfersList } from './components/TransfersList.tsx';
import { ApiIntegrations } from './components/ApiIntegrations.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('transfer');

  // Subscribed Firestore State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);

  // Composer Prefills
  const [prefilledRecipient, setPrefilledRecipient] = useState<string>('');
  const [prefilledDraft, setPrefilledDraft] = useState<Draft | null>(null);

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAuthLoading(false);
      },
      () => {
        setUser(null);
        setUserProfile(null);
        setAccessToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore subscriptions & Assigned User ID initialization
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setContacts([]);
      setDrafts([]);
      setTransfers([]);
      setApiKeys([]);
      return;
    }

    // Automatically ensure & assign a unique User ID document for this user in Firestore
    ensureUserProfile(user)
      .then((profile) => setUserProfile(profile))
      .catch((err) => console.warn('User profile initialization notice:', err));

    const unsubProfile = subscribeUserProfile(user.uid, (p) => {
      if (p) setUserProfile(p);
    });

    const unsubContacts = subscribeContacts(user.uid, setContacts, (err) =>
      console.warn('Contacts subscription notice:', err)
    );
    const unsubDrafts = subscribeDrafts(user.uid, setDrafts, (err) =>
      console.warn('Drafts subscription notice:', err)
    );
    const unsubTransfers = subscribeTransfers(user.uid, setTransfers, (err) =>
      console.warn('Transfers subscription notice:', err)
    );
    const unsubApiKeys = subscribeApiKeys(user.uid, setApiKeys, (err) =>
      console.warn('API keys subscription notice:', err)
    );

    return () => {
      unsubProfile();
      unsubContacts();
      unsubDrafts();
      unsubTransfers();
      unsubApiKeys();
    };
  }, [user]);

  // 3. Automated Scheduled Queue Dispatcher
  useEffect(() => {
    if (!user || transfers.length === 0) return;

    const interval = setInterval(async () => {
      const now = new Date();
      const dueTransfers = transfers.filter(
        (t) => t.status === 'scheduled' && t.scheduledFor && new Date(t.scheduledFor) <= now
      );

      for (const due of dueTransfers) {
        try {
          console.log('Automated scheduled dispatch triggered for:', due.recipientEmail);
          if (accessToken) {
            await sendGmailMessage(accessToken, {
              from: user.email || '',
              to: due.recipientEmail,
              cc: due.sendCopyToSelf ? user.email || undefined : undefined,
              subject: due.subject,
              body: due.body,
              attachments: [],
            });
          } else {
            await fetch('/api/v1/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: user.email || '',
                to: due.recipientEmail,
                subject: due.subject,
                body: due.body,
                attachments: [],
                sendCopyToSelf: due.sendCopyToSelf,
              }),
            });
          }
          await updateTransferStatus(due.id, 'sent', new Date().toISOString());
        } catch (err) {
          console.error('Failed automated scheduled dispatch:', err);
        }
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [user, accessToken, transfers]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUserProfile(null);
    setAccessToken(null);
    setActiveTab('transfer');
  };

  const handleConnectGmail = async () => {
    try {
      const res = await connectGmailAccount();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
      }
    } catch (err) {
      console.warn('Gmail connect notice:', err);
    }
  };

  const handleSelectContactForTransfer = (email: string) => {
    setPrefilledRecipient(email);
    setActiveTab('transfer');
  };

  const handleOpenDraftInComposer = (draft: Draft) => {
    setPrefilledDraft(draft);
    setActiveTab('transfer');
  };

  const scheduledCount = transfers.filter((t) => t.status === 'scheduled').length;
  const assignedUserId = userProfile?.assignedUserId;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Navbar with Assigned User ID Display */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        assignedUserId={assignedUserId}
        onLogout={handleLogout}
        draftsCount={drafts.length}
        scheduledCount={scheduledCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {authLoading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-600">Loading OmniMail Transfer Engine...</p>
          </div>
        ) : !user ? (
          /* Sign-In and Create Account Splash View */
          <div className="max-w-5xl mx-auto space-y-10 py-4 sm:py-8">
            {/* Hero & Auth Form Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Hero Overview */}
              <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-700 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Automated File &amp; Media Transfer Platform</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 leading-tight">
                  Fast Email Transfers <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                    For Any Document &amp; Media
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Sign in or create an account to automate your email attachments. Every account is assigned a unique User ID (UID) with Address Book contacts, scheduled sending, local drafts, and third-party REST API integration.
                </p>

                {/* Key feature bullets */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Automated Attachments</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Instant MIME conversion for PDF, Office, Photos &amp; Video</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Scheduled Sending</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Time-delayed dispatch with automated background queue</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <BookUser className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Saved Address Book</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">1-click recipient selection &amp; contact categorization</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <Key className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">OAuth 2.0 &amp; Unique User IDs</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Assigned User ID for every account &amp; REST API access</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sign In & Create Account Form */}
              <div className="lg:col-span-5 w-full">
                <AuthForm />
              </div>
            </div>

            {/* Visual Security Guarantee */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Secure User Authentication &amp; Assigned User IDs</h4>
                  <p className="text-slate-500">
                    Each registered account receives a unique, verified User ID tracked in Firestore with secure access rules.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <Lock className="w-4 h-4" />
                <span>Zero-Trust Security</span>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard Tabs */
          <div>
            {activeTab === 'transfer' && (
              <SendTransfer
                user={user}
                assignedUserId={assignedUserId}
                accessToken={accessToken}
                contacts={contacts}
                onOpenContacts={() => setActiveTab('contacts')}
                onTransferCompleted={() => {
                  setPrefilledRecipient('');
                  setPrefilledDraft(null);
                }}
                initialRecipient={prefilledRecipient}
                initialDraft={prefilledDraft}
                onClearInitialDraft={() => setPrefilledDraft(null)}
                onConnectGmail={handleConnectGmail}
              />
            )}

            {activeTab === 'contacts' && (
              <AddressBook
                userId={user.uid}
                contacts={contacts}
                onSelectContactForTransfer={handleSelectContactForTransfer}
              />
            )}

            {activeTab === 'drafts' && (
              <DraftsManager
                drafts={drafts}
                onOpenDraft={handleOpenDraftInComposer}
                onNewTransfer={() => {
                  setPrefilledRecipient('');
                  setPrefilledDraft(null);
                  setActiveTab('transfer');
                }}
              />
            )}

            {activeTab === 'history' && (
              <TransfersList
                transfers={transfers}
                accessToken={accessToken}
                senderEmail={user.email || ''}
                onSelectRecipientForNewTransfer={handleSelectContactForTransfer}
              />
            )}

            {activeTab === 'api' && (
              <ApiIntegrations
                userId={user.uid}
                userEmail={user.email || ''}
                assignedUserId={assignedUserId}
                apiKeys={apiKeys}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OmniMail Automated Email Transfer Platform</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mr-1" />
              Direct Email Dispatch Engine
            </span>
            <span>•</span>
            <span>Unique User IDs Assigned to Every Account</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
