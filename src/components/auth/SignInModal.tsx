/**
 * Sign In / Login Modal Component
 * Supports traditional email/password and OAuth (Google, Facebook, Apple)
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, Eye, EyeOff, User, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USERNAME_REGEX, MIN_USERNAME_LENGTH } from '../../common/constants';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// Props Interface
// ============================================

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// Sign In Modal Component
// ============================================

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Username availability check states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Lock body scroll when modal opens
      document.body.style.overflow = 'hidden';
    } else {
      // Unlock body scroll when modal closes
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset username availability states when toggling between sign in/up
  useEffect(() => {
    setIsCheckingUsername(false);
    setIsUsernameAvailable(null);
    setUsernameError(null);
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }
  }, [isSignUp]);

  // Debounced username availability check
  useEffect(() => {
    // Only check username availability during sign up
    if (!isSignUp) return;

    // Clear previous timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }

    // Reset states if username is empty or too short
    if (!username || username.length < MIN_USERNAME_LENGTH) {
      setIsCheckingUsername(false);
      setIsUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    // Validate username format (alphanumeric and underscore only)
    if (!USERNAME_REGEX.test(username)) {
      setIsCheckingUsername(false);
      setIsUsernameAvailable(false);
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Set checking state and debounce the API call (400ms)
    setIsCheckingUsername(true);
    setUsernameError(null);
    setIsUsernameAvailable(null);

    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const SERVER_URL = import.meta.env.VITE_SERVER_URL;
        const response = await fetch(
          `${SERVER_URL}/v1/common/check-availability?userName=${encodeURIComponent(username)}`,
          {
            method: 'GET',
          }
        );

        const data = await response.json();

        // Check if the response indicates success
        if (data.success) {
          // data.exists === true means username is taken
          // data.exists === false means username is available
          if (data.data.exists) {
            setIsUsernameAvailable(false);
            setUsernameError('This username is already taken');
          } else {
            setIsUsernameAvailable(true);
            setUsernameError(null);
          }
        } else {
          // Non-blocking warning if API returns success: false
          setUsernameError('Unable to verify username right now');
          setIsUsernameAvailable(null);
        }
      } catch (err) {
        // Non-blocking warning on network error
        setUsernameError('Unable to verify username right now');
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    // Cleanup timeout on unmount or username change
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, [username, isSignUp]);

  if (!isOpen && !isAnimating) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Handle registration
    if (isSignUp) {
      // Prevent submission if username check is in progress
      if (isCheckingUsername) {
        setError('Please wait while we verify your username');
        return;
      }

      // Prevent submission if username is not available
      if (isUsernameAvailable === false) {
        setError('Please choose a different username');
        return;
      }

      setIsLoading(true);
      try {
        const SERVER_URL = import.meta.env.VITE_SERVER_URL;
        const response = await fetch(`${SERVER_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userName: username,
            email,
            password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Registration failed. Please try again.');
        }

        // Registration successful - redirect to "check your email" page
        navigate('/email-sent', { state: { email } });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle login
      setIsLoading(true);
      try {
        await login(email, password);
        // Login successful - close modal and redirect to New Chat
        handleClose();
        navigate('/new-chat');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'facebook' | 'apple') => {
    // TODO: Add OAuth logic
    console.log(`OAuth login with ${provider}`);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isAnimating ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleOverlayClick}
    >
      {/* Modal Container */}
      <div
        className={`relative max-h-[90vh] w-full max-w-md transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Modal Card */}
        <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0F1F38] shadow-2xl">
          {/* Header */}
          <div className="relative flex-shrink-0 border-b border-slate-700/50 px-8 pb-6 pt-8">
            <button
              onClick={handleClose}
              className="absolute right-6 top-6 text-slate-400 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500">
                <span className="text-sm font-bold text-white">AI</span>
              </div>
              <span className="text-lg font-semibold text-white">AppAIHelp.com</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {isSignUp
                ? 'Sign up to access all AI-powered tools'
                : 'Sign in to continue to your account'}
            </p>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* OAuth Buttons */}
            <div className="mb-6 space-y-3">
              <button
                onClick={() => handleOAuthLogin('google')}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => handleOAuthLogin('facebook')}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1877F2] px-4 py-3 font-medium text-white transition-colors hover:bg-[#166FE5]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </button>

              <button
                onClick={() => handleOAuthLogin('apple')}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-black px-4 py-3 font-medium text-white transition-colors hover:bg-gray-900"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#0F1F38] px-4 text-slate-400">Or continue with email</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input - Only for Sign Up */}
              {isSignUp && (
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className={`w-full rounded-lg border bg-slate-800/50 py-3 pl-11 pr-11 text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 ${
                        usernameError && isUsernameAvailable === false
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : isUsernameAvailable === true
                            ? 'border-teal-500 focus:border-teal-500 focus:ring-teal-500/20'
                            : 'border-slate-700 focus:border-teal-500 focus:ring-teal-500/20'
                      }`}
                      required
                    />
                    {/* Loading / Success / Error Indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingUsername && (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      )}
                      {!isCheckingUsername && isUsernameAvailable === true && (
                        <CheckCircle2 className="h-5 w-5 text-teal-400" />
                      )}
                    </div>
                  </div>
                  {/* Username Error Message */}
                  {usernameError && (
                    <p
                      className={`mt-1.5 text-sm ${
                        isUsernameAvailable === false ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    >
                      {usernameError}
                    </p>
                  )}
                </div>
              )}

              {/* Email/Username Input */}
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                  {isSignUp ? 'Email Address' : 'Email or Username'}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSignUp ? <Mail className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <input
                    id="email"
                    type={isSignUp ? 'email' : 'text'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isSignUp ? 'Enter your email' : 'Enter your email or username'}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-500 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-12 text-white placeholder-slate-500 transition-all focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-teal-400 transition-colors hover:text-teal-300"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isLoading || (isSignUp && (isCheckingUsername || isUsernameAvailable === false))
                }
                className="mt-6 w-full rounded-lg bg-teal-500 px-4 py-3 font-medium text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-500/50"
              >
                {isLoading
                  ? 'Loading...'
                  : isCheckingUsername
                    ? 'Verifying username...'
                    : isSignUp
                      ? 'Create Account'
                      : 'Sign In'}
              </button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <div className="mt-6 text-center">
              <span className="text-sm text-slate-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              </span>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-medium text-teal-400 transition-colors hover:text-teal-300"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-800/30 px-8 py-4">
            <p className="text-center text-xs text-slate-400">
              By continuing, you agree to our{' '}
              <a href="#terms" className="text-teal-400 transition-colors hover:text-teal-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-teal-400 transition-colors hover:text-teal-300">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
