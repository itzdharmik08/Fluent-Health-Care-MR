import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, CheckCircle2, Smartphone, ArrowRight, Loader2 } from 'lucide-react';

export const VerifySuccess: React.FC = () => {
  const [deepLinkUrl, setDeepLinkUrl] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(2);
  const navigate = useNavigate();

  useEffect(() => {
    // App deep link URL to launch APK if user is on mobile
    const constructedDeepLink = `mrmedicine://auth/callback${window.location.search}${window.location.hash}`;
    setDeepLinkUrl(constructedDeepLink);

    // Auto trigger deep link on mobile browser after brief delay if native app exists
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        window.location.href = constructedDeepLink;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Automatically navigate into dashboard so user does not need to enter credentials
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

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
        <h1 className="text-2xl font-extrabold text-slate-900">Email Verified!</h1>
        <p className="text-sm text-slate-600 font-medium mt-3 leading-relaxed">
          Your account has been activated and you are automatically signed in.
        </p>
        <p className="text-xs text-indigo-600 font-semibold mt-1">
          Redirecting to your dashboard in {countdown}s...
        </p>

        {/* Action Buttons */}
        <div className="pt-6 space-y-3">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
          >
            <span>Enter Dashboard Now</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {deepLinkUrl && (
            <a
              href={deepLinkUrl}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors active:scale-95"
            >
              <Smartphone className="h-4 w-4" />
              <span>Open in Mobile App</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
