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
  packageRemainingTokens?: number;
  advanceTokens?: number;
  totalRemainingTokens?: number;
  packageTokensUsed?: number;
  monthStartDate?: string;
  walletSourceSummary?: WalletSourceSummary;
}

export interface WalletSourceSummary {
  purchased: number;
  adminGranted: number;
  carryOver: number;
  refundAdjustment: number;
  debited: number;
  otherCredits: number;
}

export type TokenUsagePeriod = 'day' | 'month' | 'year';

export interface TokenUsagePoint {
  period: string;
  label: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
}

export interface TokenUsageSeries {
  period: TokenUsagePeriod;
  points: TokenUsagePoint[];
  totalTokens: number;
  requestCount: number;
}

export type ThirdPartyUsageGroupBy =
  | 'agent'
  | 'external_tenant'
  | 'day'
  | 'api_key'
  | 'capability'
  | 'tool';

export interface ThirdPartyUsageRow {
  client_id: string | null;
  external_tenant_type: string | null;
  external_tenant_id: string | null;
  agent_public_id: string | null;
  api_key_id: number | null;
  capability: string | null;
  day: string | null;
  tool_id?: string | null;
  messages: number;
  total_tokens: number;
  cost_credits: number;
  cost_usd?: number;
  tool_calls: number;
  successful_tool_calls?: number;
  failed_tool_calls?: number;
  avg_execution_ms?: number | null;
}

