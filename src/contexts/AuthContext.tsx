/**
 * Authentication Context (Production Implementation)
 * Access Token + Refresh Token architecture with token rotation
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserQuota, SubscriptionInfo } from '../types';
import axiosInstance, { setAccessToken, clearAccessToken } from '../lib/axios';
import { AxiosError } from 'axios';
import { getQuota, getSubscription } from '../services/quota.service';

// ============================================
// Context Interface
// ============================================

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  quota: UserQuota | null;
  subscription: SubscriptionInfo | null;
  refreshQuota: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
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
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
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
              quota: userData.quota,
              subscription: userData.subscription,
            };

            setUser(mappedUser);

            // Set quota and subscription from user data if available
            if (userData.quota) {
              setQuota(userData.quota);
            }
            if (userData.subscription) {
              setSubscription(userData.subscription);
            }

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
  // Auto-refresh quota every 30 seconds (when authenticated)
  // ============================================

  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(async () => {
      try {
        const quotaData = await getQuota();
        setQuota(quotaData);
        setUser(prev => prev ? { ...prev, quota: quotaData } : null);
      } catch (error) {
        // Silent fail - quota will be refreshed on next interval
        console.debug('[AuthContext] Background quota refresh failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [user]);

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
          quota: userData.quota,
          subscription: userData.subscription,
        };

        // Store user in state
        setUser(mappedUser);

        // Set quota and subscription from user data if available
        if (userData.quota) {
          setQuota(userData.quota);
        }
        if (userData.subscription) {
          setSubscription(userData.subscription);
        }

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
  // Refresh Quota Function
  // ============================================

  const refreshQuota = async () => {
    if (!user) return;

    try {
      const quotaData = await getQuota();
      setQuota(quotaData);

      // Update user object with latest quota
      setUser(prev => prev ? { ...prev, quota: quotaData } : null);

      console.log('[AuthContext] Quota refreshed:', quotaData);
    } catch (error) {
      console.error('[AuthContext] Failed to refresh quota:', error);
    }
  };

  // ============================================
  // Refresh Subscription Function
  // ============================================

  const refreshSubscription = async () => {
    if (!user) return;

    try {
      const subscriptionData = await getSubscription();

      // Map to SubscriptionInfo format
      const mappedSubscription: SubscriptionInfo = {
        status: subscriptionData.status,
        packageName: subscriptionData.package.name,
        packageCode: subscriptionData.package.code,
        isTrialing: subscriptionData.isTrialSubscription,
        trialDaysRemaining: subscriptionData.trialEndsAt
          ? Math.ceil((new Date(subscriptionData.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        expiresAt: subscriptionData.endAt,
      };

      setSubscription(mappedSubscription);

      // Update user object with latest subscription
      setUser(prev => prev ? { ...prev, subscription: mappedSubscription } : null);

      console.log('[AuthContext] Subscription refreshed:', mappedSubscription);
    } catch (error) {
      console.error('[AuthContext] Failed to refresh subscription:', error);
    }
  };

  // ============================================
  // Logout Function
  // ============================================

  const logout = async () => {
    try {
      // Call backend logout to revoke refresh token (with credentials: "include")
      // Note: axiosInstance already configured with withCredentials: true
      await axiosInstance.post('/auth/logout');
      console.log('[AuthContext] Logout successful');
    } catch (error) {
      // Even if logout fails, clear local state to avoid stuck session
      console.error('[AuthContext] Logout API error (proceeding with local cleanup):', error);
    } finally {
      // Clear access token from memory
      clearAccessToken();

      // Clear user-related state (user profile, permissions, cached auth data)
      setUser(null);
      setQuota(null);
      setSubscription(null);

      console.log('[AuthContext] Local auth state cleared');

      // Redirect to login page
      window.location.href = '/';
    }
  };

  // ============================================
  // Context Value
  // ============================================

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    quota,
    subscription,
    refreshQuota,
    refreshSubscription,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
