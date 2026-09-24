import { supabase, isSupabaseConfigured } from './supabase';
import { User } from '../types';

export const authService = {
  /**
   * Retrieves the current authenticated user session strictly from Supabase Auth.
   * Returns null if no active authenticated session exists.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return null;
      }

      // Query user profile from profiles/users table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        return profile as User;
      }

      // Build User model from Supabase auth user metadata
      const meta = user.user_metadata || {};
      return {
        id: user.id,
        email: user.email || '',
        fullName: meta.full_name || meta.name || user.email?.split('@')[0] || 'Campus Member',
        role: meta.role || 'student',
        createdAt: user.created_at || new Date().toISOString(),
        phone: meta.phone || '+91 98450 12345',
        doctorId: meta.doctor_id,
        usn: meta.usn,
        branch: meta.branch,
        semester: meta.semester
      };
    } catch (err) {
      console.warn('[authService] getCurrentUser error:', err);
      return null;
    }
  },

  /**
   * Authenticates user strictly via Supabase Auth signInWithPassword.
   */
  async signInWithEmail(email: string, password?: string): Promise<{ user: User | null; error?: string }> {
    if (!email || !password) {
      return { user: null, error: 'Email and password are required to sign in.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'No user record returned from authentication service.' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile) {
        return { user: profile as User };
      }

      const meta = data.user.user_metadata || {};
      const authenticatedUser: User = {
        id: data.user.id,
        email: data.user.email || email,
        fullName: meta.full_name || meta.name || email.split('@')[0],
        role: meta.role || 'student',
        createdAt: data.user.created_at || new Date().toISOString(),
        phone: meta.phone || '+91 98450 12345',
        doctorId: meta.doctor_id,
        usn: meta.usn,
        branch: meta.branch,
        semester: meta.semester
      };

      return { user: authenticatedUser };
    } catch (err: any) {
      return { user: null, error: err.message || 'Authentication failed.' };
    }
  },

  /**
   * Registers a new user strictly via Supabase Auth signUp.
   */
  async register(userData: Partial<User>, password?: string): Promise<{ user: User | null; error?: string }> {
    if (!userData.email || !password) {
      return { user: null, error: 'Email and password are required for registration.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email.trim(),
        password: password,
        options: {
          data: {
            full_name: userData.fullName || 'Campus Member',
            role: userData.role || 'student',
            phone: userData.phone || '+91 98450 12345',
            usn: userData.usn,
            branch: userData.branch,
            semester: userData.semester,
            employee_id: userData.employeeId,
            doctor_id: userData.doctorId
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Registration succeeded, but user confirmation is pending.' };
      }

      const newUser: User = {
        id: data.user.id,
        email: userData.email,
        fullName: userData.fullName || 'Campus Member',
        role: userData.role || 'student',
        phone: userData.phone || '+91 98450 12345',
        createdAt: new Date().toISOString(),
        ...userData
      };

      try {
        await supabase.from('profiles').insert([newUser]);
      } catch (insertErr) {
        // Profile insert can be managed via DB triggers or direct insert
      }

      return { user: newUser };
    } catch (err: any) {
      return { user: null, error: err.message || 'Registration failed.' };
    }
  },

  /**
   * Sends password reset email via Supabase Auth.
   */
  async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  },

  /**
   * Signs out user strictly from Supabase Auth and clears client session cache.
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[authService] signOut error:', err);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('campuscare_user');
    }
  }
};
