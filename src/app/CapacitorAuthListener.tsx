import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { supabase } from '../lib/supabase';

export const CapacitorAuthListener: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let isSubscribed = true;

    const handleDeepLink = async (event: URLOpenListenerEvent) => {
      const urlStr = event.url;
      if (!urlStr || !isSubscribed) return;

      console.log('App opened via deep link:', urlStr);

      try {
        // Parse URL
        const parsedUrl = new URL(urlStr);
        const searchParams = parsedUrl.searchParams;
        const hashString = parsedUrl.hash ? parsedUrl.hash.substring(1) : '';
        const hashParams = new URLSearchParams(hashString);

        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type') || searchParams.get('type');

        // 1. PKCE Code Exchange
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('Supabase PKCE exchange error:', error);
        }
        // 2. Implicit token set
        else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) console.error('Supabase setSession error:', error);
        }

        // 3. Navigate to appropriate screen
        if (type === 'recovery' || parsedUrl.pathname.includes('reset-password')) {
          navigate('/reset-password');
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Error handling deep link URL:', err);
      }
    };

    // Add deep link listener
    const listenerPromise = App.addListener('appUrlOpen', handleDeepLink);

    return () => {
      isSubscribed = false;
      listenerPromise.then((handle) => handle.remove());
    };
  }, [navigate]);

  return null;
};
