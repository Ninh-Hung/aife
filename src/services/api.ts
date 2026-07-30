/**
 * API Service - HTTP Client Utilities
 * Handles all backend API communications
 */

import type { AxiosError } from 'axios';
import axiosInstance from '../lib/axios';
import { SUPPORTED_LANGUAGES, type Language, type User } from '../types';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface TranslateTextInput {
  text: string;
  sourceLang?: string;
  targetLang: string[];
  agentPublicId?: string;
}

export interface TranslateTextResponse {
  source: {
    text: string;
    lang: string;
    detected: boolean;
  };
  translations: Array<{
    lang: string;
    text: string;
    status?: string;
  }>;
  usage: {
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costInCredits?: number;
    cacheHit: boolean;
  };
  requestId: string;
  capabilityCode: string;
  entrypoint: string;
  quota: {
    remaining: number;
    limit?: number;
    resetAt?: string;
  };
}

interface DatabaseLanguage {
  key: string;
  name: string;
  active?: boolean;
  flag?: string;
  flagUrl?: string;
}

export type FeedbackType = 'FEEDBACK' | 'BUG_REPORT' | 'ABUSE_REPORT' | 'OTHER';
export type FeedbackTargetType = 'APP' | 'CHAT_SESSION' | 'CHAT_MESSAGE' | 'SHARED_CONVERSATION';

export interface CreateFeedbackInput {
  type: FeedbackType;
  title?: string;
  description: string;
  contactEmail?: string;
  evidenceImages?: File[];
  targetType?: FeedbackTargetType;
  conversationId?: string;
  messageId?: string;
  agentId?: string;
  reportedMessageSnapshot?: string;
  previousUserMessageSnapshot?: string;
  sourceContext?: string;
  currentPageUrl?: string;
  browserInfo?: string;
}

export interface FeedbackAttachment {
  filePublicId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  url: string;
}

export interface FeedbackMessage {
  id: number;
  senderType: 'USER' | 'ADMIN' | 'SYSTEM' | 'AGENT';
  senderId?: number | null;
  content: string;
  isAiGenerated: boolean;
  createdAt: string;
  attachments: FeedbackAttachment[];
}

export interface FeedbackTicket {
  publicId: string;
  title?: string | null;
  type: FeedbackType | string;
  priority?: string | null;
  status: string;
  source?: string | null;
  meta: Record<string, unknown>;
  aiSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  messages: FeedbackMessage[];
}

export interface UpdateMyProfileInput {
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface ChangeMyPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface MyProfileResponse {
  user: User & {
    avatarUrl?: string | null;
  };
}

export const updateMyProfile = async (
  input: UpdateMyProfileInput
): Promise<ApiResponse<MyProfileResponse>> => {
  try {
    const response = await axiosInstance.patch('/auth/me', input);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Update profile error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update profile',
      message: axiosError.response?.data?.message,
    };
  }
};

export const uploadMyAvatar = async (file: File): Promise<ApiResponse<{ url: string }>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post('/auth/me/avatar', formData);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Avatar uploaded successfully',
    };
  } catch (error) {
    console.error('Upload profile avatar error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to upload avatar',
    };
  }
};

export const changeMyPassword = async (input: ChangeMyPasswordInput): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.patch('/auth/me/password', input);

    return {
      success: true,
      message: response.data.message || 'Password changed successfully',
    };
  } catch (error) {
    console.error('Change password error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to change password',
      message: axiosError.response?.data?.message,
    };
  }
};

export const requestPasswordReset = async (input: ForgotPasswordInput): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post('/auth/forgot-password', input);

    return {
      success: true,
      message: response.data.message || 'Password reset link sent',
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to request password reset',
      message: axiosError.response?.data?.message,
    };
  }
};

export const resetPassword = async (input: ResetPasswordInput): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post('/auth/reset-password', input);

    return {
      success: true,
      message: response.data.message || 'Password reset successfully',
    };
  } catch (error) {
    console.error('Reset password error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to reset password',
      message: axiosError.response?.data?.message,
    };
  }
};

export const translateText = async (
  input: TranslateTextInput
): Promise<ApiResponse<TranslateTextResponse>> => {
  try {
    const response = await axiosInstance.post('/v1/translate', input);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Translate text error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Translation failed',
      message: axiosError.response?.data?.message,
    };
  }
};

export const getSupportedLanguages = async (): Promise<ApiResponse<Language[]>> => {
  try {
    const response =
      await axiosInstance.get<ApiResponse<DatabaseLanguage[]>>('/v1/common/languages');
    const databaseLanguages = (response.data.data || [])
      .filter((language) => language.active !== false)
      .map((language) => ({
        code: language.key,
        name: language.name,
        nativeName: language.name,
        flagUrl: language.flagUrl || language.flag,
      }));

    return {
      success: true,
      data: databaseLanguages.length > 0 ? databaseLanguages : SUPPORTED_LANGUAGES,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Get supported languages error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: true,
      data: SUPPORTED_LANGUAGES,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load supported languages from database. Using local fallback.',
      message: axiosError.response?.data?.message,
    };
  }
};

export const createFeedback = async (input: CreateFeedbackInput): Promise<ApiResponse> => {
  try {
    const formData = new FormData();
    formData.append('type', input.type);
    formData.append('description', input.description);

    const fields: Array<keyof CreateFeedbackInput> = [
      'title',
      'contactEmail',
      'targetType',
      'conversationId',
      'messageId',
      'agentId',
      'reportedMessageSnapshot',
      'previousUserMessageSnapshot',
      'sourceContext',
      'currentPageUrl',
      'browserInfo',
    ];

    fields.forEach((field) => {
      const value = input[field];
      if (typeof value === 'string' && value.trim()) {
        formData.append(field, value);
      }
    });

    input.evidenceImages?.forEach((file) => formData.append('evidenceImages', file));

    const response = await axiosInstance.post('/v1/feedback', formData);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Create feedback error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to submit feedback',
    };
  }
};

export const listMyFeedback = async (): Promise<ApiResponse<FeedbackTicket[]>> => {
  try {
    const response = await axiosInstance.get('/v1/feedback/my');

    return {
      success: true,
      data: response.data.data || [],
      message: response.data.message,
    };
  } catch (error) {
    console.error('List feedback error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to load feedback',
    };
  }
};

export const getMyFeedback = async (feedbackId: string): Promise<ApiResponse<FeedbackTicket>> => {
  try {
    const response = await axiosInstance.get(`/v1/feedback/my/${feedbackId}`);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Get feedback error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to load feedback details',
    };
  }
};

export const replyToMyFeedback = async (
  feedbackId: string,
  content: string
): Promise<ApiResponse<FeedbackTicket>> => {
  try {
    const response = await axiosInstance.post(`/v1/feedback/my/${feedbackId}/replies`, { content });

    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Reply feedback error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to send reply',
    };
  }
};

