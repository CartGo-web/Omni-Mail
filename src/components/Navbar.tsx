import React from 'react';
import { Send, BookUser, FileEdit, History, Key, LogOut, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';

export type TabType = 'transfer' | 'contacts' | 'drafts' | 'history' | 'api';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  user: User | null;
  onLogout: () => void;
  draftsCount?: number;
  scheduledCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  draftsCount = 0,
  scheduledCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('transfer')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">OmniMail</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Automated
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Gmail Fast Document &amp; Media Transfers
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => onSelectTab('transfer')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentTab === 'transfer'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Send Transfer</span>
              </button>

              <button
                onClick={() => onSelectTab('contacts')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentTab === 'contacts'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <BookUser className="w-4 h-4" />
                <span>Address Book</span>
              </button>

              <button
                onClick={() => onSelectTab('drafts')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${
                  currentTab === 'drafts'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>Drafts</span>
                {draftsCount > 0 && (
                  <span className="bg-slate-200 text-slate-700 text-xs px-1.5 py-0.2 rounded-full font-bold">
                    {draftsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('history')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${
                  currentTab === 'history'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Transfers</span>
                {scheduledCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.2 rounded-full font-bold">
                    {scheduledCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('api')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  currentTab === 'api'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>API &amp; OAuth</span>
              </button>
            </nav>
          )}

          {/* User Profile & Sign Out */}
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[170px]">
                  {user.displayName || 'Google User'}
                </span>
                <div className="flex items-center justify-end space-x-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="truncate max-w-[180px]">{user.email}</span>
                </div>
              </div>

              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}

              <button
                onClick={onLogout}
                title="Sign out of Google"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Mobile Navigation bar */}
        {user && (
          <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 overflow-x-auto">
            <button
              onClick={() => onSelectTab('transfer')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                currentTab === 'transfer' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
              }`}
            >
              Transfer
            </button>
            <button
              onClick={() => onSelectTab('contacts')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                currentTab === 'contacts' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
              }`}
            >
              Contacts
            </button>
            <button
              onClick={() => onSelectTab('drafts')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                currentTab === 'drafts' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
              }`}
            >
              Drafts ({draftsCount})
            </button>
            <button
              onClick={() => onSelectTab('history')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                currentTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
              }`}
            >
              History
            </button>
            <button
              onClick={() => onSelectTab('api')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                currentTab === 'api' ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
              }`}
            >
              API
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
