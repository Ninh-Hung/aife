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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1F38] to-[#1a2942] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-[#0F1F38] border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-teal-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Check your email
          </h1>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-slate-300 mb-3">
              We've sent a verification link to your email address.
            </p>
            <p className="text-slate-300 mb-4">
              Please verify your email to activate your account.
            </p>

            {/* Display email if available */}
            {email && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-400 mb-1">Email sent to:</p>
                <p className="text-white font-medium">{email}</p>
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
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Sign In
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <p className="text-xs text-center text-slate-400">
              Once you verify your email, you'll be able to sign in and access all features.
            </p>
          </div>
        </div>

        {/* Logo/Branding */}
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

export default EmailVerificationPending;
