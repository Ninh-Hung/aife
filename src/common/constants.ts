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
