import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, CheckCircle2, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);

    // Construct app deep link URL to pass tokens/code to native APK
    const constructedDeepLink = `mrmedicine://auth/callback${window.location.search}${window.location.hash}`;
    setDeepLinkUrl(constructedDeepLink);

    // If opened on mobile browser, attempt to launch native APK via deep link
    if (isMobile) {
      console.log('Mobile browser detected. Launching deep link:', constructedDeepLink);
      window.location.href = constructedDeepLink;
    }

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
          const type = hashParams.get('type');

          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionError) throw setSessionError;

            if (type === 'recovery') {
              setStatus('success');
              setTimeout(() => navigate('/reset-password'), 1200);
              return;
            }
          }
        }

        // 3. Confirm active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setTimeout(() => navigate('/'), 1200);
        } else {
          // Check if auth state listener eventually receives session
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (currentSession) {
              subscription.unsubscribe();
              setStatus('success');
              if (event === 'PASSWORD_RECOVERY') {
                navigate('/reset-password');
              } else {
                navigate('/');
              }
            }
          });

          // Timeout safety
          setTimeout(() => {
            subscription.unsubscribe();
            supabase.auth.getSession().then(({ data: { session: finalSession } }) => {
              if (finalSession) {
                setStatus('success');
                navigate('/');
              } else {
                setStatus('error');
                setErrorMessage('No active session found. Please try logging in again.');
              }
            });
          }, 3000);
        }
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to complete authentication.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center border border-white/20">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Pill className="h-9 w-9" />
          </div>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Verifying Email...</h2>
            <p className="text-xs text-slate-500">Completing authentication and setting up your session.</p>

            {isMobileDevice && deepLinkUrl && (
              <div className="pt-2">
                <a
                  href={deepLinkUrl}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Open in MR Medicine App</span>
                </a>
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Email Verified!</h2>
            <p className="text-xs text-slate-500">
              {isMobileDevice ? 'Opening app...' : 'Redirecting to MR Management Dashboard...'}
            </p>

            {isMobileDevice && deepLinkUrl && (
              <div className="pt-2">
                <a
                  href={deepLinkUrl}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-md"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Launch Mobile App</span>
                </a>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Authentication Failed</h2>
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
