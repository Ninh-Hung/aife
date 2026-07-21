/**
 * Email Verification Page
 * Handles email verification when user clicks the link in their email
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { verifyEmail } from '../services/api';

// ============================================
// Type Definitions
// ============================================

type VerificationStatus = 'loading' | 'success' | 'error';

// ============================================
// Email Verification Component
// ============================================

export const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Ref to track if verification has been attempted (prevents double-calling in React StrictMode)
  const verificationAttempted = React.useRef(false);

  // Parse token from URL query params
  const token = searchParams.get('token');

  useEffect(() => {
    // Prevent double verification call (important for one-time use tokens)
    if (verificationAttempted.current) {
      return;
    }

    // Token validation and API call
    const performVerification = async () => {
      // Check if token exists
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid or missing verification token.');
        return;
      }

      // Mark as attempted before making the API call
      verificationAttempted.current = true;

      // Call verification API
      try {
        const result = await verifyEmail(token);

        if (result.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Verification failed. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    performVerification();
  }, [token]);

  const handleBackToLogin = () => {
    navigate('/');
  };

  // ============================================
  // Render Loading State
  // ============================================

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-700/50 bg-[#0F1F38] p-8 shadow-2xl">
            {/* Loading Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="mb-2 text-center text-2xl font-bold text-white">Verifying your email</h1>

            {/* Message */}
            <p className="text-center text-slate-300">
              Please wait while we verify your email address...
            </p>
          </div>

          {/* Branding */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <img src="/logo.svg" alt="" className="h-6 w-6 rounded-md" />
            <span className="text-sm text-slate-400">AppAIHelp.com</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render Success State
  // ============================================

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-700/50 bg-[#0F1F38] p-8 shadow-2xl">
            {/* Success Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="mb-2 text-center text-2xl font-bold text-white">
              Email verified successfully!
            </h1>

            {/* Message */}
            <div className="mb-6 text-center">
              <p className="mb-4 text-slate-300">
                Your email has been verified. You can now sign in to your account and access all
                features.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleBackToLogin}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-600"
              >
                Continue to Sign In
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-6 border-t border-slate-700/50 pt-6">
              <p className="text-center text-xs text-slate-400">
                Welcome to AppAIHelp! Sign in to get started with AI-powered services.
              </p>
            </div>
          </div>

          {/* Branding */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <img src="/logo.svg" alt="" className="h-6 w-6 rounded-md" />
            <span className="text-sm text-slate-400">AppAIHelp.com</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render Error State
  // ============================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-700/50 bg-[#0F1F38] p-8 shadow-2xl">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center text-2xl font-bold text-white">Verification Failed</h1>

          {/* Error Message */}
          <div className="mb-6 text-center">
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">
                {errorMessage || 'Unable to verify your email. The link may be invalid or expired.'}
              </p>
            </div>

            <p className="text-sm text-slate-300">
              If you continue to experience issues, please contact support or request a new
              verification email.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleBackToLogin}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-600"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Sign In
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 border-t border-slate-700/50 pt-6">
            <p className="text-center text-xs text-slate-400">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <img src="/logo.svg" alt="" className="h-6 w-6 rounded-md" />
          <span className="text-sm text-slate-400">AppAIHelp.com</span>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
