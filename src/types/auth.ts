import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  distributor_address?: string | null;
  gstin?: string | null;
  updated_at?: string | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
}

export interface SearchResultItem {
  id: string;
  type: 'doctor' | 'medicine' | 'order';
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
}
