import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/supabase';
import { X, Sparkles, Lock, Mail, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authReason } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await signInWithGoogle();
      // Supabase redirects to Google OAuth
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google.');
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      if (mode === 'signin') {
        await signInWithEmail(email, password);
        // Auth state listener in AuthContext will close the modal automatically
      } else {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.user && !res.session) {
          setSuccessMsg('Account created! Please check your email inbox to verify your account.');
          setIsLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={closeAuthModal}
    >
      <div
        className="w-full max-w-md bg-[#16181a] border border-[#2C3136] rounded-sm shadow-2xl p-6 relative text-white flex flex-col gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Orange Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff5722] via-[#ff9800] to-[#ff5722]" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[#8e9196] hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ff5722]/20 border border-[#ff5722]/50 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-[#ff5722]" />
          </div>
          <div>
            <h3 className="font-label-caps text-sm font-bold text-white tracking-wider leading-tight">
              {mode === 'signin' ? 'SIGN IN TO RESUME AI' : 'CREATE FREE ACCOUNT'}
            </h3>
            <p className="text-[11px] text-[#8e9196] font-mono">
              Access your ATS analysis & resume history
            </p>
          </div>
        </div>

        {/* Context / Reason Banner */}
        {authReason && (
          <div className="bg-[#ff5722]/10 border border-[#ff5722]/30 p-2.5 rounded-sm flex items-start gap-2">
            <Lock size={14} className="text-[#ff5722] shrink-0 mt-0.5" />
            <p className="text-xs text-[#ffb5a0] leading-snug">{authReason}</p>
          </div>
        )}

        {/* Error / Success Feedback Alerts */}
        {errorMsg && (
          <div className="bg-[#ff5252]/10 border border-[#ff5252]/50 p-2.5 rounded-sm flex items-start gap-2 text-xs text-[#ff8a80]">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-[#ff5252]" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-[#00C853]/10 border border-[#00C853]/50 p-2.5 rounded-sm flex items-start gap-2 text-xs text-[#69f0ae]">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[#00C853]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Fast Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-[#1e2022] hover:bg-[#25282c] border border-[#3c4148] hover:border-[#ff5722] text-white py-2.5 px-4 rounded-sm transition-all flex items-center justify-center gap-3 font-mono text-xs font-semibold cursor-pointer shadow-sm group"
        >
          {/* Official Google G Logo */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#2C3136]" />
          <span className="text-[10px] font-mono text-[#8e9196] uppercase tracking-wider">
            or with email
          </span>
          <div className="flex-1 h-px bg-[#2C3136]" />
        </div>

        {/* Mode Toggle (Sign In vs Create Account) */}
        <div className="flex border border-[#2C3136] rounded-sm p-0.5 bg-[#121416]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1 text-xs font-label-caps font-bold transition-all rounded-sm cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#ff5722] text-white shadow-sm'
                : 'text-[#8e9196] hover:text-white'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-1 text-xs font-label-caps font-bold transition-all rounded-sm cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#ff5722] text-white shadow-sm'
                : 'text-[#8e9196] hover:text-white'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-label-caps text-[#8e9196]">Full Name</label>
              <div className="relative">
                <User size={13} className="absolute left-2.5 top-3 text-[#8e9196]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] focus:border-[#ff5722] rounded-sm pl-8 pr-3 py-2 text-xs font-mono outline-none"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-label-caps text-[#8e9196]">Email Address</label>
            <div className="relative">
              <Mail size={13} className="absolute left-2.5 top-3 text-[#8e9196]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] focus:border-[#ff5722] rounded-sm pl-8 pr-3 py-2 text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-label-caps text-[#8e9196]">Password</label>
            <div className="relative">
              <Lock size={13} className="absolute left-2.5 top-3 text-[#8e9196]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121416] text-[#e2e2e5] border border-[#2C3136] focus:border-[#ff5722] rounded-sm pl-8 pr-3 py-2 text-xs font-mono outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#ff5722] hover:bg-[#ff7043] disabled:opacity-50 text-white font-label-caps font-bold py-2.5 rounded-sm transition-all glow-orange mt-1 cursor-pointer flex items-center justify-center gap-2 text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>PROCESSING...</span>
              </>
            ) : mode === 'signin' ? (
              <span>SIGN IN</span>
            ) : (
              <span>CREATE ACCOUNT</span>
            )}
          </button>
        </form>

        {/* Footer info */}
        <p className="text-[10px] text-center text-[#8e9196] font-mono">
          Free account • Zero credit card required
        </p>
      </div>
    </div>
  );
};
