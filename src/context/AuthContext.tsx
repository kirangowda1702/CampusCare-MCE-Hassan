import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { authService } from '../services/authService';
import { mockUsers } from '../data/students';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password?: string, role?: UserRole) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginAsRole: (role: UserRole) => void;
  loginAsUser: (userId: string) => void;
  registerUser: (userData: Partial<User>, password?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updatedData: Partial<User>) => void;
  logout: () => Promise<void>;
  allDemoUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and synchronize session strictly with Supabase Auth
  useEffect(() => {
    let isMounted = true;

    const initAuthSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('[AuthContext] Session resolution error:', err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuthSession();

    // Listen to real-time auth events from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setIsLoading(false);
      } else if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile && isMounted) {
            setUser(profile as User);
          } else if (isMounted) {
            const meta = session.user.user_metadata || {};
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Campus Member',
              role: meta.role || 'student',
              createdAt: session.user.created_at || new Date().toISOString(),
              phone: meta.phone || '+91 98450 12345',
              doctorId: meta.doctor_id,
              usn: meta.usn,
              branch: meta.branch,
              semester: meta.semester
            });
          }
        } catch (profileErr) {
          console.warn('[AuthContext] Profile load on auth event error:', profileErr);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const loginWithEmail = async (
    email: string,
    password?: string,
    preferredRole?: UserRole
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!password) {
      return { success: false, error: 'Password is required to authenticate.' };
    }

    const res = await authService.signInWithEmail(email, password);
    if (res.error) {
      return { success: false, error: res.error };
    }

    if (res.user) {
      setUser(res.user);
      return { success: true, user: res.user };
    }

    return { success: false, error: 'Authentication failed. Please verify your credentials.' };
  };

  const registerUser = async (userData: Partial<User>, password?: string): Promise<{ success: boolean; error?: string }> => {
    if (!password) {
      return { success: false, error: 'Password is required to create an account.' };
    }

    const res = await authService.register(userData, password);
    if (res.error) {
      return { success: false, error: res.error };
    }

    if (res.user) {
      setUser(res.user);
      return { success: true };
    }

    return { success: false, error: 'Registration failed.' };
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!user) return;
    setUser(prev => (prev ? { ...prev, ...updatedData } : null));
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
  };

  // Helper references for non-authenticating development fixtures
  const loginAsRole = (_role: UserRole) => {
    console.warn('[AuthContext] loginAsRole requires real Supabase Auth credentials in production.');
  };

  const loginAsUser = (_userId: string) => {
    console.warn('[AuthContext] loginAsUser requires real Supabase Auth credentials in production.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        loginWithEmail,
        loginAsRole,
        loginAsUser,
        registerUser,
        updateProfile,
        logout,
        allDemoUsers: mockUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

