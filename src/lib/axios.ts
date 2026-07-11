/**
 * Centralized Axios Instance
 * Configured with base URL, credentials, and interceptors for token management
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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

// ============================================
// Request Interceptor
// Automatically attach access token to requests
// ============================================

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshFinished = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

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

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string | null) => {
            if (!token) {
              reject(error);
              return;
            }
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('[Axios] Attempting token refresh...');

        // Attempt to refresh the token
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/auth/refresh`,
          {},
          {
            withCredentials: true, // Send refresh token cookie
          }
        );

        console.log('[Axios] Refresh response:', response.data);

        const newAccessToken = response.data.data?.accessToken;
        if (!newAccessToken) {
          throw new Error('No access token in refresh response');
        }

        setAccessToken(newAccessToken);
        console.log('[Axios] New access token set, retrying queued requests');

        // Retry all queued requests with new token
        onRefreshFinished(newAccessToken);

        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - user needs to log in again
        console.error('[Axios] Token refresh failed:', refreshError);
        clearAccessToken();
        onRefreshFinished(null);
        // Dispatch a custom event to notify AuthContext
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
