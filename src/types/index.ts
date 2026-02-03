/**
 * Core TypeScript Interfaces for appaihelp.com
 * Multi-service AI Platform Data Models
 */

// ============================================
// User & Authentication
// ============================================

export interface User {
  publicId: string; // Backend uses publicId instead of id
  userName: string; // Backend uses userName instead of name
  email: string;
  role: string; // ADMIN, USER, etc.
  avatar?: string;
  subscription?: SubscriptionTier; // Optional from backend
  createdAt?: Date;
  updatedAt?: Date;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// ============================================
// AI Agent Configuration
// ============================================

export interface Agent {
  id: string;
  name: string;
  description?: string;
  capabilityIds: string[];
  characteristicIds: string[];
  knowledgeIds: string[];
  ownerType: 'USER' | 'PROJECT';
  ownerId?: number;
  userId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Association totals returned by the list endpoint
  capabilityCount?: number;
  characteristicCount?: number;
  knowledgeCount?: number;
  // Populated relations
  capabilities?: Capability[];
  characteristics?: Characteristic[];
  knowledges?: Knowledge[];
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  capabilityIds: string[];
  characteristicIds: string[];
  knowledgeIds: string[];
  ownerType: 'USER' | 'PROJECT';
  ownerId?: number;
}

// Deprecated - kept for backward compatibility during migration
export interface LegacyAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  creativityLevel: number;
  userId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Capabilities
// ============================================

export interface Capability {
  publicId: string;
  code: string;
  name: string;
  description: string;
}

// ============================================
// Characteristics
// ============================================

export type CharacteristicScope = 'system' | 'user' | 'project' | 'all';

export interface Characteristic {
  publicId: string;
  code: string;
  name: string;
  prompt: string;
  isSystem: boolean;
  userId?: number;
  projectId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCharacteristicInput {
  code: string;
  name: string;
  prompt: string;
  projectId?: number;
}

// ============================================
// Knowledge
// ============================================

export type KnowledgeScope = 'system' | 'user' | 'project' | 'all';
export type KnowledgeSourceType = 'text' | 'file' | 'url';

export interface Knowledge {
  publicId: string;
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  sourceContent?: string;
  ownerType: 'SYSTEM' | 'USER' | 'PROJECT';
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKnowledgeInput {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  sourceContent?: string;
  projectId?: number;
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

// ============================================
// API Key Management
// ============================================

export interface ApiKey {
  publicId: string;
  name: string;
  prefix: string;
  status: 'ACTIVE' | 'REVOKED';
  metadata?: {
    appName?: string;
    environment?: string;
    description?: string;
  };
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyInput {
  name: string;
  metadata?: {
    appName?: string;
    environment?: string;
    description?: string;
  };
}

export interface CreateApiKeyResponse {
  apiKey: string;
}

// ============================================
// Subscription & Billing
// ============================================

export interface PackageMetadata {
  color: string;
  icon: string; // Lucide icon name (e.g., "Zap", "Crown", "Shield")
}

export interface PackageCapability {
  quotaLimit: number;
  quotaUnit: string; // token | char | image | request
  period: string; // day | month
  maxQualityTier: string; // low | standard | high
  capability: {
    publicId: string;
    code: string;
    name: string;
    description?: string;
    isActive: boolean;
  };
}

export interface Package {
  publicId: string;
  code: string;
  name: string;
  price: number;
  duration: number; // duration in days
  maxAgents: number; // -1 for unlimited
  metadata?: string; // JSON string containing PackageMetadata
  capabilities: PackageCapability[];
  isActive: boolean;
  createdAt?: string;
}

export interface CurrentSubscription {
  publicId: string;
  startAt: string;
  endAt: string;
  status: 'active' | 'expired' | 'canceled';
  package?: {
    publicId: string;
    code: string;
    name: string;
    price: number;
    duration: number;
    isActive: boolean;
  };
  coupon?: {
    publicId: string;
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
}

export interface BillingHistoryItem {
  publicId: string;
  packageName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentDate: string;
  invoiceUrl?: string;
  createdAt: string;
}

// ============================================
// Chat & Messaging
// ============================================

export interface ChatSession {
  id: string;
  agentId: string;
  title: string; // Auto-generated or custom title
  lastMessage?: string; // Preview of last message
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'failed';
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  agentResponse?: ChatMessage;
}
