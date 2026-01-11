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
