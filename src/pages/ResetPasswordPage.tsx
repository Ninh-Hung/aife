import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { resetPassword } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validationError = useMemo(() => {
    if (!password) return null;
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
    if (confirmPassword && password !== confirmPassword) return 'Passwords do not match';
    return null;
  }, [confirmPassword, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Reset link is invalid or missing.');
      return;
    }

    if (validationError || password !== confirmPassword) {
      setError(validationError || 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword({ token, newPassword: password });
      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to reset password');
      }

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/?auth=signin', { replace: true });
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0F1F38] shadow-2xl">
        <div className="border-b border-slate-700/50 px-8 pb-6 pt-8">
          <div className="mb-6 flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-semibold text-white">AppAIHelp.com</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-400">Create a new password for your account.</p>
        </div>

        <div className="px-8 py-6">
          {!token && (
            <div className="mb-4 flex gap-3 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-300">Reset link is invalid or missing.</p>
            </div>
          )}

          {isSuccess ? (
            <div className="rounded-lg border border-teal-500/50 bg-teal-500/10 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-teal-400" />
              <p className="font-medium text-white">Password reset successfully</p>
              <p className="mt-1 text-sm text-slate-400">Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your new password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-12 text-white placeholder-slate-500 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-500 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>
              </div>

              {validationError && <p className="text-sm text-yellow-400">{validationError}</p>}

              <button
                type="submit"
                disabled={isSubmitting || !token || Boolean(validationError)}
                className="mt-6 flex w-full items-center justify-center rounded-lg bg-teal-500 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-500/50"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/?auth=signin"
              className="text-sm font-medium text-teal-400 hover:text-teal-300"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
