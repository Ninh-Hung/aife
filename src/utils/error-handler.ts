/**
 * Error Handler Utility
 *
 * Handles quota exceeded, rate limit, and anonymous limit errors
 */

import type { AxiosError } from 'axios';
import type { QuotaExceededError, RateLimitError, AnonymousLimitError } from '../types';

export interface ErrorHandlerResult {
  isQuotaError: boolean;
  isRateLimitError: boolean;
  isAnonymousLimitError: boolean;
  message: string;
  upgradeUrl?: string;
  remainingTokens?: number;
  quotaLimit?: number;
  retryAfter?: number;
  sessionsUsed?: number;
  maxSessions?: number;
}

/**
 * Check if error is a quota exceeded error
 */
export function isQuotaExceededError(
  error: unknown
): error is AxiosError<QuotaExceededError> {
  const axiosError = error as AxiosError;
  return (
    axiosError?.response?.status === 429 &&
    (axiosError.response.data as any)?.error === 'Quota exceeded'
  );
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is AxiosError<RateLimitError> {
  const axiosError = error as AxiosError;
  return (
    axiosError?.response?.status === 429 &&
    (axiosError.response.data as any)?.error === 'Rate limit exceeded'
  );
}

/**
 * Check if error is an anonymous limit error
 */
export function isAnonymousLimitError(
  error: unknown
): error is AxiosError<AnonymousLimitError> {
  const axiosError = error as AxiosError;
  return (
    axiosError?.response?.status === 429 &&
    ((axiosError.response.data as any)?.error === 'ANONYMOUS_LIMIT_EXCEEDED' ||
      (axiosError.response.data as any)?.error === 'Anonymous session limit exceeded' ||
      (axiosError.response.data as any)?.error === 'Anonymous message limit exceeded')
  );
}

/**
 * Handle API errors and return structured error info
 */
export function handleApiError(error: unknown): ErrorHandlerResult {
  const defaultResult: ErrorHandlerResult = {
    isQuotaError: false,
    isRateLimitError: false,
    isAnonymousLimitError: false,
    message: 'An unexpected error occurred. Please try again.',
  };

  if (!error) return defaultResult;

  // Handle quota exceeded
  if (isQuotaExceededError(error)) {
    const data = error.response!.data;
    return {
      isQuotaError: true,
      isRateLimitError: false,
      isAnonymousLimitError: false,
      message: data.message,
      upgradeUrl: data.upgradeUrl,
      remainingTokens: data.remainingTokens,
      quotaLimit: data.quotaLimit,
    };
  }

  // Handle rate limit
  if (isRateLimitError(error)) {
    const data = error.response!.data;
    return {
      isQuotaError: false,
      isRateLimitError: true,
      isAnonymousLimitError: false,
      message: data.message,
      retryAfter: data.retryAfter,
    };
  }

  // Handle anonymous limit
  if (isAnonymousLimitError(error)) {
    const data = error.response!.data;
    return {
      isQuotaError: false,
      isRateLimitError: false,
      isAnonymousLimitError: true,
      message: data.message,
      upgradeUrl: data.upgradeUrl,
      sessionsUsed: data.sessionsUsed,
      maxSessions: data.maxSessions,
    };
  }

  // Handle other axios errors
  const axiosError = error as AxiosError;
  if (axiosError.response) {
    return {
      ...defaultResult,
      message:
        (axiosError.response.data as any)?.message ||
        `Error: ${axiosError.response.status} ${axiosError.response.statusText}`,
    };
  }

  return defaultResult;
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: ErrorHandlerResult): string {
  if (error.isQuotaError) {
    return `${error.message} (${error.remainingTokens?.toLocaleString()} / ${error.quotaLimit?.toLocaleString()} tokens remaining)`;
  }

  if (error.isRateLimitError) {
    return `${error.message} Retry in ${error.retryAfter} seconds.`;
  }

  if (error.isAnonymousLimitError) {
    return `${error.message} (${error.sessionsUsed}/${error.maxSessions} sessions used)`;
  }

  return error.message;
}
