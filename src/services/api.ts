/**
 * API Service - HTTP Client Utilities
 * Handles all backend API communications
 */

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

if (!SERVER_URL) {
  throw new Error('VITE_SERVER_URL environment variable is not defined');
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
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
    const response = await fetch(
      `${SERVER_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Verification failed',
        message: data.message,
      };
    }

    return {
      success: true,
      data: data.data,
      message: data.message || 'Email verified successfully',
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    };
  }
};
