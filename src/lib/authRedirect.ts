/**
 * Helper to generate the public web authentication redirect URL.
 * 
 * Uses configured VITE_SITE_URL or active window origin (or production Vercel URL)
 * so that Supabase verification emails ALWAYS open a valid HTTPS web page on mobile/desktop,
 * preventing any localhost:3000 fallback errors.
 * 
 * @param path Optional subpath for redirect (default: '/auth/callback')
 */
export function getAuthRedirectUrl(path = '/auth/callback'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 1. Explicit environment variable if configured
  const siteUrl = import.meta.env.VITE_SITE_URL;
  if (siteUrl && siteUrl.trim() !== '') {
    const formattedUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
    return `${formattedUrl}${cleanPath}`;
  }

  // 2. Active browser window origin (if running in browser/Vercel)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    // If not on localhost, use current origin
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return `${origin}${cleanPath}`;
    }
  }

  // 3. Fallback production Vercel web domain for verification emails
  return `https://fluent-health-care-mr.vercel.app${cleanPath}`;
}
