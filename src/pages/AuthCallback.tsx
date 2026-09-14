import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { EmailOtpType } from '@supabase/supabase-js';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.substring(1) : '');

        const code = urlParams.get('code');
        const tokenHash = urlParams.get('token_hash');
        const type = (urlParams.get('type') || hashParams.get('type')) as EmailOtpType | null;
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error || 'Authentication verification failed.');
        }

        // 1. PKCE Code Exchange
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        // 2. Token Hash verification (Supabase OTP / verifyOtp)
        else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (verifyError) throw verifyError;
        }
        // 3. Hash Fragment Check (Implicit Flow fallback)
        else if (window.location.hash) {
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

        // Ensure user profile exists in database
        try {
          await authService.ensureUserProfile();
        } catch (profileErr) {
          console.warn('Could not ensure profile on callback:', profileErr);
        }

        // Navigate to success page which automatically enters the app
        navigate(`/auth/verify-success${window.location.search}${window.location.hash}`, { replace: true });
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        const msg = err instanceof Error ? err.message : 'Failed to complete email verification.';
        // Navigate to dedicated Error page
        navigate(`/auth/verify-error?message=${encodeURIComponent(msg)}`, { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center border border-white/20">
        <div className="flex justify-center mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Pill className="h-9 w-9" />
          </div>
        </div>

        <div className="space-y-4">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Verifying Email...</h2>
          <p className="text-xs text-slate-500">Processing verification request. Please wait a moment.</p>
        </div>
      </div>
    </div>
  );
};
