/**
 * Common constants and validation patterns
 */

// ============================================
// Validation Patterns
// ============================================

/**
 * Username validation pattern
 * Allows: letters (a-z, A-Z), numbers (0-9), and underscores (_)
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

/**
 * Minimum username length
 */
export const MIN_USERNAME_LENGTH = 3;

/**
 * Shared translation key for AI-generated content warning
 */
export const AI_AGENT_WARNING_MESSAGE_KEY = 'chat.aiAgentWarning';

export const OAUTH_PROVIDER = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  APPLE: 'apple',
  GITHUB: 'github',
} as const;

export type OAuthProvider = (typeof OAUTH_PROVIDER)[keyof typeof OAUTH_PROVIDER];

export const ENABLED_OAUTH_PROVIDERS = new Set<OAuthProvider>([
  OAUTH_PROVIDER.GOOGLE,
  OAUTH_PROVIDER.FACEBOOK,
  OAUTH_PROVIDER.APPLE,
  OAUTH_PROVIDER.GITHUB,
]);
