/**
 * Email Verification Pending Page
 * Displayed after successful registration to prompt email verification
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

// ============================================
// Email Verification Pending Component
// ============================================

export const EmailVerificationPending: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const handleBackToSignIn = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-slate-700/50 bg-[#0F1F38] p-8 shadow-2xl">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/20">
              <Mail className="h-8 w-8 text-teal-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center text-2xl font-bold text-white">Check your email</h1>

          {/* Message */}
          <div className="mb-6 text-center">
            <p className="mb-3 text-slate-300">
              We've sent a verification link to your email address.
            </p>
            <p className="mb-4 text-slate-300">
              Please verify your email to activate your account.
            </p>

            {/* Display email if available */}
            {email && (
              <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="mb-1 text-sm text-slate-400">Email sent to:</p>
                <p className="font-medium text-white">{email}</p>
              </div>
            )}

            {/* Secondary hints */}
            <p className="text-sm text-slate-400">
              Didn't receive the email? Check your spam folder.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Back to Sign In Button */}
            <button
              onClick={handleBackToSignIn}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-600"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Sign In
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 border-t border-slate-700/50 pt-6">
            <p className="text-center text-xs text-slate-400">
              Once you verify your email, you'll be able to sign in and access all features.
            </p>
          </div>
        </div>

        {/* Logo/Branding */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500">
            <span className="text-xs font-bold text-white">AI</span>
          </div>
          <span className="text-sm text-slate-400">AppAIHelp.com</span>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPending;