export const getFeedbackEvidenceBlob = async (url: string): Promise<Blob> => {
  const response = await axiosInstance.get(url, { responseType: 'blob' });
  return response.data;
};

// ============================================
// Email Verification API
// ============================================

/**
 * Verifies user email using the token from email link
 * @param token - One-time verification token
 * @returns Promise with verification result
 */
export const verifyEmail = async (token: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.get('/auth/verify-email', {
      params: { token },
    });

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Email verified successfully',
    };
  } catch (error) {
    console.error('Email verification error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Network error. Please check your connection and try again.',
      message: axiosError.response?.data?.message,
    };
  }
};

// ============================================
// API Key Management
// ============================================

import type {
  ApiKey,
  ApiScopeCatalogItem,
  ChannelIntegration,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  CreateEmbedWidgetInput,
  CreateEmbedWidgetResponse,
  CreateIntegrationClientInput,
  EmailAccount,
  EmailAgentBinding,
  EmailBlacklistRule,
  EmailDraftApproval,
  EmailMessage,
  EmailProvider,
  EmailSummary,
  EmbedWidget,
  ExternalAgentBinding,
  IntegrationClient,
  ProvisionIntegrationClientAgentInput,
  ProvisionIntegrationClientAgentResponse,
  UpdateIntegrationClientBindingInput,
  UpsertIntegrationClientBindingInput,
} from '../types';

/**
 * Fetches all API keys for the current user.
 * SECURITY: Raw API keys are NEVER returned by this endpoint.
 * Each key includes its capability scopes.
 */
export const listApiKeys = async (): Promise<ApiResponse<ApiKey[]>> => {
  try {
    const response = await axiosInstance.get('/v1/api-keys');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List API keys error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load API keys',
    };
  }
};

export const listApiScopeCatalog = async (): Promise<ApiResponse<ApiScopeCatalogItem[]>> => {
  try {
    const response = await axiosInstance.get('/v1/api-scopes/catalog');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List API scope catalog error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load API scope catalog',
    };
  }
};

/**
 * Creates a new API key with the selected capabilities.
 * SECURITY: The raw API key is returned ONLY ONCE in this response.
 * The client MUST display it immediately and MUST NOT persist it.
 * @param input - capabilities (required, min 1) + optional metadata
 */
export const createApiKey = async (
  input: CreateApiKeyInput
): Promise<ApiResponse<CreateApiKeyResponse>> => {
  try {
    const response = await axiosInstance.post('/v1/api-keys', input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'API key created successfully',
    };
  } catch (error) {
    console.error('Create API key error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create API key',
    };
  }
};

/**
 * Revokes an API key (irreversible).
 * @param publicId - The public ID of the API key to revoke
 */
export const revokeApiKey = async (publicId: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.delete(`/v1/api-keys/${publicId}`);

    return {
      success: true,
      data: response.data.data,
      message: 'API key revoked successfully',
    };
  } catch (error) {
    console.error('Revoke API key error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to revoke API key',
    };
  }
};

export const rotateApiKey = async (
  publicId: string
): Promise<ApiResponse<CreateApiKeyResponse>> => {
  try {
    const response = await axiosInstance.post(`/v1/api-keys/${publicId}/rotate`);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'API key rotated successfully',
    };
  } catch (error) {
    console.error('Rotate API key error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to rotate API key',
    };
  }
};

export const listIntegrationClients = async (): Promise<ApiResponse<IntegrationClient[]>> => {
  try {
    const response = await axiosInstance.get('/v1/integration-clients');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List integration clients error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load integration clients',
    };
  }
};

export const createIntegrationClient = async (
  input: CreateIntegrationClientInput
): Promise<ApiResponse<IntegrationClient>> => {
  try {
    const response = await axiosInstance.post('/v1/integration-clients', input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Integration client created successfully',
    };
  } catch (error) {
    console.error('Create integration client error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create integration client',
    };
  }
};

export const listIntegrationClientBindings = async (
  clientPublicId: string
): Promise<ApiResponse<ExternalAgentBinding[]>> => {
  try {
    const response = await axiosInstance.get(`/v1/integration-clients/${clientPublicId}/bindings`);

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List integration client bindings error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load integration client bindings',
    };
  }
};

export const upsertIntegrationClientBinding = async (
  clientPublicId: string,
  input: UpsertIntegrationClientBindingInput
): Promise<ApiResponse<ExternalAgentBinding>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/integration-clients/${clientPublicId}/bindings`,
      input
    );

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Integration client binding saved successfully',
    };
  } catch (error) {
    console.error('Save integration client binding error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to save integration client binding',
    };
  }
};

export const provisionIntegrationClientAgent = async (
  clientPublicId: string,
  input: ProvisionIntegrationClientAgentInput
): Promise<ApiResponse<ProvisionIntegrationClientAgentResponse>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/integration-clients/${clientPublicId}/provision-agent`,
      input
    );

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Tenant agent provisioned successfully',
    };
  } catch (error) {
    console.error('Provision integration client agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to provision tenant agent',
    };
  }
};

export const updateIntegrationClientBinding = async (
  clientPublicId: string,
  bindingPublicId: string,
  input: UpdateIntegrationClientBindingInput
): Promise<ApiResponse<ExternalAgentBinding>> => {
  try {
    const response = await axiosInstance.patch(
      `/v1/integration-clients/${clientPublicId}/bindings/${bindingPublicId}`,
      input
    );

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Integration client binding updated successfully',
    };
  } catch (error) {
    console.error('Update integration client binding error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update integration client binding',
    };
  }
};

export const listEmbedWidgets = async (): Promise<ApiResponse<EmbedWidget[]>> => {
  try {
    const response = await axiosInstance.get('/v1/embed-widgets');
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List embed widgets error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load embed widgets',
    };
  }
};

export const createEmbedWidget = async (
  input: CreateEmbedWidgetInput
): Promise<ApiResponse<CreateEmbedWidgetResponse>> => {
  try {
    const response = await axiosInstance.post('/v1/embed-widgets', input);
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Create embed widget error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create embed widget',
    };
  }
};

export const updateEmbedWidget = async (
  publicId: string,
  input: Partial<CreateEmbedWidgetInput> & { status?: string }
): Promise<ApiResponse<EmbedWidget>> => {
  try {
    const response = await axiosInstance.patch(`/v1/embed-widgets/${publicId}`, input);
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Update embed widget error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update embed widget',
    };
  }
};

export const rotateEmbedWidgetKey = async (
  publicId: string
): Promise<ApiResponse<CreateEmbedWidgetResponse>> => {
  try {
    const response = await axiosInstance.post(`/v1/embed-widgets/${publicId}/rotate-key`);
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Rotate embed widget key error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to rotate embed widget key',
    };
  }
};

