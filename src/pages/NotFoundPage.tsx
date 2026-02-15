/**
 * 404 Not Found Page
 * Displayed when the user navigates to an unknown or invalid route
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

// ============================================
// NotFound Page Component
// ============================================

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 md:py-24">
      {/* Icon Badge */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
        <FileQuestion className="h-10 w-10 text-blue-500 dark:text-blue-400" />
      </div>

      {/* 404 Number */}
      <h1 className="mb-2 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-center text-8xl font-extrabold text-transparent dark:from-blue-400 dark:to-indigo-400 md:text-9xl">
        404
      </h1>

      {/* Heading */}
      <h2 className="mb-3 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
        Page Not Found
      </h2>

      {/* Description */}
      <p className="mb-2 max-w-sm text-center text-base text-gray-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has been moved.
      </p>

      {/* Requested path */}
      {location.pathname && (
        <div className="mb-8 mt-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="font-mono text-sm text-gray-400 dark:text-slate-500">
            {location.pathname}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Go to Dashboard */}
        <button
          onClick={handleGoHome}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </button>

        {/* Go Back */}
        <button
          onClick={handleGoBack}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