export interface ThirdPartyUsageResponse {
  data: ThirdPartyUsageRow[];
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
  fullName?: string;
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
  status?: 'draft' | 'published' | 'archived' | 'disabled' | string;
  version?: number;
  publishedVersion?: number | null;
  publishedAt?: Date | string | null;
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

export interface UpdateCharacteristicInput {
  code?: string;
  name?: string;
  description?: string | null;
  layer?: CharacteristicLayer;
  prompt?: string;
  sortOrder?: number;
  status?: 'published' | 'draft' | 'archived';
}

// ============================================
// Knowledge
// ============================================

export type KnowledgeScope = 'system' | 'user' | 'project' | 'all';
export type KnowledgeSourceType = 'text' | 'file' | 'url';
export type KnowledgeSyncStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'partial'
  | 'failed'
  | string;

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
// User Memories
// ============================================

export type UserMemoryScopeType = 'USER' | 'AGENT' | 'PROJECT';
export type UserMemoryValueType = 'text' | 'json' | 'boolean' | 'number';
export type UserMemorySource = 'explicit' | 'inferred' | 'system' | 'imported';
export type UserMemoryStatus = 'ACTIVE' | 'SUPERSEDED' | 'DELETED';

export interface UserMemory {
  publicId: string;
  scopeType: UserMemoryScopeType;
  scopeId: number;
  category: string;
  key: string;
  value: string;
  originalText?: string | null;
  valueType: UserMemoryValueType | string;
  confidence: number;
  importance: number;
  source: UserMemorySource | string;
  status: UserMemoryStatus | string;
  lastUsedAt?: Date | string | null;
  lastReinforcedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  useCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateUserMemoryInput {
  scopeType?: UserMemoryScopeType;
  scopeId?: number;
  category: string;
  key: string;
  value: string;
  originalText?: string;
  valueType?: UserMemoryValueType;
  confidence?: number;
  importance?: number;
  source?: UserMemorySource;
  expiresAt?: string | null;
}

export type UpdateUserMemoryInput = Partial<CreateUserMemoryInput>;

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
  flagUrl?: string; // Uploaded flag image URL from admin language settings
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

export interface ApiKeyApiScopeInput {
  scope: string;
  resourceType?: string;
  resourceId?: number;
  resourcePublicId?: string;
}

export interface ApiKeyApiScopeResponse {
  scope: string;
  name: string;
  capabilityCode: string;
  resourceType?: string | null;
  resourceId?: number | null;
  resourcePublicId?: string | null;
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
  prefix?: string | null;
  environment?: string | null;
  status: 'ACTIVE' | 'REVOKED';
  metadata?: {
    appName?: string;
    environment?: string;
    description?: string;
  };
  scopes?: ApiKeyApiScopeResponse[];
  capabilities: ApiKeyScopeResponse[];
  createdAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  lastUsed?: string | null;
  rateLimitPerMinute?: number | null;
  rateLimitPerDay?: number | null;
}

export interface CreateApiKeyInput {
  capabilities?: ApiKeyScopeInput[];
  scopes?: ApiKeyApiScopeInput[];
  metadata?: {
    appName?: string;
    environment?: string;
    description?: string;
  };
  expiresAt?: string;
  rateLimit?: {
    requestsPerMinute?: number;
    requestsPerDay?: number;
  };
}

export interface CreateApiKeyResponse extends ApiKey {
  /** Raw secret — shown ONLY ONCE at creation time */
  apiKey: string;
}

export interface IntegrationClient {
  public_id: string;
  name: string;
  environment: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  binding_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmbedWidget {
  public_id: string;
  name: string;
  key_prefix: string | null;
  environment: string;
  status: string;
  agent: {
    public_id: string;
    name: string;
    status: string | null;
    is_active: boolean | null;
    avatar_url?: string | null;
  } | null;
  allowed_origins: string[];
  theme: {
    position: string;
    primary_color: string;
    accent_color: string;
    border_radius: string;
    size: string;
  };
  behavior: {
    greeting: string | null;
    placeholder: string;
    auto_open: boolean;
    delay_seconds: number;
    sound_enabled: boolean;
    show_branding: boolean;
  };
  limits: {
    max_messages_per_session: number;
    max_sessions_per_day: number;
  };
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreateEmbedWidgetInput {
  name?: string;
  agent_public_id: string;
  allowed_origins: string[];
  widget_position?: string;
  primary_color?: string;
  accent_color?: string;
  custom_welcome_message?: string;
  custom_placeholder?: string;
  auto_open?: boolean;
  sound_enabled?: boolean;
  max_messages_per_session?: number;
  max_sessions_per_day?: number;
}

export interface CreateEmbedWidgetResponse {
  widget: EmbedWidget;
  widget_key: string;
  embed_snippet: string;
}

// ============================================
// Subscription & Billing
// ============================================

export interface PackageMetadata {
  color: string;
  icon: string; // Lucide icon name (e.g., "Zap", "Crown", "Shield")
}

export interface Package {
  publicId: string;
  code: string;
  name: string;
  price: number;
  duration: number; // duration in days
  tokensPerMonth: number;
  maxAgents: number;
  metadata?: string; // JSON string containing PackageMetadata
  isActive: boolean;
  createdAt?: string;
}

export interface CurrentSubscription {
  publicId: string;
  startAt: string;
  endAt: string;
  status: 'active' | 'trialing' | 'expired' | 'canceled';
  package?: {
    publicId: string;
    code: string;
    name: string;
    price: number;
    duration: number;
    tokensPerMonth: number;
    maxAgents: number;
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

export interface TokenPack {
  publicId: string;
  code: string;
  name: string;
  tokenAmount: number;
  price: number;
  currency: string;
  prices?: TokenPackPrice[];
  isActive: boolean;
}

export interface TokenPackPrice {
  publicId: string;
  currency: string;
  amountMinor: string;
  isActive: boolean;
}

export interface TokenPackPurchaseResult {
  publicId: string;
  tokenPackPublicId: string;
  tokenAmount: number;
  amount: number;
  currency: string;
  status: string;
  advanceTokens: number;
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
  messageCount?: number;
  tokenCount?: number;
  entrypoint?: string | null;
  sourceType?: 'web' | 'channel' | 'api_key' | 'embed' | 'webhook' | 'other' | string;
  sourceProvider?: 'appaihelp' | 'telegram' | 'discord' | 'api_key' | 'embed_widget' | string;
  sourcePublicId?: string | null;
  sourceDisplayName?: string | null;
  externalTenantType?: string | null;
  externalTenantId?: string | null;
  externalUserId?: string | null;
  externalSessionId?: string | null;
  channelConversationPublicId?: string | null;
  channelChatType?: string | null;
  channelChatTitle?: string | null;
  channelChatUsername?: string | null;
  limitWarning?: {
    level: 'near_limit' | 'limit_reached' | string;
    message: string;
  } | null;
}

export interface ChannelIntegration {
  public_id: string;
  provider: 'telegram' | 'discord' | string;
  name: string;
  status: 'active' | 'disabled' | 'disabled_by_package' | 'revoked' | 'error' | string;
  bot_username?: string | null;
  bot_token_prefix?: string | null;
  webhook_url?: string | null;
  webhook_status?: string;
  last_error?: string | null;
  settings?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  agent_public_id?: string | null;
  agent_name?: string | null;
  conversation_count?: number;
  created_at: string;
  updated_at: string;
  disabled_at?: string | null;
  last_webhook_at?: string | null;
}

export type EmailProvider = 'gmail' | 'outlook';

export interface EmailAgentBinding {
  public_id: string;
  agent_public_id?: string | null;
  agent_name?: string | null;
  agent_status?: string | null;
  agent_active?: boolean;
  access_level: 'read' | 'summarize' | 'draft_action' | 'execute_action' | string;
  summary_mode: 'off' | 'on_demand' | 'proactive_digest' | 'immediate' | string;
  digest_schedule?: string | null;
  is_default_handler: boolean;
  status: 'active' | 'disabled' | string;
  filters?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAccount {
  public_id: string;
  provider: EmailProvider | string;
  email_address: string;
  display_name?: string | null;
  status: 'active' | 'disabled' | 'disabled_by_package' | 'revoked' | 'error' | string;
  sync_mode?: string | null;
  source_public_id?: string | null;
  source_status?: string | null;
  sync_cursor?: string | null;
  history_id?: string | null;
  watch_expiration?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  settings?: Record<string, unknown> | null;
  retention?: {
    raw_days?: number;
    content_days?: number;
    vector_days?: number;
  };
  reconciliation?: {
    stale_after_minutes?: number;
  };
  bindings?: EmailAgentBinding[];
  created_at: string;
  updated_at: string;
}

export interface EmailBlacklistRule {
  public_id: string;
  email_account_id?: number | null;
  pattern_type: 'exact_sender' | 'domain' | 'regex' | string;
  pattern_value: string;
  normalized_value: string;
  action: 'skip_only' | 'auto_delete' | string;
  enabled: boolean;
  last_matched_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  public_id: string;
  provider_message_id: string;
  provider_thread_id?: string | null;
  from_address: string;
  from_domain: string;
  subject?: string | null;
  snippet?: string | null;
  status: string;
  received_at?: string | null;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
}

export interface EmailSummary {
  public_id: string;
  summary_type: string;
  trigger_type: string;
  status: string;
  title?: string | null;
  question?: string | null;
  summary?: string | null;
  item_count: number;
  model_used?: string | null;
  generated_at?: string | null;
  created_at: string;
}

export interface EmailDraftApproval {
  public_id: string;
  action_type: string;
  status: string;
  title?: string | null;
  draft_text?: string | null;
  risk_level: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  executed_at?: string | null;
  error_message?: string | null;
  message?: {
    public_id?: string;
    from_address?: string;
    subject?: string | null;
    received_at?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
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
  tokensPerMonth: number;
  maxAgents: number;

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