export const listTelegramIntegrations = async (): Promise<ApiResponse<ChannelIntegration[]>> => {
  try {
    const response = await axiosInstance.get('/v1/channel-integrations/telegram');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List Telegram integrations error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load Telegram integrations',
    };
  }
};

export const createTelegramIntegration = async (input: {
  agent_public_id: string;
  bot_token: string;
  name?: string;
  settings?: Record<string, unknown>;
  register_webhook?: boolean;
}): Promise<ApiResponse<ChannelIntegration>> => {
  try {
    const response = await axiosInstance.post('/v1/channel-integrations/telegram', input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Telegram integration created successfully',
    };
  } catch (error) {
    console.error('Create Telegram integration error:', error);
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
      errorCode?: string;
    }>;

    return {
      success: false,
      errorCode: axiosError.response?.data?.errorCode,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create Telegram integration',
    };
  }
};

export const updateTelegramIntegration = async (
  integrationPublicId: string,
  input: {
    name?: string;
    status?: string;
    agent_public_id?: string;
    settings?: Record<string, unknown>;
  }
): Promise<ApiResponse<ChannelIntegration>> => {
  try {
    const response = await axiosInstance.patch(
      `/v1/channel-integrations/telegram/${integrationPublicId}`,
      input
    );

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Telegram integration updated successfully',
    };
  } catch (error) {
    console.error('Update Telegram integration error:', error);
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
      errorCode?: string;
    }>;

    return {
      success: false,
      errorCode: axiosError.response?.data?.errorCode,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update Telegram integration',
    };
  }
};

export const disconnectTelegramIntegration = async (
  integrationPublicId: string
): Promise<ApiResponse<ChannelIntegration>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/channel-integrations/telegram/${integrationPublicId}/disconnect`
    );

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Telegram integration disconnected successfully',
    };
  } catch (error) {
    console.error('Disconnect Telegram integration error:', error);
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
      errorCode?: string;
    }>;

    return {
      success: false,
      errorCode: axiosError.response?.data?.errorCode,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to disconnect Telegram integration',
    };
  }
};

const apiError = (error: unknown, fallback: string): ApiResponse => {
  const axiosError = error as AxiosError<{ message?: string; error?: string; errorCode?: string }>;
  return {
    success: false,
    errorCode: axiosError.response?.data?.errorCode,
    error: axiosError.response?.data?.error || axiosError.response?.data?.message || fallback,
  };
};

export const listEmailAccounts = async (): Promise<ApiResponse<EmailAccount[]>> => {
  try {
    const response = await axiosInstance.get('/v1/email-integrations/accounts');
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List email accounts error:', error);
    return apiError(error, 'Failed to load email accounts') as ApiResponse<EmailAccount[]>;
  }
};

export const startEmailOAuth = async (input: {
  provider: EmailProvider;
  agent_public_id?: string;
  redirect_after?: string;
}): Promise<ApiResponse<{ authorization_url: string; provider: EmailProvider }>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/${input.provider}/oauth/start`,
      {
        agent_public_id: input.agent_public_id,
        redirect_after: input.redirect_after,
      }
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Start email OAuth error:', error);
    return apiError(error, 'Failed to start email connection') as ApiResponse<{
      authorization_url: string;
      provider: EmailProvider;
    }>;
  }
};

export const updateEmailAccount = async (
  accountPublicId: string,
  input: {
    status?: string;
    raw_retention_days?: number;
    content_retention_days?: number;
    vector_retention_days?: number;
    blacklist_default_action?: string;
  }
): Promise<ApiResponse<EmailAccount>> => {
  try {
    const response = await axiosInstance.patch(
      `/v1/email-integrations/accounts/${accountPublicId}`,
      input
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Update email account error:', error);
    return apiError(error, 'Failed to update email account') as ApiResponse<EmailAccount>;
  }
};

export const disconnectEmailAccount = async (
  accountPublicId: string
): Promise<ApiResponse<EmailAccount>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/accounts/${accountPublicId}/disconnect`
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Disconnect email account error:', error);
    return apiError(error, 'Failed to disconnect email account') as ApiResponse<EmailAccount>;
  }
};

export const syncEmailAccountNow = async (
  accountPublicId: string
): Promise<
  ApiResponse<{ accepted: boolean; sync_queued: boolean; queued_count: number; trace_id?: string }>
> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/accounts/${accountPublicId}/sync-now`
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Sync email account error:', error);
    return apiError(error, 'Failed to sync email account') as ApiResponse<{
      accepted: boolean;
      sync_queued: boolean;
      queued_count: number;
      trace_id?: string;
    }>;
  }
};

export const upsertEmailAgentBinding = async (
  accountPublicId: string,
  input: {
    agent_public_id: string;
    access_level: string;
    summary_mode: string;
    is_default_handler?: boolean;
    digest_schedule?: string | null;
    filters_json?: Record<string, unknown>;
  }
): Promise<ApiResponse<EmailAgentBinding>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/accounts/${accountPublicId}/agent-bindings`,
      input
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Save email binding error:', error);
    return apiError(error, 'Failed to save email agent binding') as ApiResponse<EmailAgentBinding>;
  }
};

export const listEmailBlacklistRules = async (
  accountPublicId?: string
): Promise<ApiResponse<EmailBlacklistRule[]>> => {
  try {
    const response = await axiosInstance.get('/v1/email-integrations/blacklist-rules', {
      params: accountPublicId ? { account_public_id: accountPublicId } : undefined,
    });
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List email blacklist rules error:', error);
    return apiError(error, 'Failed to load blacklist rules') as ApiResponse<EmailBlacklistRule[]>;
  }
};

export const createEmailBlacklistRule = async (input: {
  account_public_id?: string;
  pattern_type: string;
  pattern_value: string;
  action: string;
  enabled?: boolean;
}): Promise<ApiResponse<EmailBlacklistRule>> => {
  try {
    const response = await axiosInstance.post('/v1/email-integrations/blacklist-rules', input);
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Create email blacklist rule error:', error);
    return apiError(error, 'Failed to create blacklist rule') as ApiResponse<EmailBlacklistRule>;
  }
};

export const updateEmailBlacklistRule = async (
  rulePublicId: string,
  input: { enabled?: boolean; action?: string; pattern_type?: string; pattern_value?: string }
): Promise<ApiResponse<EmailBlacklistRule>> => {
  try {
    const response = await axiosInstance.patch(
      `/v1/email-integrations/blacklist-rules/${rulePublicId}`,
      input
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Update email blacklist rule error:', error);
    return apiError(error, 'Failed to update blacklist rule') as ApiResponse<EmailBlacklistRule>;
  }
};

export const listEmailMessages = async (params?: {
  account_public_id?: string;
  status?: string;
}): Promise<ApiResponse<EmailMessage[]>> => {
  try {
    const response = await axiosInstance.get('/v1/email-integrations/messages', { params });
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List email messages error:', error);
    return apiError(error, 'Failed to load email messages') as ApiResponse<EmailMessage[]>;
  }
};

export const listEmailSummaries = async (params?: {
  account_public_id?: string;
  source_public_id?: string;
  summary_type?: string;
}): Promise<ApiResponse<EmailSummary[]>> => {
  try {
    const response = await axiosInstance.get('/v1/email-integrations/summaries', { params });
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List email summaries error:', error);
    return apiError(error, 'Failed to load email summaries') as ApiResponse<EmailSummary[]>;
  }
};

export const listEmailDigests = async (params?: {
  account_public_id?: string;
  source_public_id?: string;
}): Promise<ApiResponse<EmailSummary[]>> => {
  try {
    const response = await axiosInstance.get('/v1/email-integrations/digests', { params });
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List email digests error:', error);
    return apiError(error, 'Failed to load email digests') as ApiResponse<EmailSummary[]>;
  }
};

export const runEmailDigest = async (input?: {
  account_public_id?: string;
  agent_public_id?: string;
  window_hours?: number;
  instruction?: string;
}): Promise<ApiResponse<EmailSummary | EmailSummary[]>> => {
  try {
    const response = await axiosInstance.post('/v1/email-integrations/digests/run', input || {});
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Run email digest error:', error);
    return apiError(error, 'Failed to run email digest') as ApiResponse<
      EmailSummary | EmailSummary[]
    >;
  }
};

export const summarizeEmailMessage = async (
  messagePublicId: string,
  input?: { question?: string; agent_public_id?: string }
): Promise<ApiResponse<EmailSummary>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/messages/${messagePublicId}/summarize`,
      input || {}
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Summarize email message error:', error);
    return apiError(error, 'Failed to summarize email') as ApiResponse<EmailSummary>;
  }
};

