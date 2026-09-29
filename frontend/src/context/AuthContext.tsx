import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signOutUser, User, Session } from '../services/supabase';

interface PendingUploadData {
  file: File;
  jdText: string;
  continueWithoutJd: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authReason: string;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  pendingUpload: PendingUploadData | null;
  setPendingUpload: (data: PendingUploadData | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authReason, setAuthReason] = useState<string>('Sign in to continue');
  const [pendingUpload, setPendingUpload] = useState<PendingUploadData | null>(null);

  useEffect(() => {
    // 1. Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Subscribe to auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Auto-close auth modal on successful login
      if (session?.user) {
        setIsAuthModalOpen(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (reason = 'Sign in or create a free account to upload and analyze your resume') => {
    setAuthReason(reason);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signOut = async () => {
    await signOutUser();
    setUser(null);
    setSession(null);
    setPendingUpload(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthModalOpen,
        authReason,
        openAuthModal,
        closeAuthModal,
        pendingUpload,
        setPendingUpload,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
