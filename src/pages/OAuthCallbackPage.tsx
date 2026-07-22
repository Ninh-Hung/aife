import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { OAUTH_PROVIDER } from '../common/constants';

const OAUTH_PROVIDER_LABELS: Record<string, string> = {
  [OAUTH_PROVIDER.APPLE]: 'Apple',
  [OAUTH_PROVIDER.GOOGLE]: 'Google',
  [OAUTH_PROVIDER.GITHUB]: 'GitHub',
};

const providerLabel = (provider: string | null) =>
  provider ? OAUTH_PROVIDER_LABELS[provider] || 'Social' : 'Social';

const oauthErrorMessage = (errorCode: string | null, provider: string | null) => {
  const providerName = providerLabel(provider);
  const messages: Record<string, string> = {
    OAUTH_PROVIDER_ERROR: `${providerName} sign-in was cancelled or rejected.`,
    OAUTH_CONFIGURATION_MISSING: `${providerName} sign-in is not configured yet.`,
    OAUTH_STATE_INVALID: `${providerName} sign-in session expired. Please try again.`,
    OAUTH_TOKEN_EXCHANGE_FAILED: `${providerName} sign-in could not be completed.`,
    OAUTH_ID_TOKEN_INVALID: `${providerName} sign-in response could not be verified.`,
    OAUTH_EMAIL_MISSING: `${providerName} did not return an email address.`,
    OAUTH_EMAIL_NOT_VERIFIED: `Your ${providerName} email is not verified.`,
    OAUTH_ACCOUNT_DISABLED: 'This account is disabled.',
    OAUTH_LOGIN_FAILED: `${providerName} sign-in failed. Please try again.`,
  };

  return messages[errorCode || ''] || messages.OAUTH_LOGIN_FAILED;
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
  const provider = searchParams.get('provider');
  const [message, setMessage] = useState(`Completing ${providerLabel(provider)} sign-in...`);

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }
    hasHandledRef.current = true;

    const handleCallback = async () => {
      const status = searchParams.get('status');
      const provider = searchParams.get('provider');
      const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
      const errorCode = searchParams.get('error');

      if (status !== 'success') {
        navigate('/', {
          replace: true,
          state: {
            authMode: 'signin',
            authError: oauthErrorMessage(errorCode, provider),
          },
        });
        return;
      }

      try {
        await completeOAuthLogin();
        navigate(returnTo, { replace: true });
      } catch (error) {
        console.error('[OAuthCallback] Failed to complete OAuth login:', error);
        setMessage(`${providerLabel(provider)} sign-in failed. Redirecting...`);
        navigate('/', {
          replace: true,
          state: {
            authMode: 'signin',
            authError: oauthErrorMessage('OAUTH_LOGIN_FAILED', provider),
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
