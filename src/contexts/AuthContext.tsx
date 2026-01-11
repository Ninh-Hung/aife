/**
 * Authentication Context (Production Implementation)
 * Access Token + Refresh Token architecture with token rotation
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import axiosInstance, { setAccessToken, clearAccessToken } from '../lib/axios';
import { AxiosError } from 'axios';

// ============================================
// Context Interface
// ============================================

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
// Auth Provider Component
// ============================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // In-memory state only - NO localStorage
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial auth check
  const initializingRef = useRef(false); // Prevent multiple simultaneous initializations

  // ============================================
  // Initialize Authentication on App Mount
  // ============================================

  useEffect(() => {
    // Guard against multiple simultaneous calls (React.StrictMode in dev)
    if (initializingRef.current) {
      console.log('[AuthContext] Already initializing, skipping...');
      return;
    }

    const initAuth = async () => {
      initializingRef.current = true;

      try {
        console.log('[AuthContext] Starting auth initialization...');

        // Attempt to refresh access token using HttpOnly refresh token
        const response = await axiosInstance.post('/auth/refresh');
        console.log('[AuthContext] Refresh response:', response.data);

        if (response.data.success && response.data.data?.accessToken) {
          setAccessToken(response.data.data.accessToken);
          console.log('[AuthContext] Access token set successfully');

          // Fetch user data with the new access token
          const userResponse = await axiosInstance.get('/auth/me');
          console.log('[AuthContext] User response:', userResponse.data);

          if (userResponse.data.success && userResponse.data.data?.user) {
            // Extract user object from response (server returns {user: {...}, package: {...}})
            const userData = userResponse.data.data.user;

            // Map server field names to frontend field names
            const mappedUser: User = {
              publicId: userData.publicId,
              userName: userData.userName,
              email: userData.email,
              role: userData.role,
              avatar: userData.avatarUrl, // Map avatarUrl -> avatar
              subscription: userResponse.data.data.package?.tier || 'free', // Map package tier to subscription
            };

            setUser(mappedUser);
            console.log('[AuthContext] User set successfully:', mappedUser);
          } else {
            console.warn('[AuthContext] User response invalid format:', userResponse.data);
          }
        } else {
          console.warn('[AuthContext] Refresh response invalid format:', response.data);
        }
      } catch (error) {
        // Silent fail - user is not authenticated
        console.error('[AuthContext] Auth initialization failed:', error);
        clearAccessToken();
        setUser(null);
      } finally {
        setIsLoading(false);
        console.log('[AuthContext] Auth initialization complete');
      }
    };

    initAuth();
  }, []);

  // ============================================
  // Listen for auth:logout events from axios interceptor
  // ============================================

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      clearAccessToken();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  // ============================================
  // Login Function
  // ============================================

  const login = async (identifier: string, password: string) => {
    try {
      console.log('[AuthContext] Login attempt for:', identifier);

      const response = await axiosInstance.post('/auth/login', {
        identifier, // Can be email or username
        password,
      });

      console.log('[AuthContext] Login response:', response.data);

      if (response.data.success && response.data.data) {
        const { accessToken, user: userData, package: userPackage } = response.data.data;

        // Store access token in memory
        setAccessToken(accessToken);
        console.log('[AuthContext] Access token stored');

        // Map server field names to frontend field names
        const mappedUser: User = {
          publicId: userData.publicId,
          userName: userData.userName,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatarUrl, // Map avatarUrl -> avatar
          subscription: userPackage?.tier || 'free', // Map package tier to subscription
        };

        // Store user in state
        setUser(mappedUser);
        console.log('[AuthContext] User stored:', mappedUser);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('[AuthContext] Login failed:', error);
      throw new Error(
        axiosError.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    }
  };

  // ============================================
  // Logout Function
  // ============================================

  const logout = async () => {
    try {
      // Call backend logout to revoke refresh token
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error);
    } finally {
      // Clear in-memory state
      clearAccessToken();
      setUser(null);
    }
  };

  // ============================================
  // Context Value
  // ============================================

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
