/**
 * API Service - HTTP Client Utilities
 * Handles all backend API communications
 */

import axiosInstance from '../lib/axios';
import { AxiosError } from 'axios';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// Email Verification API
// ============================================

/**
 * Verifies user email using the token from email link
 * @param token - One-time verification token
 * @returns Promise with verification result
 */
export const verifyEmail = async (token: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.get('/auth/verify-email', {
      params: { token },
    });

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Email verified successfully',
    };
  } catch (error) {
    console.error('Email verification error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Network error. Please check your connection and try again.',
      message: axiosError.response?.data?.message,
    };
  }
};

// ============================================
// API Key Management
// ============================================

import type { ApiKey, CreateApiKeyInput, CreateApiKeyResponse } from '../types';

/**
 * Fetches all API keys for the current user
 * SECURITY: Raw API keys are NEVER returned by this endpoint
 * @returns Promise with array of API keys (with masked previews only)
 */
export const listApiKeys = async (): Promise<ApiResponse<ApiKey[]>> => {
  try {
    const response = await axiosInstance.get('/v1/api-keys');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List API keys error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load API keys',
    };
  }
};

/**
 * Creates a new API key
 * SECURITY: The raw API key is returned ONLY ONCE in this response
 * The client MUST display it immediately and MUST NOT persist it
 * @param input - API key creation parameters
 * @returns Promise with the raw API key (SHOWN ONLY ONCE)
 */
export const createApiKey = async (
  input: CreateApiKeyInput
): Promise<ApiResponse<CreateApiKeyResponse>> => {
  try {
    const response = await axiosInstance.post('/v1/api-keys', input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'API key created successfully',
    };
  } catch (error) {
    console.error('Create API key error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create API key',
    };
  }
};

/**
 * Revokes an API key (irreversible)
 * @param publicId - The public ID of the API key to revoke
 * @returns Promise with revocation result
 */
export const revokeApiKey = async (publicId: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post(`/v1/api-keys/${publicId}/revoke`);

    return {
      success: true,
      data: response.data.data,
      message: 'API key revoked successfully',
    };
  } catch (error) {
    console.error('Revoke API key error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to revoke API key',
    };
  }
};
