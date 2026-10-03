import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  KeyRound,
  LogIn,
  RotateCcw,
} from 'lucide-react';
import { emailSignIn, emailSignUp, resetPassword, connectGmailAccount } from '../lib/auth.ts';

interface AuthFormProps {
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [operationNotAllowed, setOperationNotAllowed] = useState<boolean>(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<boolean>(false);

  const resetFormFeedback = () => {
    setErrorMessage(null);
    setSuccessNotice(null);
    setOperationNotAllowed(false);
    setEmailAlreadyExists(false);
  };

  const handleTabChange = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    resetFormFeedback();
  };

  const handleSwitchToSignIn = () => {
    setMode('signin');
    setErrorMessage(null);
    setEmailAlreadyExists(false);
  };

  const handleQuickPasswordReset = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await resetPassword(email);
      setSuccessNotice(`Password setup/reset link sent to ${email}. Check your inbox to set your password.`);
      setEmailAlreadyExists(false);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignInFallback = async () => {
    setIsLoading(true);
    resetFormFeedback();
    try {
      await connectGmailAccount(password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await resetPassword(email);
        setSuccessNotice(`Password reset link sent to ${email}. Check your inbox.`);
      } catch (err: any) {
        setErrorMessage(parseAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await emailSignIn(email, password);
      } else {
        await emailSignUp(email, password, fullName);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setOperationNotAllowed(true);
      }
      if (code === 'auth/email-already-in-use') {
        setEmailAlreadyExists(true);
      }
      setErrorMessage(parseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const parseAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. If you registered previously with Google, you can sign in below or reset your password.';
    }
    if (code === 'auth/email-already-in-use') {
      return `The email address ${email} is already registered. Please sign in or reset your password.`;
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not yet enabled in the Firebase project console.';
    }
    return err?.message || 'Authentication failed. Please try again.';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-md w-full mx-auto">
      {/* Tab Switcher */}
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange('signin')}
            className={`py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In to App
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('signup')}
            className={`py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      <div className="p-6 sm:p-8 space-y-5">
        {/* Title */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-2 shadow-xs">
            {mode === 'signup' ? <UserIcon className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {mode === 'signin' && 'Sign in to your account'}
            {mode === 'signup' && 'Create your OmniMail account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'signin' && 'Enter your email and password to manage automated transfers'}
            {mode === 'signup' && 'A unique User ID will be automatically generated and assigned to your account'}
            {mode === 'forgot' && "We'll send a password recovery link to your email"}
          </p>
        </div>

        {/* Dedicated Email Already Exists Smart Action Banner */}
        {emailAlreadyExists && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-3 text-xs text-blue-900 animate-in fade-in duration-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-950">
                  Account Already Exists
                </p>
                <p className="text-blue-800 text-[11px] mt-0.5">
                  An account for <strong>{email}</strong> is already registered. Choose an option below:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSwitchToSignIn}
                className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In Instead</span>
              </button>

              <button
                type="button"
                onClick={handleQuickPasswordReset}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-blue-100/70 border border-blue-300 text-blue-800 rounded-xl font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Set / Reset Password</span>
              </button>
            </div>

            {/* If previously connected with Google, offer 1-click Google Sign In */}
            <div className="pt-2 border-t border-blue-200/60 text-center">
              <button
                type="button"
                onClick={handleGoogleSignInFallback}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                Previously used Google? Sign in with Google for this email
              </button>
            </div>
          </div>
        )}

        {/* Generic Error Notice (only if not already-in-use card) */}
        {!emailAlreadyExists && errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>

            {mode === 'signin' && (
              <div className="pt-1 flex items-center justify-end space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleGoogleSignInFallback}
                  className="font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Sign in with Google
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    resetFormFeedback();
                  }}
                  className="font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Reset password
                </button>
              </div>
            )}
          </div>
        )}

        {/* Firebase Console Guide if Email/Password not enabled */}
        {operationNotAllowed && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2 animate-in fade-in duration-150">
            <div className="font-bold flex items-center space-x-1.5 text-amber-950">
              <KeyRound className="w-4 h-4 text-amber-700" />
              <span>How to Enable Email/Password Provider:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800">
              <li>Open your Firebase Console for project: <strong>gen-lang-client-0791257038</strong></li>
              <li>Navigate to <strong>Build</strong> &rarr; <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong> tab</li>
              <li>Click <strong>Email/Password</strong> and toggle to <strong>Enable</strong>, then click Save</li>
            </ol>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2.5 animate-in fade-in duration-150">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{successNotice}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password <span className="text-rose-500">*</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      resetFormFeedback();
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign In to App'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Bottom switcher for forgot password */}
        {mode === 'forgot' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                resetFormFeedback();
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              &larr; Back to Sign In
            </button>
          </div>
        )}

        {/* Security assurance */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Secured with Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
};
