import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, CheckCircle2, AlertCircle, Loader2, Smartphone, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // Construct app deep link URL to open native APK if installed
    const constructedDeepLink = `mrmedicine://auth/callback${window.location.search}${window.location.hash}`;
    setDeepLinkUrl(constructedDeepLink);

    const handleAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error || 'Authentication verification failed.');
        }

        // 1. PKCE Code Exchange
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // 2. Hash Fragment Check (Implicit Flow fallback)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionError) throw setSessionError;
          }
        }

        // Mark verification as successful
        setStatus('success');
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to complete authentication.');
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center border border-white/20">
        <div className="flex justify-center mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Pill className="h-9 w-9" />
          </div>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Verifying Email...</h2>
            <p className="text-xs text-slate-500">Completing account verification. Please wait a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
              <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                Your account has been successfully verified. Please return to the <strong>MR Medicine Manager</strong> app on your phone and log in with your credentials.
              </p>
            </div>

            <div className="pt-3 space-y-2.5">
              {deepLinkUrl && (
                <a
                  href={deepLinkUrl}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Open MR Medicine App</span>
                </a>
              )}

              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Log In on Web</span>
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
            <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-md mt-4"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
