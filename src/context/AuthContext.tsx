import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { mockUsers } from '../data/students';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loginAsRole: (role: UserRole) => void;
  loginWithEmail: (email: string, role?: UserRole) => boolean;
  registerUser: (userData: Partial<User>) => void;
  updateProfile: (updatedData: Partial<User>) => void;
  logout: () => void;
  allDemoUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('campuscare_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return mockUsers[0]; // default to Rahul Sharma
      }
    }
    return mockUsers[0]; // default student demo logged in for seamless demo review
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('campuscare_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('campuscare_user');
    }
  }, [user]);

  const loginAsRole = (role: UserRole) => {
    const matched = mockUsers.find(u => u.role === role) || mockUsers[0];
    setUser(matched);
  };

  const loginWithEmail = (email: string, preferredRole?: UserRole): boolean => {
    const matched = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setUser(matched);
      return true;
    }
    // If unknown email, generate user
    const newUser: User = {
      id: 'usr-custom-' + Date.now(),
      email,
      fullName: email.split('@')[0].replace('.', ' ').toUpperCase(),
      role: preferredRole || 'student',
      phone: '+91 98450 ' + Math.floor(10000 + Math.random() * 90000),
      createdAt: new Date().toISOString(),
      usn: preferredRole === 'student' ? '4MC22CS' + Math.floor(100 + Math.random() * 899) : undefined,
      branch: 'Information Science & Engineering',
      semester: 5
    };
    setUser(newUser);
    return true;
  };

  const registerUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: 'usr-reg-' + Date.now(),
      email: userData.email || 'user@mcehassan.ac.in',
      fullName: userData.fullName || 'Campus Member',
      role: userData.role || 'student',
      phone: userData.phone || '+91 99887 66554',
      createdAt: new Date().toISOString(),
      ...userData
    };
    setUser(newUser);
  };

  const updateProfile = (updatedData: Partial<User>) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, ...updatedData } : null);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        loginAsRole,
        loginWithEmail,
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
