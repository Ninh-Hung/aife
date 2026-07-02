/**
 * useQuotaRefresh Hook
 *
 * Provides methods to refresh quota after LLM operations
 */

import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useQuotaRefresh() {
  const { refreshQuota, isAuthenticated } = useAuth();

  /**
   * Refresh quota - call this after every LLM operation
   */
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await refreshQuota();
    } catch (error) {
      console.error('[useQuotaRefresh] Failed to refresh quota:', error);
    }
  }, [isAuthenticated, refreshQuota]);

  return { refresh };
}
