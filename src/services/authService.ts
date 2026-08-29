import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';

export const authService = {
  /**
   * Auto-upsert profile entry in public.profiles for authenticated user
   */
  async ensureUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile) {
      return existingProfile as UserProfile;
    }

    // Auto-create profile entry
    const newProfile: UserProfile = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || 'MR Representative',
      company_name: 'Fluent Health Care',
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase
      .from('profiles')
      .upsert([newProfile])
      .select()
      .single();

    if (error) {
      console.error('Failed to create user profile:', error);
      return newProfile;
    }

    return created as UserProfile;
  },

  /**
   * Fetch current user profile
   */
  async getProfile(): Promise<UserProfile | null> {
    return this.ensureUserProfile();
  },

  /**
   * Update profile information
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },
};
