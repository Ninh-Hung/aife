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
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#0F1F38] border border-slate-700/50 rounded-2xl shadow-2xl p-8">
            {/* Loading Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Verifying your email
            </h1>

            {/* Message */}
            <p className="text-slate-300 text-center">
              Please wait while we verify your email address...
            </p>
          </div>

          {/* Branding */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-slate-400 text-sm">AppAIHelp.com</span>
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
      <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[#0F1F38] border border-slate-700/50 rounded-2xl shadow-2xl p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Email verified successfully!
            </h1>

            {/* Message */}
            <div className="text-center mb-6">
              <p className="text-slate-300 mb-4">
                Your email has been verified. You can now sign in to your account and access all features.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleBackToLogin}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Continue to Sign In
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-center text-slate-400">
                Welcome to AppAIHelp! Sign in to get started with AI-powered services.
              </p>
            </div>
          </div>

          {/* Branding */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <span className="text-slate-400 text-sm">AppAIHelp.com</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Render Error State
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#0F1F38] border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Verification Failed
          </h1>

          {/* Error Message */}
          <div className="text-center mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">
                {errorMessage || 'Unable to verify your email. The link may be invalid or expired.'}
              </p>
            </div>

            <p className="text-slate-300 text-sm">
              If you continue to experience issues, please contact support or request a new verification email.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleBackToLogin}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Sign In
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-xs text-center text-slate-400">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <span className="text-slate-400 text-sm">AppAIHelp.com</span>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
