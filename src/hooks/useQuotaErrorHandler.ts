/**
 * useQuotaErrorHandler Hook
 *
 * Listens to global quota error events and shows upgrade modal
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuotaExceededError, RateLimitError, AnonymousLimitError } from '../types';

interface QuotaErrorState {
  isOpen: boolean;
  title: string;
  message: string;
  upgradeUrl?: string;
  remainingTokens?: number;
  quotaLimit?: number;
  isAnonymousLimit: boolean;
}

export function useQuotaErrorHandler() {
  const { t } = useTranslation();
  const [errorState, setErrorState] = useState<QuotaErrorState>({
    isOpen: false,
    title: '',
    message: '',
    isAnonymousLimit: false,
  });

  useEffect(() => {
    // Handle quota exceeded
    const handleQuotaExceeded = (event: CustomEvent<QuotaExceededError>) => {
      const data = event.detail;
      setErrorState({
        isOpen: true,
        title: t('quota.quotaExceededTitle'),
        message: data.message,
        upgradeUrl: data.upgradeUrl,
        remainingTokens: data.remainingTokens,
        quotaLimit: data.quotaLimit,
        isAnonymousLimit: false,
      });
    };

    // Handle rate limit
    const handleRateLimit = (event: CustomEvent<RateLimitError>) => {
      const data = event.detail;
      setErrorState({
        isOpen: true,
        title: t('quota.rateLimitTitle'),
        message: t('quota.retryInSeconds', { message: data.message, seconds: data.retryAfter }),
        isAnonymousLimit: false,
      });
    };

    // Handle anonymous limit
    const handleAnonymousLimit = (event: CustomEvent<AnonymousLimitError>) => {
      const data = event.detail;
      setErrorState({
        isOpen: true,
        title: t('quota.guestLimitTitle'),
        message: data.message,
        upgradeUrl: data.upgradeUrl,
        isAnonymousLimit: true,
      });
    };

    // Add event listeners
    window.addEventListener('quota:exceeded', handleQuotaExceeded as EventListener);
    window.addEventListener('quota:rate-limit', handleRateLimit as EventListener);
    window.addEventListener('quota:anonymous-limit', handleAnonymousLimit as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('quota:exceeded', handleQuotaExceeded as EventListener);
      window.removeEventListener('quota:rate-limit', handleRateLimit as EventListener);
      window.removeEventListener('quota:anonymous-limit', handleAnonymousLimit as EventListener);
    };
  }, [t]);

  const closeModal = () => {
    setErrorState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    errorState,
    closeModal,
  };
}
