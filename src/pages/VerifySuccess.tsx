import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, CheckCircle2, Smartphone, LogIn } from 'lucide-react';

export const VerifySuccess: React.FC = () => {
  const [deepLinkUrl, setDeepLinkUrl] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // App deep link URL to launch APK if user is on mobile
    const constructedDeepLink = `mrmedicine://auth/callback${window.location.search}${window.location.hash}`;
    setDeepLinkUrl(constructedDeepLink);

    // Auto trigger deep link on mobile browser after brief delay
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        window.location.href = constructedDeepLink;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl text-center border border-white/20">
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Pill className="h-9 w-9" />
          </div>
        </div>

        {/* Success Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-4 animate-bounce-short">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        {/* Headline & Body Message */}
        <h1 className="text-2xl font-extrabold text-slate-900">Email Verified Successfully!</h1>
        <p className="text-sm text-slate-600 font-medium mt-3 leading-relaxed">
          Your account has been activated. Please return to the <strong>MR Medicine Manager</strong> app on your mobile device and log in using your credentials.
        </p>

        {/* Action Buttons */}
        <div className="pt-6 space-y-3">
          {deepLinkUrl && (
            <a
              href={deepLinkUrl}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
            >
              <Smartphone className="h-4.5 w-4.5" />
              <span>Open MR Medicine App</span>
            </a>
          )}

          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors active:scale-95"
          >
            <LogIn className="h-4 w-4" />
            <span>Continue to Web Sign In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
