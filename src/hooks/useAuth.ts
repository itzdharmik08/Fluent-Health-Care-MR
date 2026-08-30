import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { UserProfile } from '../types/auth';
import { getAuthRedirectUrl } from '../lib/authRedirect';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        authService.ensureUserProfile().then(setProfile).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await authService.ensureUserProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    setIsLoading(false);
    if (error) throw error;
    return data;
  };

  const signup = async (email: string, pass: string, fullName: string) => {
    setIsLoading(true);
    const redirectUrl = getAuthRedirectUrl('/auth/callback');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
        },
      },
    });
    setIsLoading(false);
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    const redirectUrl = getAuthRedirectUrl('/reset-password');
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    setIsLoading(false);
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setIsLoading(false);
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsLoading(false);
  };

  return {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    resetPassword,
    updatePassword,
    logout,
  };
}
