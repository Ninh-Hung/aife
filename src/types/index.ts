/**
 * Core TypeScript Interfaces for appaihelp.com
 * Multi-service AI Platform Data Models
 */

// ============================================
// User & Authentication
// ============================================

// ✨ NEW: User Quota Info
export interface UserQuota {
  remainingTokens: number;
  quotaLimit: number;
  percentageUsed: number;
}

// ✨ NEW: Subscription Info (Enhanced)
export interface SubscriptionInfo {
  status: 'trialing' | 'active' | 'expired' | 'canceled';
  packageName: string;
  packageCode: 'TRIAL' | 'FREE' | 'PRO' | 'ENTERPRISE';
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  expiresAt: string;
}

export interface User {
  publicId: string; // Backend uses publicId instead of id
  userName: string; // Backend uses userName instead of name
  email: string;
  role: string; // ADMIN, USER, etc.
  authProvider?: string;
  avatar?: string;
  avatarType?: 'image' | 'video';

  // ✨ NEW: Enhanced quota & subscription
  quota?: UserQuota;
  subscription?: SubscriptionInfo;

  createdAt?: Date;
  updatedAt?: Date;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// ============================================
// AI Agent Configuration
// ============================================

export interface Agent {
  id: string;
  publicId: string; // Backend agent configuration identifier
  name: string;
  description?: string;
  avatarUrl?: string | null;
  avatarType?: 'image' | 'video';
  characteristicIds: string[];
  knowledgeIds: string[];
  ownerType?: 'SYSTEM' | 'USER' | 'PROJECT' | 'INTERNAL';
  ownerId?: number;
  userId?: string;
  isActive?: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Association totals returned by the list endpoint
  characteristicCount?: number;
  knowledgeCount?: number;
  // Populated relations
  characteristics?: Characteristic[];
  knowledges?: Knowledge[];
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  avatarUrl?: string | null;
  characteristicIds: string[];
  knowledgeIds: string[];
  ownerType?: 'USER' | 'PROJECT';
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
export type CharacteristicLayer =
  | 'identity'
  | 'tone_style'
  | 'values'
  | 'behavior'
  | 'constraints'
  | 'domain';

export interface Characteristic {
  publicId: string;
  code: string;
  name: string;
  description?: string | null;
  layer: CharacteristicLayer | string;
  prompt: string;
  sortOrder?: number;
  priority?: number;
  status?: string;
  visibility?: string;
  isSystem: boolean;
  userId?: number;
  projectId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCharacteristicInput {
  code: string;
  name: string;
  description?: string;
  layer: CharacteristicLayer;
  prompt: string;
  sortOrder?: number;
  status?: 'published';
  projectId?: number;
}

// ============================================
// Knowledge
// ============================================

export type KnowledgeScope = 'system' | 'user' | 'project' | 'all';
export type KnowledgeSourceType = 'text' | 'file' | 'url';
export type KnowledgeSyncStatus = 'pending' | 'processing' | 'success' | 'partial' | 'failed' | string;

export interface KnowledgeFileInfo {
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
}

export interface Knowledge {
  publicId: string;
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  source?: KnowledgeSourceType;
  sourceContent?: string;
  ownerType: 'SYSTEM' | 'USER' | 'PROJECT';
  ownerId?: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
  syncStatus?: KnowledgeSyncStatus | null;
  syncedAt?: Date | string | null;
  chunkCount?: number | null;
  vectorCount?: number | null;
  errorSummary?: string | null;
  files?: KnowledgeFileInfo[];
}

export interface CreateKnowledgeInput {
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  content?: string;
  sourceUrl?: string;
  files?: File[];
  projectId?: number | string;
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
  countryCode?: string; // ISO 3166-1 alpha-2 code used for flag image URLs
}

// ============================================
// Common Language Presets
// ============================================

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', countryCode: 'gb' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', countryCode: 'es' },
  { code: 'fr', name: 'French', nativeName: 'Français', countryCode: 'fr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', countryCode: 'de' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', countryCode: 'it' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', countryCode: 'pt' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', countryCode: 'ru' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', countryCode: 'jp' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', countryCode: 'kr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', countryCode: 'vn' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', countryCode: 'cn' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', countryCode: 'sa' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', countryCode: 'in' },
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

/** Actions a scope can grant for one capability */
export interface ApiKeyScopeInput {
  capabilityCode: string;
  canExecute: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

/** Capability scope as returned on an API key */
export interface ApiKeyScopeResponse {
  capabilityCode: string;
  capabilityName: string;
  canExecute: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

export interface ApiKey {
  publicId: string;
  status: 'ACTIVE' | 'REVOKED';
  metadata?: {
    appName?: string;
    environment?: string;
    description?: string;
  };
  capabilities: ApiKeyScopeResponse[];
  createdAt: string;
  revokedAt?: string | null;
  lastUsed?: string | null;
}

export interface CreateApiKeyInput {
  capabilities: ApiKeyScopeInput[];
  metadata?: {
    appName?: string;
    environment?: string;
    description?: string;
  };
}

export interface CreateApiKeyResponse extends ApiKey {
  /** Raw secret — shown ONLY ONCE at creation time */
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
  publicId?: string;
  internalId?: number;
  agentId: string | number;
  agentPublicId: string;
  agentName: string;
  agentKey?: string;
  title: string; // Auto-generated or custom title
  lastMessage?: string; // Preview of last message
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  reasoning?: string | null;
  sources?: ChatSource[];
  attachments?: ChatMessageAttachment[];
  conversationTitle?: string;
  anonymousLimit?: AnonymousLimitError;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ChatMessageAttachment {
  publicId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl?: string | null;
}

export interface ChatSource {
  marker: string;
  url?: string;
  title: string;
}

export interface SharedConversationMessage {
  publicId: string;
  role: 'user' | 'agent';
  content: string;
  type?: string;
  createdAt: string;
  sources?: ChatSource[];
  attachments?: Array<ChatMessageAttachment & { displayMode?: 'PREVIEW' | 'DOWNLOAD' | 'OMITTED' }>;
}

export interface SharedConversation {
  publicId: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  messageCount: number;
  messages: SharedConversationMessage[];
}

export interface ChatShare {
  publicId: string;
  shareToken: string;
  sharePath: string;
  shareUrl?: string;
  title?: string | null;
  status: string;
  snapshotVersion: number;
  messageCount: number;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  agentResponse?: ChatMessage;
}

// ============================================
// Anonymous User (NEW)
// ============================================

export interface AnonymousUserStats {
  sessionsUsed: number;
  maxSessions: number;
  totalMessages: number;
  totalTokens: number;
  createdAt: string;
  sessions: {
    id: number;
    publicId: string;
    messageCount: number;
    tokenCount: number;
    createdAt: string;
  }[];
}

// ============================================
// Enhanced Package (Token-based)
// ============================================

export interface EnhancedPackage {
  publicId: string;
  code: 'TRIAL' | 'FREE' | 'PRO' | 'ENTERPRISE';
  name: string;
  price: number;
  duration: number; // days

