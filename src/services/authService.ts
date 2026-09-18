import { supabase, isSupabaseConfigured } from './supabase';
import { User } from '../types';
import { mockUsers } from '../data/students';

function getLocalItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return null;
}

function setLocalItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

function removeLocalItem(key: string): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) return profile as User;
      }
    }
    const saved = getLocalItem('campuscare_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return mockUsers[0]; }
    }
    return mockUsers[0];
  },

  async signInWithEmail(email: string, password?: string): Promise<{ user: User | null; error?: string }> {
    if (isSupabaseConfigured && password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error: error.message };
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        return { user: (profile as User) || null };
      }
    }
    const matched = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) return { user: matched };
    
    // Fallback user
    const newUser: User = {
      id: 'usr-custom-' + Date.now(),
      email,
      fullName: email.split('@')[0].replace('.', ' ').toUpperCase(),
      role: 'student',
      phone: '+91 98450 12345',
      createdAt: new Date().toISOString(),
      usn: '4MC22CS' + Math.floor(100 + Math.random() * 899),
      branch: 'Information Science & Engineering',
      semester: 5
    };
    return { user: newUser };
  },

  async register(userData: Partial<User>, password?: string): Promise<{ user: User | null; error?: string }> {
    if (isSupabaseConfigured && userData.email && password) {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: password,
        options: {
          data: {
            full_name: userData.fullName,
            role: userData.role || 'student'
          }
        }
      });
      if (error) return { user: null, error: error.message };
      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          email: userData.email,
          fullName: userData.fullName || 'Campus Member',
          role: userData.role || 'student',
          phone: userData.phone || '+91 99887 66554',
          createdAt: new Date().toISOString(),
          ...userData
        };
        await supabase.from('profiles').insert([newUser]);
        return { user: newUser };
      }
    }

    const newUser: User = {
      id: 'usr-reg-' + Date.now(),
      email: userData.email || 'user@mcehassan.ac.in',
      fullName: userData.fullName || 'Campus Member',
      role: userData.role || 'student',
      phone: userData.phone || '+91 99887 66554',
      createdAt: new Date().toISOString(),
      ...userData
    };
    return { user: newUser };
  },

  async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login'
      });
      if (error) return { success: false, error: error.message };
    }
    return { success: true };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    removeLocalItem('campuscare_user');
  }
};
