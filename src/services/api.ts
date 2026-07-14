/**
 * API Service - HTTP Client Utilities
 * Handles all backend API communications
 */

import type { AxiosError } from 'axios';
import axiosInstance from '../lib/axios';
import type { Language } from '../types';

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
    const response = await axiosInstance.get('/v1/common/supported-languages');

    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('Get supported languages error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        'Failed to load supported languages',
      message: axiosError.response?.data?.message,
    };
  }
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

import type { ApiKey, CreateApiKeyInput, CreateApiKeyResponse } from '../types';

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

// ============================================
// Subscription Management
// ============================================

import type { Package, CurrentSubscription, BillingHistoryItem } from '../types';

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
export const getCurrentSubscription = async (): Promise<ApiResponse<CurrentSubscription>> => {
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
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
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

    return {
      success: true,
      data: response.data.data || response.data,
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

// Alias for backward compatibility (to be deprecated)
export const upgradeSubscription = subscribe;

// ============================================
// Capabilities API
// ============================================

import type { Capability } from '../types';

/**
 * Fetches all active capabilities available for agent creation
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

import type { Characteristic, CharacteristicScope, CreateCharacteristicInput } from '../types';

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
      data: response.data.data || response.data,
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
 * Creates a new knowledge source
 * @param input - Knowledge creation parameters
 * @returns Promise with the created knowledge
 */
export const createKnowledge = async (
  input: CreateKnowledgeInput
): Promise<ApiResponse<Knowledge>> => {
  try {
    const response = await axiosInstance.post('/v1/knowledges', input);

    return {
      success: true,
      data: response.data.data || response.data,
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

// ============================================
// Chat & Messaging API
// ============================================

import type { ChatSession, ChatMessage } from '../types';

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

const normalizeChatSession = (session: BackendChatSession): ChatSession => {
  const publicId = session.publicId || String(session.id);
  return {
    ...session,
    id: publicId,
    publicId,
    internalId: typeof session.id === 'number' ? session.id : session.internalId,
    title: session.title || 'New Chat',
    agentId: session.agentId ?? session.agentPublicId ?? null,
    lastMessageAt: new Date(session.lastMessageAt || session.updatedAt || Date.now()),
    createdAt: new Date(session.createdAt || Date.now()),
    updatedAt: new Date(session.updatedAt || Date.now()),
  };
};

/**
 * Fetches all chat sessions for a specific agent
 * @param agentId - The ID of the agent
 * @returns Promise with array of chat sessions
 */
export const listChatSessions = async (agentId?: string): Promise<ApiResponse<ChatSession[]>> => {
  try {
    const response = await axiosInstance.get(`/v1/chat/sessions`, {
      params: agentId ? { agentId } : undefined,
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
  title?: string,
  options?: { temporary?: boolean }
): Promise<ApiResponse<ChatSession>> => {
  try {
    const response = await axiosInstance.post('/v1/chat/sessions', {
      ...(agentId ? { agentId } : {}),
      title,
      ...(options?.temporary ? { temporary: true } : {}),
    });

    return {
      success: true,
      data: normalizeChatSession(response.data.data || response.data),
      message: 'Chat session created successfully',
    };
  } catch (error) {
    console.error('Create chat session error:', error);
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;

    return {
      success: false,
      error:
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
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
      data: response.data.data || response.data,
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
      data: response.data.data || response.data,
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

// ============================================
// Agents API
// ============================================

import type { Agent, CreateAgentInput } from '../types';

/**
 * Fetches all agents for the current user
 * @returns Promise with array of agents
 */
export const listAgents = async (): Promise<ApiResponse<Agent[]>> => {
  try {
    const response = await axiosInstance.get('/v1/agents');
    const raw: Array<Record<string, unknown>> = response.data.data || response.data;

    // Backend exposes publicId; frontend keyed on id throughout (navigate, find, delete URL …)
    const agents: Agent[] = raw.map((item) => ({
      ...item,
      id: item.publicId as string,
    })) as Agent[];

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

/**
 * Uploads an agent avatar image to Cloudflare R2 via the backend
 * @param file - Image file (jpg, png, svg, gif, webp) max 5 MB
 * @returns Promise with the public URL of the stored image
 */
export const uploadAgentAvatar = async (file: File): Promise<ApiResponse<{ url: string }>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post('/v1/agents/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

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
 * @returns Promise with the full agent including capabilityIds, characteristicIds, knowledgeIds
 */
export const getAgent = async (publicId: string): Promise<ApiResponse<Agent>> => {
  try {
    const response = await axiosInstance.get(`/v1/agents/${publicId}`);

    return {
      success: true,
      data: response.data.data,
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
      data: response.data.data || response.data,
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
      data: response.data.data || response.data,
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