  // Token-based quota
  tokensPerMonth: number; // -1 = unlimited
  maxAgents: number; // -1 = unlimited

  // Trial-specific
  isTrial: boolean;
  trialDurationDays?: number;

  isActive: boolean;
  createdAt?: string;
}

// ============================================
// Enhanced Subscription (NEW)
// ============================================

export interface CurrentSubscriptionDetails {
  publicId: string;
  userId: number;
  packageId: number;
  startAt: string;
  endAt: string;
  status: 'trialing' | 'active' | 'expired' | 'canceled';

  // Trial info
  isTrialSubscription: boolean;
  trialEndsAt: string | null;
  willDowngradeTo: number | null;

  package: EnhancedPackage;
}

// ============================================
// API Error Responses (NEW)
// ============================================

export interface QuotaExceededError {
  error?: 'Quota exceeded' | 'QUOTA_EXCEEDED';
  errorCode?: 'QUOTA_EXCEEDED';
  message: string;
  remainingTokens: number;
  quotaLimit: number;
  upgradeUrl: string;
}

export interface RateLimitError {
  error?: 'Rate limit exceeded' | 'RATE_LIMIT_EXCEEDED';
  errorCode?: 'RATE_LIMIT_EXCEEDED';
  message: string;
  retryAfter: number; // seconds
}

export interface AnonymousLimitError {
  error?:
    | 'ANONYMOUS_LIMIT_EXCEEDED'
    | 'Anonymous session limit exceeded'
    | 'Anonymous message limit exceeded';
  errorCode?: 'ANONYMOUS_LIMIT_EXCEEDED';
  message: string;
  limitType?: string;
  limit?: number;
  used?: number;
  resetAt?: string;
  sessionsUsed?: number;
  maxSessions?: number;
  upgradeUrl: string;
}
