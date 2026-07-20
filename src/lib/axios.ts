/**
 * Centralized Axios Instance
 * Configured with base URL, credentials, and interceptors for token management
 */

import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// ============================================
// Axios Instance Configuration
// ============================================

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true, // Required for HttpOnly cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const isFormDataBody = (data: unknown): data is FormData => {
  return typeof FormData !== 'undefined' && data instanceof FormData;
};

const removeContentTypeHeader = (config: InternalAxiosRequestConfig) => {
  if (!config.headers) return;

  if (config.headers instanceof AxiosHeaders) {
    config.headers.delete('Content-Type');
    return;
  }

  delete config.headers['Content-Type'];
  delete config.headers['content-type'];
};

// ============================================
// In-Memory Token Storage
// ============================================

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const clearAccessToken = () => {
  accessToken = null;
};

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const newAccessToken = response.data.data?.accessToken;

        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        setAccessToken(newAccessToken);
        return newAccessToken;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// ============================================
// Request Interceptor
// Automatically attach access token to requests
// ============================================

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isFormDataBody(config.data)) {
      removeContentTypeHeader(config);
    }

    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[Axios] Request to ${config.url} with token`);
    } else {
      console.log(`[Axios] Request to ${config.url} without token`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// Response Interceptor
// Handle 401 errors and token refresh
// ============================================

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle quota/limit errors (429) - dispatch custom event
    if (error.response?.status === 429) {
      const responseData = error.response.data as { error?: string; [key: string]: unknown };

      // Dispatch custom event based on error type
      if (responseData?.error === 'Quota exceeded') {
        window.dispatchEvent(
          new CustomEvent('quota:exceeded', {
            detail: responseData,
          })
        );
      } else if (responseData?.error === 'Rate limit exceeded') {
        window.dispatchEvent(
          new CustomEvent('quota:rate-limit', {
            detail: responseData,
          })
        );
      } else if (
        responseData?.error === 'ANONYMOUS_LIMIT_EXCEEDED' ||
        responseData?.error === 'Anonymous session limit exceeded' ||
        responseData?.error === 'Anonymous message limit exceeded'
      ) {
        window.dispatchEvent(
          new CustomEvent('quota:anonymous-limit', {
            detail: responseData,
          })
        );
      }

      return Promise.reject(error);
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = originalRequest.url || '';

      // Auth bootstrap calls must resolve/reject directly. Retrying refresh from a
      // failed refresh request can leave app initialization waiting forever.
      if (requestUrl.includes('/auth/refresh') || requestUrl.includes('/auth/anonymous')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        console.log('[Axios] Attempting token refresh...');

        const newAccessToken = await refreshAccessToken();
        console.log('[Axios] New access token set, retrying request');

        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to log in again
        console.error('[Axios] Token refresh failed:', refreshError);
        clearAccessToken();
        // Dispatch a custom event to notify AuthContext
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
