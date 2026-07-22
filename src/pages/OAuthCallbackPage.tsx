import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAUTH_PROVIDER_ERROR: 'Google sign-in was cancelled or rejected.',
  OAUTH_CONFIGURATION_MISSING: 'Google sign-in is not configured yet.',
  OAUTH_STATE_INVALID: 'Google sign-in session expired. Please try again.',
  OAUTH_TOKEN_EXCHANGE_FAILED: 'Google sign-in could not be completed.',
  OAUTH_EMAIL_NOT_VERIFIED: 'Your Google email is not verified.',
  OAUTH_ACCOUNT_DISABLED: 'This account is disabled.',
  OAUTH_LOGIN_FAILED: 'Google sign-in failed. Please try again.',
};

const sanitizeReturnTo = (returnTo: string | null) => {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return '/new-chat';
  }

  try {
    const parsed = new URL(returnTo, window.location.origin);
    if (parsed.origin !== window.location.origin || parsed.pathname.startsWith('/auth/')) {
      return '/new-chat';
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/new-chat';
  }
};

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthLogin } = useAuth();
  const hasHandledRef = useRef(false);
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }
    hasHandledRef.current = true;

    const handleCallback = async () => {
      const status = searchParams.get('status');
      const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
      const errorCode = searchParams.get('error');

      if (status !== 'success') {
        navigate('/', {
          replace: true,
          state: {
            authMode: 'signin',
            authError:
              OAUTH_ERROR_MESSAGES[errorCode || ''] || OAUTH_ERROR_MESSAGES.OAUTH_LOGIN_FAILED,
          },
        });
        return;
      }

      try {
        await completeOAuthLogin();
        navigate(returnTo, { replace: true });
      } catch (error) {
        console.error('[OAuthCallback] Failed to complete OAuth login:', error);
        setMessage('Google sign-in failed. Redirecting...');
        navigate('/', {
          replace: true,
          state: {
            authMode: 'signin',
            authError: OAUTH_ERROR_MESSAGES.OAUTH_LOGIN_FAILED,
          },
        });
      }
    };

    void handleCallback();
  }, [completeOAuthLogin, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1628] text-white">
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin text-teal-400" />
        <span>{message}</span>
      </div>
    </div>
  );
};
