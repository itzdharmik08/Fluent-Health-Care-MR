import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pill, AlertCircle, RefreshCw, LogIn } from 'lucide-react';

export const VerifyError: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const errorMessage =
    searchParams.get('message') ||
    'The email verification link is invalid, expired, or has already been used.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center border border-white/20">
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Pill className="h-9 w-9" />
          </div>
        </div>

        {/* Error Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 mx-auto mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>

        {/* Headline & Error Message */}
        <h1 className="text-2xl font-extrabold text-slate-900">Verification Failed</h1>
        <p className="text-sm text-rose-600 font-semibold mt-3 leading-relaxed bg-rose-50 p-3.5 rounded-xl border border-rose-100">
          {errorMessage}
        </p>

        <p className="text-xs text-slate-500 font-medium mt-3">
          If your link expired or you haven't received a new link, please return to the login screen and request a new verification link.
        </p>

        {/* Action Buttons */}
        <div className="pt-6 space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
          >
            <RefreshCw className="h-4.5 w-4.5" />
            <span>Request New Link / Sign In</span>
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors active:scale-95"
          >
            <LogIn className="h-4 w-4" />
            <span>Return to Login Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};
