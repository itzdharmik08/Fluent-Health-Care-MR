import { Capacitor } from '@capacitor/core';

/**
 * Platform-aware helper to generate the correct authentication redirect URL.
 * 
 * - Capacitor Android Native App: 'mrmedicine://auth/callback'
 * - Web Production (Vercel): 'https://<YOUR_DOMAIN>/auth/callback'
 * - Web Development: 'http://localhost:3000/auth/callback' (or current origin)
 * 
 * @param path Optional subpath for redirect (default: '/auth/callback')
 */
export function getAuthRedirectUrl(path = '/auth/callback'): string {
  // Check if running inside native Capacitor environment (Android/iOS APK)
  if (Capacitor.isNativePlatform()) {
    // Android custom URL scheme deep link
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `mrmedicine://${cleanPath}`;
  }

  // Web Browser environment (Development or Vercel Production)
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${cleanPath}`;
  }

  // Fallback default
  return 'http://localhost:3000/auth/callback';
}
