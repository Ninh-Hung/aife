/**
 * Quota & Subscription API Service
 *
 * Provides methods for fetching quota, subscription, and anonymous user statistics
 */

import axios from 'axios';
import type {
  UserQuota,
  CurrentSubscriptionDetails,
  AnonymousUserStats,
  Package,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

/**
 * Get current user's quota information
 */
export async function getQuota(): Promise<UserQuota> {
  const response = await axios.get(`${API_BASE_URL}/api/me/quota`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  return response.data.data;
}

/**
 * Get current user's subscription with package details
 */
export async function getSubscription(): Promise<CurrentSubscriptionDetails> {
  const response = await axios.get(`${API_BASE_URL}/api/me/subscription`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  return response.data.data;
}

/**
 * Get anonymous user statistics (cookie-based)
 * No authentication required - uses aibe_anon_id cookie
 */
export async function getAnonymousStats(): Promise<AnonymousUserStats> {
  const response = await axios.get(`${API_BASE_URL}/api/me/anonymous-stats`, {
    withCredentials: true, // Send cookies
  });

  return response.data.data;
}

/**
 * Get all available packages
 */
export async function getPackages(): Promise<Package[]> {
  const response = await axios.get(`${API_BASE_URL}/api/packages`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  return response.data.data;
}

/**
 * Upgrade subscription to a new package
 */
export async function upgradeSubscription(packageId: string): Promise<CurrentSubscriptionDetails> {
  const response = await axios.post(
    `${API_BASE_URL}/api/subscriptions/upgrade`,
    { packageId },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    }
  );

  return response.data.data;
}

/**
 * Refresh quota info (call after LLM operations)
 */
export async function refreshQuota(): Promise<UserQuota> {
  return getQuota();
}

/**
 * Get trial status and days remaining
 */
export async function getTrialStatus(): Promise<{
  isTrialing: boolean;
  daysRemaining: number | null;
  expiresAt: string | null;
}> {
  const subscription = await getSubscription();

  return {
    isTrialing: subscription.isTrialSubscription,
    daysRemaining: subscription.isTrialSubscription
      ? Math.ceil((new Date(subscription.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
    expiresAt: subscription.trialEndsAt,
  };
}

/**
 * Check if user has sufficient tokens for an operation
 */
export async function hasTokens(estimatedTokens: number): Promise<boolean> {
  const quota = await getQuota();
  return quota.remainingTokens >= estimatedTokens;
}
