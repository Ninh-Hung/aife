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
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
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
        onRefreshed(newAccessToken);

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
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