export const draftEmailReply = async (
  messagePublicId: string,
  input?: { instruction?: string; agent_public_id?: string }
): Promise<ApiResponse<EmailDraftApproval>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/messages/${messagePublicId}/draft-reply`,
      input || {}
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Draft email reply error:', error);
    return apiError(error, 'Failed to draft email reply') as ApiResponse<EmailDraftApproval>;
  }
};

export const listEmailDrafts = async (
  status?: string
): Promise<ApiResponse<EmailDraftApproval[]>> => {
  try {
    const response = await axiosInstance.get('/v1/email-integrations/drafts', {
      params: status ? { status } : undefined,
    });
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('List email drafts error:', error);
    return apiError(error, 'Failed to load email drafts') as ApiResponse<EmailDraftApproval[]>;
  }
};

export const updateEmailDraft = async (
  draftPublicId: string,
  input: { title?: string; draft_text?: string }
): Promise<ApiResponse<EmailDraftApproval>> => {
  try {
    const response = await axiosInstance.patch(
      `/v1/email-integrations/drafts/${draftPublicId}`,
      input
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Update email draft error:', error);
    return apiError(error, 'Failed to update email draft') as ApiResponse<EmailDraftApproval>;
  }
};

export const approveEmailDraft = async (
  draftPublicId: string,
  input: { draft_reply?: string; send_now?: boolean },
  idempotencyKey = crypto.randomUUID()
): Promise<ApiResponse<EmailDraftApproval>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/drafts/${draftPublicId}/approve`,
      input,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Approve email draft error:', error);
    return apiError(error, 'Failed to approve email draft') as ApiResponse<EmailDraftApproval>;
  }
};

export const retrySendEmailDraft = async (
  draftPublicId: string,
  idempotencyKey = crypto.randomUUID()
): Promise<ApiResponse<EmailDraftApproval>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/drafts/${draftPublicId}/retry-send`,
      {},
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Retry email draft send error:', error);
    return apiError(error, 'Failed to retry email draft send') as ApiResponse<EmailDraftApproval>;
  }
};

export const rejectEmailDraft = async (
  draftPublicId: string
): Promise<ApiResponse<EmailDraftApproval>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/email-integrations/drafts/${draftPublicId}/reject`
    );
    return { success: true, data: response.data.data || response.data };
  } catch (error) {
    console.error('Reject email draft error:', error);
    return apiError(error, 'Failed to reject email draft') as ApiResponse<EmailDraftApproval>;
  }
};

// ============================================
// Subscription Management
// ============================================

import type {
  Package,
  CurrentSubscription,
  BillingHistoryItem,
  TokenPack,
  TokenPackPurchaseResult,
} from '../types';

type SubscriptionHistoryResponse = {
  subscriptions?: BackendSubscriptionHistoryItem[];
  total?: number;
  limit?: number;
  offset?: number;
};

type BackendSubscriptionHistoryItem = {
  publicId: string;
  startAt: string;
  endAt: string;
  status: 'active' | 'trialing' | 'expired' | 'canceled' | string;
  package?: {
    name?: string;
    price?: number;
  };
};

/**
 * Fetches all available subscription packages
 * @returns Promise with array of available packages
 */
export const getPackages = async (): Promise<ApiResponse<Package[]>> => {
  try {
    const response = await axiosInstance.get('/v1/common/packages');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Get packages error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load packages',
    };
  }
};

/**
 * Fetches the current user's active subscription
 * @returns Promise with current subscription details
 */
export const getCurrentSubscription = async (): Promise<
  ApiResponse<CurrentSubscription | null>
> => {
  try {
    const response = await axiosInstance.get('/v1/subscriptions/current');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Get current subscription error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to load current subscription',
    };
  }
};

/**
 * Fetches the billing history for the current user
 * @returns Promise with array of billing history items
 */
export const getBillingHistory = async (): Promise<ApiResponse<BillingHistoryItem[]>> => {
  try {
    const response = await axiosInstance.get('/v1/subscriptions/history');
    const payload = response.data.data || response.data;
    const subscriptions = Array.isArray(payload)
      ? payload
      : ((payload as SubscriptionHistoryResponse).subscriptions ?? []);

    return {
      success: true,
      data: subscriptions.map(mapSubscriptionToBillingHistoryItem),
    };
  } catch (error) {
    console.error('Get billing history error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load billing history',
    };
  }
};

const mapSubscriptionToBillingHistoryItem = (
  subscription: BackendSubscriptionHistoryItem | BillingHistoryItem
): BillingHistoryItem => {
  if ('packageName' in subscription) {
    return subscription;
  }

  return {
    publicId: subscription.publicId,
    packageName: subscription.package?.name || 'Unknown package',
    amount: subscription.package?.price || 0,
    status: subscription.status === 'trialing' ? 'PENDING' : 'PAID',
    paymentDate: subscription.startAt,
    createdAt: subscription.startAt,
  };
};

