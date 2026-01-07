/**
 * Authentication Context (Mock Implementation)
 * In production, replace with actual authentication service
 */

import React, { createContext, useContext, useState } from 'react';
import { User } from '../types';

// ============================================
// Context Interface
// ============================================

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ============================================
// Context Creation
// ============================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================
// Custom Hook
// ============================================

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ============================================
// Mock User Data
// ============================================

const mockUser: User = {
  id: 'user-001',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: '', // Leave empty to use initials
  subscription: 'pro',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
};

// ============================================
// Auth Provider Component
// ============================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Mock implementation - automatically authenticated
  const [user, setUser] = useState<User | null>(mockUser);

  const login = async (email: string, password: string) => {
    // Mock login - in production, call actual auth API
    console.log('Login:', email, password);
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
