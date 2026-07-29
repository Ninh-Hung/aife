/**
 * Authentication Context (Production Implementation)
 * Access Token + Refresh Token architecture with token rotation
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserQuota, SubscriptionInfo } from '../types';
import axiosInstance, { setAccessToken, clearAccessToken, refreshAccessToken } from '../lib/axios';
import type { AxiosError } from 'axios';
import { getQuota, getSubscription } from '../services/quota.service';
import { listChatMessages, updateMyProfile, type UpdateMyProfileInput } from '../services/api';

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
  completeOAuthLogin: () => Promise<void>;
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
export const ANONYMOUS_CURRENT_SESSION_HAS_MESSAGES_STORAGE_KEY =
  'anonymousCurrentSessionHasMessages';
export const ANONYMOUS_PENDING_MERGE_SESSION_STORAGE_KEY = 'anonymousPendingMergeSessionId';
const ANONYMOUS_BOOTSTRAP_COOLDOWN_STORAGE_KEY = 'anonymousBootstrapCooldownUntil';
const ANONYMOUS_BOOTSTRAP_COOLDOWN_MS = 30_000;
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

const getAnonymousBootstrapCooldownUntil = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  const rawValue = window.sessionStorage.getItem(ANONYMOUS_BOOTSTRAP_COOLDOWN_STORAGE_KEY);
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const isAnonymousBootstrapCooldownActive = () => Date.now() < getAnonymousBootstrapCooldownUntil();

const rememberAnonymousBootstrapFailure = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    ANONYMOUS_BOOTSTRAP_COOLDOWN_STORAGE_KEY,
    String(Date.now() + ANONYMOUS_BOOTSTRAP_COOLDOWN_MS)
  );
};

const clearAnonymousBootstrapCooldown = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ANONYMOUS_BOOTSTRAP_COOLDOWN_STORAGE_KEY);
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

const hasMessageContent = (message: {
  content?: string | null;
  reasoning?: string | null;
  attachments?: unknown[] | null;
}) =>
  Boolean(message.content?.trim()) ||
  Boolean(message.reasoning?.trim()) ||
  Boolean(message.attachments?.length);

const shouldRequestAnonymousSessionMerge = async (sessionId: string): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return true;
  }

  const currentSessionId = window.sessionStorage.getItem(ANONYMOUS_CURRENT_SESSION_STORAGE_KEY);
  const hasMessagesValue = window.sessionStorage.getItem(
    ANONYMOUS_CURRENT_SESSION_HAS_MESSAGES_STORAGE_KEY
  );

  if (currentSessionId === sessionId) {
    if (hasMessagesValue === 'true') {
      return true;
    }

    if (hasMessagesValue === 'false') {
      return false;
    }
  }

  try {
    const response = await listChatMessages(sessionId);
    if (response.success && response.data) {
      return response.data.some(hasMessageContent);
    }
  } catch {
    // If verification fails, keep the existing merge prompt to avoid dropping a real chat.
  }

  return true;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // In-memory state only - NO localStorage
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial auth check
  const initializingRef = useRef(false); // Prevent multiple simultaneous initializations

  const applyUserData = useCallback((userData: AuthUserData): User => {
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
    return mappedUser;
  }, []);

  const fetchAndApplyCurrentUser = useCallback(
    async (config?: { skipAuthRefresh?: boolean; skipErrorToast?: boolean }): Promise<User> => {
      const userResponse = await axiosInstance.get('/auth/me', config);
      console.log('[AuthContext] User response:', userResponse.data);

      if (userResponse.data.success && userResponse.data.data?.user) {
        return applyUserData(userResponse.data.data.user);
      }

      throw new Error('User response invalid format');
    },
    [applyUserData]
  );

  const createAnonymousSession = useCallback(async () => {
    try {
      const anonymousResponse = await axiosInstance.post('/auth/anonymous', undefined, {
        skipAuthRefresh: true,
        skipErrorToast: true,
      });
      console.log('[AuthContext] Anonymous auth response:', anonymousResponse.data);

      if (!anonymousResponse.data.success || !anonymousResponse.data.data?.accessToken) {
        throw new Error('Anonymous auth response invalid format');
      }

      clearAnonymousBootstrapCooldown();
      setAccessToken(anonymousResponse.data.data.accessToken);

      if (anonymousResponse.data.data.user) {
        applyUserData(anonymousResponse.data.data.user);
      } else {
        await fetchAndApplyCurrentUser({
          skipAuthRefresh: true,
          skipErrorToast: true,
        });
      }
    } catch (error) {
      rememberAnonymousBootstrapFailure();
      throw error;
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
        if (
          typeof window !== 'undefined' &&
          window.location.pathname === '/auth/callback' &&
          new URLSearchParams(window.location.search).get('status') === 'success'
        ) {
          console.log('[AuthContext] OAuth callback route detected, deferring auth hydration...');
          return;
        }

        console.log('[AuthContext] Starting auth initialization...');

        if (isAnonymousBootstrapCooldownActive()) {
          console.info('[AuthContext] Anonymous bootstrap is cooling down; skipping auth retry');
          return;
        }

        try {
          // Attempt to refresh access token using HttpOnly refresh token
          await refreshAccessToken();
          console.log('[AuthContext] Access token set successfully');
          await fetchAndApplyCurrentUser({
            skipAuthRefresh: true,
            skipErrorToast: true,
          });
          clearAnonymousBootstrapCooldown();
        } catch (refreshError) {
          console.log(
            '[AuthContext] No valid session, creating anonymous session...',
            refreshError
          );

          if (isAnonymousBootstrapCooldownActive()) {
            console.info('[AuthContext] Anonymous bootstrap is cooling down; skipping retry');
            return;
          }

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
      const shouldPromptAnonymousMerge = pendingAnonymousSessionId
        ? await shouldRequestAnonymousSessionMerge(pendingAnonymousSessionId)
        : false;

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
          shouldPromptAnonymousMerge &&
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
      const axiosError = error as AxiosError<{
        message?: string;
        error?: string;
        errorCode?: string;
        data?: { email?: string };
      }>;
      console.error('[AuthContext] Login failed:', error);
      const responseData = axiosError.response?.data;
      const loginError = new Error(
        responseData?.message || 'Login failed. Please check your credentials.'
      ) as Error & { errorCode?: string; email?: string };
      loginError.errorCode = responseData?.errorCode || responseData?.error;
      loginError.email = responseData?.data?.email || identifier;
      throw loginError;
    }
  };

  const completeOAuthLogin = async () => {
    const pendingAnonymousSessionId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(ANONYMOUS_CURRENT_SESSION_STORAGE_KEY)
        : null;
    const shouldPromptAnonymousMerge =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(ANONYMOUS_CURRENT_SESSION_HAS_MESSAGES_STORAGE_KEY) !==
          'false'
        : true;

    clearUserScopedClientStorage();
    setUser(null);
    setQuota(null);
    setSubscription(null);

    let mappedUser: User;
    try {
      await refreshAccessToken();
      mappedUser = await fetchAndApplyCurrentUser();
    } catch (error) {
      await createAnonymousSession();
      throw error;
    }

    if (
      pendingAnonymousSessionId &&
      shouldPromptAnonymousMerge &&
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
    completeOAuthLogin,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