/**
 * Cancels the current subscription
 * @returns Promise with cancellation result
 */
export const cancelSubscription = async (): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post('/v1/subscriptions/cancel');

    return {
      success: true,
      data: response.data.data,
      message: 'Subscription cancelled successfully',
    };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to cancel subscription',
    };
  }
};

/**
 * Subscribe to a package (unified endpoint - handles create, upgrade, downgrade)
 * @param packagePublicId - The public ID of the package to subscribe to
 * @returns Promise with subscription result
 */
export const subscribe = async (packagePublicId: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.post('/v1/subscriptions/subscribe', {
      packagePublicId,
    });

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Subscription updated successfully',
    };
  } catch (error) {
    console.error('Subscribe error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to process subscription',
      message: axiosError.response?.data?.message,
    };
  }
};

export const getTokenPacks = async (): Promise<ApiResponse<TokenPack[]>> => {
  try {
    const response = await axiosInstance.get('/v1/subscriptions/token-packs');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Get token packs error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load token packs',
    };
  }
};

export const purchaseTokenPack = async (
  tokenPackPublicId: string,
  currency?: string
): Promise<ApiResponse<TokenPackPurchaseResult>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/subscriptions/token-packs/${tokenPackPublicId}/purchase`,
      currency ? { currency } : undefined
    );

    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message || 'Token pack purchased successfully',
    };
  } catch (error) {
    console.error('Purchase token pack error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to purchase token pack',
      message: axiosError.response?.data?.message,
    };
  }
};

// Alias for backward compatibility (to be deprecated)
export const upgradeSubscription = subscribe;

// ============================================
// Capabilities API
// ============================================

import type { Capability } from '../types';

/**
 * Fetches all active capabilities available for API key and subscription flows
 * @returns Promise with array of capabilities
 */
export const listCapabilities = async (): Promise<ApiResponse<Capability[]>> => {
  try {
    const response = await axiosInstance.get('/v1/capabilities');

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List capabilities error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load capabilities',
    };
  }
};

// ============================================
// Characteristics API
// ============================================

import type {
  Characteristic,
  CharacteristicScope,
  CreateCharacteristicInput,
  UpdateCharacteristicInput,
} from '../types';

/**
 * Fetches characteristics filtered by scope and optional search
 * @param scope - Filter by scope (system, user, project, all)
 * @param search - Optional search keyword
 * @param projectId - Optional project ID for project-scoped characteristics
 * @returns Promise with array of characteristics
 */
export const listCharacteristics = async (
  scope: CharacteristicScope = 'all',
  search?: string,
  projectId?: number
): Promise<ApiResponse<Characteristic[]>> => {
  try {
    const params: Record<string, string | number> = { scope };
    if (search) params.search = search;
    if (projectId) params.projectId = projectId;

    const response = await axiosInstance.get('/v1/characteristics', { params });

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('List characteristics error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load characteristics',
    };
  }
};

/**
 * Creates a new user characteristic
 * @param input - Characteristic creation parameters
 * @returns Promise with the created characteristic
 */
export const createCharacteristic = async (
  input: CreateCharacteristicInput
): Promise<ApiResponse<Characteristic>> => {
  try {
    const response = await axiosInstance.post('/v1/characteristics', input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Characteristic created successfully',
    };
  } catch (error) {
    console.error('Create characteristic error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create characteristic',
    };
  }
};

export const updateCharacteristic = async (
  publicId: string,
  input: UpdateCharacteristicInput
): Promise<ApiResponse<Characteristic>> => {
  try {
    const response = await axiosInstance.patch(`/v1/characteristics/${publicId}`, input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: 'Characteristic updated successfully',
    };
  } catch (error) {
    console.error('Update characteristic error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update characteristic',
    };
  }
};

export const deleteCharacteristic = async (publicId: string): Promise<ApiResponse<void>> => {
  try {
    const response = await axiosInstance.delete(`/v1/characteristics/${publicId}`);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Characteristic deleted successfully',
    };
  } catch (error) {
    console.error('Delete characteristic error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to delete characteristic',
    };
  }
};

// ============================================
// Knowledge API
// ============================================

import type {
  Knowledge,
  KnowledgeScope,
  KnowledgeSourceType,
  CreateKnowledgeInput,
} from '../types';

/**
 * Fetches knowledge filtered by scope and optional type/search
 * @param scope - Filter by scope (system, user, project, all)
 * @param type - Optional filter by source type
 * @param search - Optional search keyword
 * @param projectId - Optional project ID for project-scoped knowledge
 * @returns Promise with array of knowledge
 */
export const listKnowledge = async (
  scope: KnowledgeScope = 'all',
  type?: KnowledgeSourceType,
  search?: string,
  projectId?: number
): Promise<ApiResponse<Knowledge[]>> => {
  try {
    const params: Record<string, string | number> = { scope };
    if (type) params.type = type;
    if (search) params.search = search;
    if (projectId) params.projectId = projectId;

    const response = await axiosInstance.get('/v1/knowledges', { params });

    return {
      success: true,
      data: normalizeKnowledgeList(response.data.data || response.data),
    };
  } catch (error) {
    console.error('List knowledge error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load knowledge',
    };
  }
};

/**
 * Fetches safe details and sync status for a single knowledge source.
 */
export const getKnowledge = async (publicId: string): Promise<ApiResponse<Knowledge>> => {
  try {
    const response = await axiosInstance.get(`/v1/knowledges/${publicId}`);

    return {
      success: true,
      data: normalizeKnowledge(response.data.data || response.data),
      message: response.data.message,
    };
  } catch (error) {
    console.error('Get knowledge error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load knowledge',
      message: axiosError.response?.data?.message,
    };
  }
};

/**
 * Creates a new knowledge source
 * @param input - Knowledge creation parameters
 * @returns Promise with the created knowledge
 */
export const createKnowledge = async (
  input: CreateKnowledgeInput
): Promise<ApiResponse<Knowledge>> => {
  try {
    const formData = new FormData();
    formData.append('name', input.name);
    formData.append('sourceType', input.sourceType);

    if (input.description) {
      formData.append('description', input.description);
    }

    if (input.sourceType === 'text' && input.content) {
      formData.append('content', input.content);
    }

    if (input.sourceType === 'url' && input.sourceUrl) {
      formData.append('sourceUrl', input.sourceUrl);
    }

    if (input.projectId) {
      formData.append('projectId', String(input.projectId));
    }

    if (input.sourceType === 'file') {
      input.files?.forEach((file) => {
        formData.append('files', file);
      });
    }

    const response = await axiosInstance.post('/v1/knowledges', formData);

    return {
      success: true,
      data: normalizeKnowledge(response.data.data || response.data),
      message: 'Knowledge created successfully',
    };
  } catch (error) {
    console.error('Create knowledge error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create knowledge',
    };
  }
};

/**
 * Enqueues a manual resync for an existing knowledge source.
 */
export const resyncKnowledge = async (publicId: string): Promise<ApiResponse<Knowledge>> => {
  try {
    const response = await axiosInstance.post(`/v1/knowledges/${publicId}/resync`);

    return {
      success: true,
      data: normalizeKnowledge(response.data.data || response.data),
      message: 'Knowledge resync enqueued successfully',
    };
  } catch (error) {
    console.error('Resync knowledge error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to resync knowledge',
    };
  }
};

/**
 * Enqueues deletion for an existing knowledge source.
 */
export const deleteKnowledge = async (publicId: string): Promise<ApiResponse<Knowledge>> => {
  try {
    const response = await axiosInstance.delete(`/v1/knowledges/${publicId}`);

    return {
      success: true,
      data: normalizeKnowledge(response.data.data || response.data),
      message: 'Knowledge deletion enqueued successfully',
    };
  } catch (error) {
    console.error('Delete knowledge error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to delete knowledge',
    };
  }
};

const normalizeKnowledge = (knowledge: Knowledge): Knowledge => ({
  ...knowledge,
  sourceType: knowledge.sourceType || knowledge.source || 'text',
});

const normalizeKnowledgeList = (knowledges: Knowledge[]): Knowledge[] => {
  return knowledges.map(normalizeKnowledge);
};

// ============================================
// User Memory API
// ============================================

import type {
  CreateUserMemoryInput,
  UpdateUserMemoryInput,
  UserMemory,
  UserMemoryScopeType,
  UserMemoryStatus,
} from '../types';

export interface ListUserMemoriesParams {
  scopeType?: UserMemoryScopeType;
  status?: UserMemoryStatus;
  category?: string;
  search?: string;
}

export const listUserMemories = async (
  params: ListUserMemoriesParams = {}
): Promise<ApiResponse<UserMemory[]>> => {
  try {
    const response = await axiosInstance.get('/v1/memories', { params });

    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('List user memories error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to load memories',
    };
  }
};

export const createUserMemory = async (
  input: CreateUserMemoryInput
): Promise<ApiResponse<UserMemory>> => {
  try {
    const response = await axiosInstance.post('/v1/memories', input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Create user memory error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to create memory',
    };
  }
};

export const updateUserMemory = async (
  publicId: string,
  input: UpdateUserMemoryInput
): Promise<ApiResponse<UserMemory>> => {
  try {
    const response = await axiosInstance.patch(`/v1/memories/${publicId}`, input);

    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Update user memory error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to update memory',
    };
  }
};

export const deleteUserMemory = async (publicId: string): Promise<ApiResponse<UserMemory>> => {
  try {
    const response = await axiosInstance.delete(`/v1/memories/${publicId}`);

    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Delete user memory error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to delete memory',
    };
  }
};

// ============================================
// Chat & Messaging API
// ============================================

import type { ChatSession, ChatMessage, ChatShare, SharedConversation } from '../types';

type BackendChatSession = Omit<
  ChatSession,
  'id' | 'title' | 'lastMessageAt' | 'createdAt' | 'updatedAt'
> & {
  id: number | string;
  publicId?: string;
  title?: string | null;
  lastMessageAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

const serverBaseUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');

const buildServerUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path) || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }

  return serverBaseUrl ? `${serverBaseUrl}${path.startsWith('/') ? path : `/${path}`}` : path;
};

const normalizeChatSession = (session: BackendChatSession): ChatSession => {
  const publicId = session.publicId || String(session.id);
  const createdAt = new Date(session.createdAt || Date.now());
  const updatedAt = new Date(session.updatedAt || Date.now());

  return {
    ...session,
    id: publicId,
    publicId,
    internalId: typeof session.id === 'number' ? session.id : session.internalId,
    title: session.title || 'New Chat',
    agentId: session.agentId ?? session.agentPublicId ?? '',
    agentPublicId: session.agentPublicId || String(session.agentId ?? ''),
    agentName: session.agentName || 'AI Assistant',
    lastMessageAt: new Date(
      session.lastMessageAt || session.createdAt || session.updatedAt || Date.now()
    ),
    createdAt,
    updatedAt,
  };
};

const normalizeChatMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  attachments: (message.attachments || []).map((attachment) => ({
    ...attachment,
    fileUrl: buildServerUrl(`/v1/chat/attachments/${attachment.publicId}`),
  })),
});

const getClientShareUrl = (sharePath: string): string =>
  `${window.location.origin}${sharePath.startsWith('/') ? sharePath : `/${sharePath}`}`;

const normalizeChatShare = (share: ChatShare): ChatShare => ({
  ...share,
  shareUrl: getClientShareUrl(share.sharePath || `/share/${share.shareToken || share.publicId}`),
});

const normalizeSharedConversation = (
  share: SharedConversation,
  shareToken: string
): SharedConversation => ({
  ...share,
  messages: (share.messages || []).map((message) => ({
    ...message,
    role: message.role === 'user' ? 'user' : 'agent',
    attachments: (message.attachments || []).map((attachment) => ({
      ...attachment,
      fileUrl: buildServerUrl(
        `/v1/chat/shares/public/${shareToken}/attachments/${attachment.publicId}`
      ),
    })),
  })),
});

/**
 * Fetches all chat sessions for a specific agent
 * @param agentId - The ID of the agent
 * @returns Promise with array of chat sessions
 */
export const listChatSessions = async (
  agentId?: string,
  filters?: {
    source?: string;
    entrypoint?: string;
    source_provider?: string;
    client_id?: string;
    external_tenant_id?: string;
  }
): Promise<ApiResponse<ChatSession[]>> => {
  try {
    const response = await axiosInstance.get(`/v1/chat/sessions`, {
      params: {
        ...(agentId ? { agentId } : {}),
        ...(filters?.source ? { source: filters.source } : {}),
        ...(filters?.entrypoint ? { entrypoint: filters.entrypoint } : {}),
        ...(filters?.source_provider ? { source_provider: filters.source_provider } : {}),
        ...(filters?.client_id ? { client_id: filters.client_id } : {}),
        ...(filters?.external_tenant_id ? { external_tenant_id: filters.external_tenant_id } : {}),
      },
    });

    return {
      success: true,
      data: (response.data.data || response.data).map(normalizeChatSession),
    };
  } catch (error) {
    console.error('List chat sessions error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load chat sessions',
    };
  }
};

/**
 * Creates a new chat session
 * @param agentId - The ID of the agent
 * @param title - Optional custom title for the session
 * @returns Promise with the created chat session
 */
export const createChatSession = async (
  agentId?: string | null,
  title?: string
): Promise<ApiResponse<ChatSession>> => {
  try {
    const response = await axiosInstance.post('/v1/chat/sessions', {
      ...(agentId ? { agentId } : {}),
      title,
    });

    return {
      success: true,
      data: normalizeChatSession(response.data.data || response.data),
      message: 'Chat session created successfully',
    };
  } catch (error) {
    console.error('Create chat session error:', error);
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
      errorCode?: string;
    }>;

    return {
      success: false,
      errorCode: axiosError.response?.data?.errorCode,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to create chat session',
    };
  }
};

export const getChatSession = async (sessionId: string): Promise<ApiResponse<ChatSession>> => {
  try {
    const response = await axiosInstance.get(`/v1/chat/sessions/${sessionId}`);

    return {
      success: true,
      data: normalizeChatSession(response.data.data || response.data),
    };
  } catch (error) {
    console.error('Get chat session error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load chat session',
    };
  }
};

/**
 * Fetches all messages for a specific chat session
 * @param sessionId - The ID of the chat session
 * @returns Promise with array of chat messages
 */
export const listChatMessages = async (sessionId: string): Promise<ApiResponse<ChatMessage[]>> => {
  try {
    const response = await axiosInstance.get(`/v1/chat/sessions/${sessionId}/messages`);

    return {
      success: true,
      data: (response.data.data || response.data).map(normalizeChatMessage),
    };
  } catch (error) {
    console.error('List chat messages error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load chat messages',
    };
  }
};

export const isAuthenticatedChatAttachmentUrl = (url?: string | null): boolean => {
  if (!url) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.startsWith('/v1/chat/attachments/');
  } catch {
    return url.startsWith('/v1/chat/attachments/');
  }
};

export const getChatAttachmentBlob = async (url: string): Promise<Blob> => {
  const parsed = new URL(url, window.location.origin);
  const requestUrl = serverBaseUrl && parsed.origin === serverBaseUrl ? parsed.pathname : url;
  const response = await axiosInstance.get(requestUrl, { responseType: 'blob' });
  return response.data;
};

export const getGeneratedImageDownloadBlob = async (url: string): Promise<Blob> => {
  const response = await axiosInstance.post(
    '/v1/chat/generated-image/download',
    { url },
    { responseType: 'blob' }
  );
  return response.data;
};

export interface CancelChatResponseInput {
  content?: string;
  reasoning?: string | null;
}

export const cancelChatResponse = async (
  sessionId: string,
  partialResponse?: CancelChatResponseInput
): Promise<ApiResponse<{ cancelled: boolean }>> => {
  try {
    const response = await axiosInstance.post(
      `/v1/chat/sessions/${sessionId}/cancel`,
      partialResponse
    );

    return {
      success: true,
      data: response.data.data || response.data,
    };
  } catch (error) {
    console.error('Cancel chat response error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to cancel response',
    };
  }
};

/**
 * Updates a chat session (e.g. status, title)
 * @param sessionId - The public ID of the chat session
 * @param data - Fields to update (title, status)
 * @returns Promise with the updated chat session
 */
export const updateChatSession = async (
  sessionId: string,
  data: { title?: string; status?: 'ACTIVE' | 'ARCHIVED' | 'DELETED' }
): Promise<ApiResponse<ChatSession>> => {
  try {
    const response = await axiosInstance.patch(`/v1/chat/sessions/${sessionId}`, data);

    return {
      success: true,
      data: normalizeChatSession(response.data.data || response.data),
      message: 'Chat session updated successfully',
    };
  } catch (error) {
    console.error('Update chat session error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update chat session',
    };
  }
};

export const mergeAnonymousSession = async (
  sessionId: string
): Promise<ApiResponse<ChatSession>> => {
  try {
    const response = await axiosInstance.post(`/v1/chat/sessions/${sessionId}/merge-anonymous`);

    return {
      success: true,
      data: normalizeChatSession(response.data.data || response.data),
      message: response.data.message || 'Anonymous chat session merged successfully',
    };
  } catch (error) {
    console.error('Merge anonymous session error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Failed to merge anonymous chat session',
    };
  }
};

export const getChatShare = async (sessionId: string): Promise<ApiResponse<ChatShare | null>> => {
  try {
    const response = await axiosInstance.get(`/v1/chat/sessions/${sessionId}/share`);
    const data = response.data.data || null;

    return {
      success: true,
      data: data ? normalizeChatShare(data) : null,
    };
  } catch (error) {
    console.error('Get chat share error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load share',
    };
  }
};

export const createChatShare = async (sessionId: string): Promise<ApiResponse<ChatShare>> => {
  try {
    const response = await axiosInstance.post(`/v1/chat/sessions/${sessionId}/share`);

    return {
      success: true,
      data: normalizeChatShare(response.data.data || response.data),
      message: 'Share link created',
    };
  } catch (error) {
    console.error('Create chat share error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to create share',
    };
  }
};

export const refreshChatShare = async (shareId: string): Promise<ApiResponse<ChatShare>> => {
  try {
    const response = await axiosInstance.post(`/v1/chat/shares/${shareId}/refresh-snapshot`);

    return {
      success: true,
      data: normalizeChatShare(response.data.data || response.data),
      message: 'Shared snapshot updated',
    };
  } catch (error) {
    console.error('Refresh chat share error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update shared snapshot',
    };
  }
};

export const revokeChatShare = async (shareId: string): Promise<ApiResponse<ChatShare>> => {
  try {
    const response = await axiosInstance.delete(`/v1/chat/shares/${shareId}`);

    return {
      success: true,
      data: normalizeChatShare(response.data.data || response.data),
      message: 'Share link revoked',
    };
  } catch (error) {
    console.error('Revoke chat share error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to revoke share',
    };
  }
};

export const getPublicChatShare = async (
  shareToken: string
): Promise<ApiResponse<SharedConversation>> => {
  try {
    const response = await axiosInstance.get(`/v1/chat/shares/public/${shareToken}`);

    return {
      success: true,
      data: normalizeSharedConversation(response.data.data || response.data, shareToken),
    };
  } catch (error) {
    console.error('Get public chat share error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Shared conversation is no longer available',
    };
  }
};

export const forkPublicChatShare = async (
  shareToken: string,
  agentId?: string
): Promise<ApiResponse<ChatSession>> => {
  try {
    const response = await axiosInstance.post(`/v1/chat/shares/public/${shareToken}/fork`, {
      ...(agentId ? { agentId } : {}),
    });

    return {
      success: true,
      data: normalizeChatSession(response.data.data || response.data),
      message: 'Conversation copied',
    };
  } catch (error) {
    console.error('Fork public chat share error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to continue shared conversation',
    };
  }
};

// ============================================
// Agents API
// ============================================

import type { Agent, AgentWizardAnswers, AgentWizardDraft, CreateAgentInput } from '../types';

const normalizeAgent = (item: Record<string, unknown>): Agent =>
  ({
    ...item,
    id: (item.publicId || item.id) as string,
    publicId: (item.publicId || item.id) as string,
    ownerType: String(item.ownerType || 'USER').toUpperCase() as Agent['ownerType'],
    characteristicIds: (item.characteristicIds as string[] | undefined) || [],
    knowledgeIds: (item.knowledgeIds as string[] | undefined) || [],
  }) as Agent;

/**
 * Fetches all agents for the current user
 * @returns Promise with array of agents
 */
export const listAgents = async (): Promise<ApiResponse<Agent[]>> => {
  try {
    const response = await axiosInstance.get('/v1/agents');
    const raw: Array<Record<string, unknown>> = response.data.data || response.data;

    const agents: Agent[] = raw.map(normalizeAgent);

    return {
      success: true,
      data: agents,
    };
  } catch (error) {
    console.error('List agents error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load agents',
    };
  }
};

export const createAgentWizardDraft = async (input: {
  answers: AgentWizardAnswers;
  locale?: string;
}): Promise<ApiResponse<AgentWizardDraft>> => {
  try {
    const response = await axiosInstance.post('/v1/agents/wizard/draft', input);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Agent draft generated successfully',
    };
  } catch (error) {
    console.error('Create agent wizard draft error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to generate agent draft',
      message: axiosError.response?.data?.message,
    };
  }
};

/**
 * Uploads an agent avatar image to Cloudflare R2 via the backend
 * @param file - Image file (jpg, png, svg, gif, webp) max 5 MB
 * @returns Promise with the public URL of the stored image
 */
export const uploadAgentAvatar = async (file: File): Promise<ApiResponse<{ url: string }>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post('/v1/agents/avatar', formData);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Avatar uploaded successfully',
    };
  } catch (error) {
    console.error('Upload agent avatar error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to upload avatar',
    };
  }
};

export const updateAgentAvatar = async (
  publicId: string,
  avatarUrl: string | null
): Promise<ApiResponse<{ publicId: string; avatarUrl: string | null; updatedAt: string }>> => {
  try {
    const response = await axiosInstance.patch(`/v1/agents/${publicId}/avatar`, { avatarUrl });

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Agent avatar updated successfully',
    };
  } catch (error) {
    console.error('Update agent avatar error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to update agent avatar',
    };
  }
};

export interface DefaultAvatar {
  publicId: string;
  name: string;
  type: 'image' | 'video';
  previewUrl: string | null;
  category: string | null;
}

/**
 * Fetches all active default avatars from the admin catalog for the avatar picker
 */
export const listDefaultAvatars = async (): Promise<ApiResponse<DefaultAvatar[]>> => {
  try {
    const response = await axiosInstance.get('/v1/agents/default-avatars');

    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('List default avatars error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load default avatars',
    };
  }
};

/**
 * Fetches a single agent with full association IDs (for edit mode)
 * @param publicId - The agent's public ID
 * @returns Promise with the full agent including characteristicIds and knowledgeIds
 */
export const getAgent = async (publicId: string): Promise<ApiResponse<Agent>> => {
  try {
    const response = await axiosInstance.get(`/v1/agents/${publicId}`);

    return {
      success: true,
      data: normalizeAgent(response.data.data || response.data),
    };
  } catch (error) {
    console.error('Get agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load agent',
    };
  }
};

/**
 * Creates a new agent
 * @param input - Agent creation parameters
 * @returns Promise with the created agent
 */
export const createAgent = async (input: CreateAgentInput): Promise<ApiResponse<Agent>> => {
  try {
    const response = await axiosInstance.post('/v1/agents', input);

    return {
      success: true,
      data: normalizeAgent(response.data.data || response.data),
      message: 'Agent created successfully',
    };
  } catch (error) {
    console.error('Create agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      message: axiosError.response?.data?.message || 'Failed to create agent',
      error: axiosError.response?.data?.message || 'Failed to create agent',
    };
  }
};

/**
 * Updates an existing agent
 * @param id - The public ID of the agent to update
 * @param input - Agent update parameters
 * @returns Promise with the updated agent
 */
export const updateAgent = async (
  id: string,
  input: Partial<CreateAgentInput>
): Promise<ApiResponse<Agent>> => {
  try {
    // Backend expects PATCH /v1/agents with publicId in the JSON body
    const response = await axiosInstance.patch('/v1/agents', { publicId: id, ...input });

    return {
      success: true,
      data: normalizeAgent(response.data.data || response.data),
      message: 'Agent updated successfully',
    };
  } catch (error) {
    console.error('Update agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      message: axiosError.response?.data?.message || 'Failed to update agent',
      error: axiosError.response?.data?.message || 'Failed to update agent',
    };
  }
};

export type PublishAgentResponse = Pick<
  Agent,
  'publicId' | 'status' | 'publishedVersion' | 'publishedAt'
> & {
  version: number;
};

/**
 * Publishes the current draft configuration of an agent for external runtimes.
 * @param publicId - The public ID of the agent to publish
 * @returns Promise with the published agent metadata
 */
export const publishAgent = async (
  publicId: string
): Promise<ApiResponse<PublishAgentResponse>> => {
  try {
    const response = await axiosInstance.post(`/v1/agents/${publicId}/publish`);

    return {
      success: true,
      data: response.data.data || response.data,
      message: response.data.message || 'Agent published successfully',
    };
  } catch (error) {
    console.error('Publish agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      message: axiosError.response?.data?.message || 'Failed to publish agent',
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to publish agent',
    };
  }
};

/**
 * Deletes an agent
 * @param id - The ID of the agent to delete
 * @returns Promise with deletion result
 */
export const deleteAgent = async (id: string): Promise<ApiResponse> => {
  try {
    const response = await axiosInstance.delete(`/v1/agents/${id}`);

    return {
      success: true,
      data: response.data.data,
      message: 'Agent deleted successfully',
    };
  } catch (error) {
    console.error('Delete agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to delete agent',
    };
  }
};

/**
 * Sets an agent as the default agent for the user
 * @param publicId - The public ID of the agent to set as default
 * @returns Promise with the operation result
 */
export const setDefaultAgent = async (
  publicId: string
): Promise<ApiResponse<{ publicId: string; isDefault: boolean }>> => {
  try {
    const response = await axiosInstance.patch(`/v1/agents/${publicId}/default`);

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || 'Default agent set successfully',
    };
  } catch (error) {
    console.error('Set default agent error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to set default agent',
    };
  }
};
