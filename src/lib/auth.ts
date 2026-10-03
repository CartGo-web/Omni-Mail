import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import { auth } from './firebase.ts';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
];

const provider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with email and password
 */
export const emailSignIn = async (email: string, pass: string): Promise<User> => {
  try {
    isSigningIn = true;
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return res.user;
  } catch (error) {
    console.warn('Email Sign In notice:', (error as any)?.code || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Create new account with email, password, and display name.
 * If the email is already in use (e.g. from previous Google login),
 * it seamlessly attempts to sign in or provides contextual guidance.
 */
export const emailSignUp = async (email: string, pass: string, displayName: string): Promise<User> => {
  try {
    isSigningIn = true;
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName.trim()) {
      await updateProfile(res.user, { displayName: displayName.trim() });
    }
    return res.user;
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      // Attempt seamless sign-in with the provided password
      try {
        const signInRes = await signInWithEmailAndPassword(auth, email.trim(), pass);
        if (displayName.trim() && !signInRes.user.displayName) {
          await updateProfile(signInRes.user, { displayName: displayName.trim() });
        }
        return signInRes.user;
      } catch (signInErr: any) {
        console.warn('Existing account login check:', signInErr?.code || signInErr);
        const customErr = new Error(`An account for ${email.trim()} already exists.`);
        (customErr as any).code = 'auth/email-already-in-use';
        (customErr as any).isGoogleLinked = (signInErr?.code === 'auth/invalid-credential' || signInErr?.code === 'auth/wrong-password');
        throw customErr;
      }
    }
    console.warn('Email Sign Up notice:', error?.code || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Update password for authenticated user
 */
export const setUserPassword = async (pass: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No authenticated user');
  await updatePassword(auth.currentUser, pass);
};

/**
 * Google Sign-In / OAuth Connect (for Gmail direct sending integration or linked accounts)
 */
export const connectGmailAccount = async (passwordToAttach?: string): Promise<{ user: User; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google.');
    }
    cachedAccessToken = credential.accessToken;
    
    // If a password was provided in the sign-up form, set it on the account so future email/password sign-in works
    if (passwordToAttach && passwordToAttach.length >= 6) {
      try {
        await updatePassword(result.user, passwordToAttach);
      } catch (pwErr) {
        console.warn('Could not attach password to Google account:', pwErr);
      }
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.warn('Connect Gmail notice:', (error as any)?.code || error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
