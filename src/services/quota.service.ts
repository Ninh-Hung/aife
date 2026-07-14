/**
 * Quota & Subscription API Service
 *
 * Provides methods for fetching quota, subscription, and anonymous user statistics
 */

import axiosInstance from '../lib/axios';
import type {
  UserQuota,
  CurrentSubscriptionDetails,
  AnonymousUserStats,
  Package,
} from '../types';

/**
 * Get current user's quota information
 */
export async function getQuota(): Promise<UserQuota> {
  const response = await axiosInstance.get('/v1/subscriptions/quota');

  return response.data.data;
}

/**
 * Get current user's subscription with package details
 */
export async function getSubscription(): Promise<CurrentSubscriptionDetails> {
  const response = await axiosInstance.get('/v1/subscriptions/current');

  const subscription = response.data.data;

  return {
    ...subscription,
    userId: subscription.userId ?? 0,
    packageId: subscription.packageId ?? 0,
    isTrialSubscription: subscription.isTrialSubscription ?? subscription.status === 'trialing',
    trialEndsAt: subscription.trialEndsAt ?? null,
    willDowngradeTo: subscription.willDowngradeTo ?? null,
  };
}

/**
 * Get anonymous user statistics (cookie-based)
 * No authentication required - uses aibe_anon_id cookie
 */
export async function getAnonymousStats(): Promise<AnonymousUserStats> {
  const response = await axiosInstance.get('/api/me/anonymous-stats');

  return response.data.data;
}

/**
 * Get all available packages
 */
export async function getPackages(): Promise<Package[]> {
  const response = await axiosInstance.get('/v1/common/packages');

  return response.data.data;
}

/**
 * Upgrade subscription to a new package
 */
export async function upgradeSubscription(packageId: string): Promise<CurrentSubscriptionDetails> {
  const response = await axiosInstance.post('/v1/subscriptions/subscribe', {
    packagePublicId: packageId,
  });

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
