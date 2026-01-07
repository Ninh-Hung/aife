/**
 * Core TypeScript Interfaces for appaihelp.com
 * Multi-service AI Platform Data Models
 */

// ============================================
// User & Authentication
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subscription: SubscriptionTier;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// ============================================
// AI Agent Configuration
// ============================================

export interface Agent {
  id: string;
  name: string;
  role: string; // e.g., "Professional Translator", "Casual Translator"
  systemPrompt: string;
  creativityLevel: number; // 0-100 (maps to temperature)
  userId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  systemPrompt: string;
  creativityLevel: number;
}

// ============================================
// Translation Service
// ============================================

export interface TranslationRequest {
  sourceText: string;
  sourceLanguage: Language;
  targetLanguages: Language[];
  agentId: string;
}

export interface TranslationResult {
  id: string;
  targetLanguage: Language;
  translatedText: string;
  sourceText: string;
  sourceLanguage: Language;
  agentId: string;
  status: TranslationStatus;
  createdAt: Date;
}

export type TranslationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Language {
  code: string; // ISO 639-1 code (e.g., 'en', 'fr', 'ja')
  name: string; // Display name (e.g., 'English', 'French', 'Japanese')
  nativeName: string; // Native name (e.g., 'English', 'Français', '日本語')
  flag?: string; // Emoji flag or icon
}

// ============================================
// Common Language Presets
// ============================================

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

// ============================================
// Theme & UI State
// ============================================

export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

// ============================================
// Navigation & Routes
// ============================================

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

export interface ServiceNavItem extends NavItem {
  description?: string;
  badge?: string;
}
