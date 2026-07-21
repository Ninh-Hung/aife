/**
 * Authentication Context (Production Implementation)
 * Access Token + Refresh Token architecture with token rotation
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserQuota, SubscriptionInfo } from '../types';
import axiosInstance, { setAccessToken, clearAccessToken, refreshAccessToken } from '../lib/axios';
import type { AxiosError } from 'axios';
import { getQuota, getSubscription } from '../services/quota.service';
import { updateMyProfile, type UpdateMyProfileInput } from '../services/api';

// ============================================
// Context Interface
// ============================================

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  quota: UserQuota | null;
  subscription: SubscriptionInfo | null;
  refreshQuota: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  updateProfile: (input: UpdateMyProfileInput) => Promise<void>;
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

type AuthUserData = {
  publicId: string;
  userName: string;
  fullName?: string | null;
  email: string;
  role: string;
  authProvider?: string;
  avatarUrl?: string | null;
  quota?: UserQuota;
  subscription?: SubscriptionInfo;
};

const ANONYMOUS_AUTH_PROVIDER = 'ANONYMOUS';
export const ANONYMOUS_CURRENT_SESSION_STORAGE_KEY = 'anonymousCurrentSessionId';
export const ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY = 'anonymousPendingMergeSessionId';
const ENABLE_SUBSCRIPTION_QUOTA_CHECKS = false;
const PRESERVED_STORAGE_KEYS = new Set(['theme-mode']);
const USER_SCOPED_STORAGE_KEY_PATTERNS = [
  'agent',
  'auth',
  'chat',
  'conversation',
  'quota',
  'session',
  'subscription',
  'token',
  'user',
];

const clearStorageByPattern = (storage: Storage) => {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || PRESERVED_STORAGE_KEYS.has(key)) {
      continue;
    }

    const normalizedKey = key.toLowerCase();
    if (USER_SCOPED_STORAGE_KEY_PATTERNS.some((pattern) => normalizedKey.includes(pattern))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
};

const clearUserScopedClientStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  clearStorageByPattern(window.localStorage);
  clearStorageByPattern(window.sessionStorage);
};

const isAnonymousUser = (user: User | null): boolean => {
  if (!user) {
    return false;
  }

  return (
    user.authProvider === ANONYMOUS_AUTH_PROVIDER ||
    user.email.endsWith('@anonymous.appaihelp.local') ||
    user.userName.startsWith('anon_')
  );
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // In-memory state only - NO localStorage
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial auth check
  const initializingRef = useRef(false); // Prevent multiple simultaneous initializations

  const applyUserData = useCallback((userData: AuthUserData) => {
    const mappedUser: User = {
      publicId: userData.publicId,
      userName: userData.userName,
      fullName: userData.fullName ?? undefined,
      email: userData.email,
      role: userData.role,
      authProvider: userData.authProvider,
      avatar: userData.avatarUrl ?? undefined,
      quota: userData.quota,
      subscription: userData.subscription,
    };

    setUser(mappedUser);

    if (userData.quota) {
      setQuota(userData.quota);
    } else {
      setQuota(null);
    }

    if (userData.subscription) {
      setSubscription(userData.subscription);
    } else {
      setSubscription(null);
    }

    console.log('[AuthContext] User set successfully:', mappedUser);
  }, []);

  const fetchAndApplyCurrentUser = useCallback(async () => {
    const userResponse = await axiosInstance.get('/auth/me');
    console.log('[AuthContext] User response:', userResponse.data);

    if (userResponse.data.success && userResponse.data.data?.user) {
      applyUserData(userResponse.data.data.user);
      return;
    }

    throw new Error('User response invalid format');
  }, [applyUserData]);

  const createAnonymousSession = useCallback(async () => {
    const anonymousResponse = await axiosInstance.post('/auth/anonymous');
    console.log('[AuthContext] Anonymous auth response:', anonymousResponse.data);

    if (!anonymousResponse.data.success || !anonymousResponse.data.data?.accessToken) {
      throw new Error('Anonymous auth response invalid format');
    }

    setAccessToken(anonymousResponse.data.data.accessToken);

    if (anonymousResponse.data.data.user) {
      applyUserData(anonymousResponse.data.data.user);
    } else {
      await fetchAndApplyCurrentUser();
    }
  }, [applyUserData, fetchAndApplyCurrentUser]);

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

        try {
          // Attempt to refresh access token using HttpOnly refresh token
          await refreshAccessToken();
          console.log('[AuthContext] Access token set successfully');
          await fetchAndApplyCurrentUser();
        } catch (refreshError) {
          console.log(
            '[AuthContext] No valid session, creating anonymous session...',
            refreshError
          );

          await createAnonymousSession();
        }
      } catch (error) {
        // Silent fail - user is not authenticated
        console.error('[AuthContext] Auth initialization failed:', error);
        clearAccessToken();
        clearUserScopedClientStorage();
        setUser(null);
        setQuota(null);
        setSubscription(null);
      } finally {
        setIsLoading(false);
        console.log('[AuthContext] Auth initialization complete');
      }
    };

    initAuth();
  }, [createAnonymousSession, fetchAndApplyCurrentUser]);

  // ============================================
  // Listen for auth:logout events from axios interceptor
  // ============================================

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setQuota(null);
      setSubscription(null);
      clearAccessToken();
      clearUserScopedClientStorage();
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
    // Temporarily disabled: backend quota endpoint is not available in the current flow.
    if (!ENABLE_SUBSCRIPTION_QUOTA_CHECKS) return;
    if (!user) return;

    const intervalId = setInterval(async () => {
      try {
        const quotaData = await getQuota();
        setQuota(quotaData);
        setUser((prev) => (prev ? { ...prev, quota: quotaData } : null));
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
      const pendingAnonymousSessionId =
        typeof window !== 'undefined' && isAnonymousUser(user)
          ? window.sessionStorage.getItem(ANONYMOUS_CURRENT_SESSION_STORAGE_KEY)
          : null;

      const response = await axiosInstance.post('/auth/login', {
        identifier, // Can be email or username
        password,
      });

      console.log('[AuthContext] Login response:', response.data);

      if (response.data.success && response.data.data) {
        const { accessToken, user: userData } = response.data.data;

        clearUserScopedClientStorage();
        setUser(null);
        setQuota(null);
        setSubscription(null);

        // Store access token in memory
        setAccessToken(accessToken);
        console.log('[AuthContext] Access token stored');

        // Map server field names to frontend field names
        const mappedUser: User = {
          publicId: userData.publicId,
          userName: userData.userName,
          fullName: userData.fullName ?? undefined,
          email: userData.email,
          role: userData.role,
          authProvider: userData.authProvider,
          avatar: userData.avatarUrl ?? undefined, // Map avatarUrl -> avatar
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

        if (
          pendingAnonymousSessionId &&
          !isAnonymousUser(mappedUser) &&
          typeof window !== 'undefined'
        ) {
          window.sessionStorage.setItem(
            ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY,
            pendingAnonymousSessionId
          );
          window.dispatchEvent(
            new CustomEvent('anonymous:merge-pending', {
              detail: {
                sessionId: pendingAnonymousSessionId,
              },
            })
          );
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
    // Temporarily disabled: avoid calling GET /v1/subscriptions/quota.
    if (!ENABLE_SUBSCRIPTION_QUOTA_CHECKS) return;
    if (!user) return;

    try {
      const quotaData = await getQuota();
      setQuota(quotaData);

      // Update user object with latest quota
      setUser((prev) => (prev ? { ...prev, quota: quotaData } : null));

      console.log('[AuthContext] Quota refreshed:', quotaData);
    } catch (error) {
      console.error('[AuthContext] Failed to refresh quota:', error);
    }
  };

  // ============================================
  // Refresh Subscription Function
  // ============================================

  const refreshSubscription = async () => {
    // Temporarily disabled with quota checks while subscription gating is not active.
    if (!ENABLE_SUBSCRIPTION_QUOTA_CHECKS) return;
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
          ? Math.ceil(
              (new Date(subscriptionData.trialEndsAt).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        expiresAt: subscriptionData.endAt,
      };

      setSubscription(mappedSubscription);

      // Update user object with latest subscription
      setUser((prev) => (prev ? { ...prev, subscription: mappedSubscription } : null));

      console.log('[AuthContext] Subscription refreshed:', mappedSubscription);
    } catch (error) {
      console.error('[AuthContext] Failed to refresh subscription:', error);
    }
  };

  // ============================================
  // Update Profile Function
  // ============================================

  const updateProfile = async (input: UpdateMyProfileInput) => {
    const response = await updateMyProfile(input);

    if (!response.success || !response.data?.user) {
      throw new Error(response.error || response.message || 'Failed to update profile');
    }

    const userData = response.data.user;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            publicId: userData.publicId,
            userName: userData.userName,
            fullName: userData.fullName ?? undefined,
            email: userData.email,
            role: userData.role,
            authProvider: userData.authProvider,
            avatar: userData.avatarUrl ?? userData.avatar ?? undefined,
          }
        : null
    );
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
      clearUserScopedClientStorage();

      // Clear user-related state (user profile, permissions, cached auth data)
      setUser(null);
      setQuota(null);
      setSubscription(null);

      console.log('[AuthContext] Local auth state cleared');

      try {
        await createAnonymousSession();
      } catch (anonymousError) {
        console.error(
          '[AuthContext] Failed to create anonymous session after logout:',
          anonymousError
        );
        clearAccessToken();
        clearUserScopedClientStorage();
        setUser(null);
        setQuota(null);
        setSubscription(null);
      }
    }
  };

  // ============================================
  // Context Value
  // ============================================

  const contextValue: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isAnonymous: isAnonymousUser(user),
    isLoading,
    quota,
    subscription,
    refreshQuota,
    refreshSubscription,
    updateProfile,
    login,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
