/**
 * API Key Management Page
 * Allows users to create, view, and revoke API keys.
 * API keys are scoped to specific capabilities selected at creation time.
 * SECURITY: Raw API keys are NEVER stored - only shown once at creation.
 */

import {
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Bot,
  Building2,
  CheckCircle2,
  Copy,
  Gauge,
  Key,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  createApiKey,
  createIntegrationClient,
  buildServerUrl,
  listAgents,
  listApiKeys,
  listApiScopeCatalog,
  listIntegrationClientBindings,
  listIntegrationClients,
  listKnowledge,
  provisionIntegrationClientAgent,
  revokeApiKey,
  rotateApiKey,
  updateIntegrationClientBinding,
  upsertIntegrationClientBinding,
} from '../services/api';
import { getApiKeyUsage } from '../services/api-key-usage.service';
import { getThirdPartyUsage } from '../services/third-party-usage.service';
import type {
  Agent,
  ApiKey,
  ApiKeyApiScopeInput,
  ApiKeyApiScopeResponse,
  ApiKeyUsageGroupBy,
  ApiKeyUsageRow,
  ApiScopeCatalogItem,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  ExternalAgentBinding,
  IntegrationClient,
  Knowledge,
  ThirdPartyUsageGroupBy,
  ThirdPartyUsageRow,
} from '../types';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from 'react-i18next';

// ============================================
// Helpers
// ============================================

const API_KEY_ACTIONS = ['canExecute', 'canCreate', 'canDelete'] as const;
type ApiKeyUseCaseId =
  | 'selectedScopes'
  | 'chatWithOneAgent'
  | 'thirdPartyRuntime'
  | 'thirdPartyProvisioning';

const API_KEY_SCOPE_PRESETS = {
  chatWithOneAgent: (agentPublicId: string): ApiKeyApiScopeInput[] => [
    { scope: 'agents:execute', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'chat_sessions:create', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'chat_messages:create', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'chat_messages:read', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'files:generate', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'files:read', resourceType: 'agent', resourcePublicId: agentPublicId },
  ],
  thirdPartyRuntime: (clientPublicId: string): ApiKeyApiScopeInput[] => [
    {
      scope: 'agents:read',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'agents:execute',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'chat_sessions:create',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'chat_messages:create',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'chat_messages:read',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'files:generate',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'files:read',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'usage:read',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
  ],
  thirdPartyProvisioning: (clientPublicId: string): ApiKeyApiScopeInput[] => [
    {
      scope: 'integration_clients:read',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'integration_clients:update',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'agents:create',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    { scope: 'agents:read', resourceType: 'integration_client', resourcePublicId: clientPublicId },
    {
      scope: 'agents:update',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'knowledge:create',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'knowledge:read',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'knowledge:update',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    {
      scope: 'knowledge:sync',
      resourceType: 'integration_client',
      resourcePublicId: clientPublicId,
    },
    { scope: 'files:upload', resourceType: 'integration_client', resourcePublicId: clientPublicId },
    { scope: 'files:read', resourceType: 'integration_client', resourcePublicId: clientPublicId },
  ],
};

const API_KEY_USE_CASES: Array<{
  id: ApiKeyUseCaseId;
  title: string;
  descriptionKey: string;
  description: string;
  resourceLabelKey: string;
  resourceLabel: string;
  resourceRequired: boolean;
}> = [
  {
    id: 'selectedScopes',
    title: 'Selected scopes',
    descriptionKey: 'apiKeys.modal.useCaseDescriptions.selectedScopes',
    description: 'Personal API key for selected service or resource actions.',
    resourceLabelKey: 'apiKeys.modal.resource',
    resourceLabel: 'Resource',
    resourceRequired: false,
  },
  {
    id: 'chatWithOneAgent',
    title: 'Chat with one agent',
    descriptionKey: 'apiKeys.modal.useCaseDescriptions.chatWithOneAgent',
    description: 'Backend clients can create sessions and messages for one selected agent only.',
    resourceLabelKey: 'apiKeys.modal.agentResource',
    resourceLabel: 'Agent',
    resourceRequired: true,
  },
  {
    id: 'thirdPartyRuntime',
    title: 'Third-party runtime',
    descriptionKey: 'apiKeys.modal.useCaseDescriptions.thirdPartyRuntime',
    description:
      'A platform backend such as NailMap can chat through agents bound to one integration client.',
    resourceLabelKey: 'apiKeys.modal.integrationClientResource',
    resourceLabel: 'Integration client',
    resourceRequired: true,
  },
  {
    id: 'thirdPartyProvisioning',
    title: 'Third-party provisioning',
    descriptionKey: 'apiKeys.modal.useCaseDescriptions.thirdPartyProvisioning',
    description:
      'A trusted platform backend can create tenant agents and bindings under one integration client.',
    resourceLabelKey: 'apiKeys.modal.integrationClientResource',
    resourceLabel: 'Integration client',
    resourceRequired: true,
  },
];

interface ApiKeyCurlExample {
  key: string;
  titleKey: string;
  title: string;
  command: string;
}

const buildCurlCommand = ({
  apiKey,
  method,
  path,
  body,
  headers = {},
}: {
  apiKey: string;
  method: 'POST' | 'GET' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}) => {
  const lines = [`curl -X ${method} "${buildServerUrl(path)}"`, `  -H "x-api-key: ${apiKey}"`];

  Object.entries(headers).forEach(([name, value]) => {
    lines.push(`  -H "${name}: ${value}"`);
  });

  if (body) {
    lines.push('  -H "Content-Type: application/json"');
    lines.push(`  -d '${JSON.stringify(body)}'`);
  }

  return lines.join(' \\\n');
};

const getFirstScopedResourcePublicId = (
  scopes: ApiKeyApiScopeResponse[] | undefined,
  resourceType: string
) =>
  scopes?.find((scope) => scope.resourceType === resourceType && scope.resourcePublicId)
    ?.resourcePublicId;

const enrichCreatedApiKeyScopes = (
  data: CreateApiKeyResponse,
  inputs: ApiKeyApiScopeInput[]
): CreateApiKeyResponse => ({
  ...data,
  scopes: data.scopes?.map((scope) => {
    if (scope.resourcePublicId) return scope;

    const matchingInput = inputs.find(
      (input) =>
        input.scope === scope.scope &&
        (input.resourceType ?? null) === (scope.resourceType ?? null) &&
        input.resourcePublicId
    );

    return matchingInput?.resourcePublicId
      ? { ...scope, resourcePublicId: matchingInput.resourcePublicId }
      : scope;
  }),
});

const buildApiKeyCurlExamples = (data: CreateApiKeyResponse | null): ApiKeyCurlExample[] => {
  const scopes = data?.scopes ?? [];
  if (!data?.apiKey || scopes.length === 0) return [];

  const grantedScopes = new Set(scopes.map((scope) => scope.scope));
  const examples: ApiKeyCurlExample[] = [];
  const addExample = (example: ApiKeyCurlExample) => {
    if (!examples.some((item) => item.key === example.key)) {
      examples.push(example);
    }
  };

  const translationScope = scopes.find((scope) => scope.scope === 'translations:create');

  if (translationScope) {
    const agentPublicId =
      translationScope.resourceType === 'agent'
        ? (translationScope.resourcePublicId ?? '{agent_public_id}')
        : undefined;

    addExample({
      key: 'translation',
      titleKey: 'apiKeys.oneTime.exampleTranslation',
      title: 'Translation',
      command: buildCurlCommand({
        apiKey: data.apiKey,
        method: 'POST',
        path: '/v1/translate',
        body: {
          text: 'Hello, welcome to our service.',
          sourceLang: 'auto',
          targetLang: ['vi'],
          ...(agentPublicId && { agentPublicId }),
        },
      }),
    });
  }

  if (grantedScopes.has('images:generate')) {
    addExample({
      key: 'image-generation',
      titleKey: 'apiKeys.oneTime.exampleImageGeneration',
      title: 'Image generation',
      command: buildCurlCommand({
        apiKey: data.apiKey,
        method: 'POST',
        path: '/v1/capabilities/text_to_image/execute',
        body: {
          prompt: 'Create a clean product mockup on a white background.',
        },
      }),
    });
  }

  if (grantedScopes.has('images:analyze')) {
    addExample({
      key: 'image-analysis',
      titleKey: 'apiKeys.oneTime.exampleImageAnalysis',
      title: 'Image analysis',
      command: buildCurlCommand({
        apiKey: data.apiKey,
        method: 'POST',
        path: '/v1/capabilities/image_to_text/execute',
        body: {
          prompt: 'Describe this image.',
          images: [
            {
              data: 'base64-image-data',
              mimeType: 'image/png',
            },
          ],
        },
      }),
    });
  }

  if (grantedScopes.has('chat:create')) {
    addExample({
      key: 'text-generation',
      titleKey: 'apiKeys.oneTime.exampleTextGeneration',
      title: 'Text generation',
      command: buildCurlCommand({
        apiKey: data.apiKey,
        method: 'POST',
        path: '/v1/capabilities/text_generate/execute',
        body: {
          messages: [{ role: 'user', content: 'Write a short welcome message.' }],
        },
      }),
    });
  }

  if (grantedScopes.has('agents:execute') && grantedScopes.has('chat_messages:create')) {
    const agentPublicId = getFirstScopedResourcePublicId(scopes, 'agent') ?? '{agent_public_id}';
    addExample({
      key: 'agent-message',
      titleKey: 'apiKeys.oneTime.exampleAgentMessage',
      title: 'Agent message',
      command: buildCurlCommand({
        apiKey: data.apiKey,
        method: 'POST',
        path: `/v1/agents/${agentPublicId}/messages`,
        headers: {
          'Idempotency-Key': 'msg_001',
        },
        body: {
          session: {
            external_session_id: 'personal-demo',
            create_if_missing: true,
          },
          message: {
            role: 'user',
            content: 'Hello, can you help me?',
          },
        },
      }),
    });
  }

  scopes
    .filter(
      (scope) =>
        scope.capabilityCode &&
        !['translation', 'text_to_image', 'image_to_text', 'text_generate'].includes(
          scope.capabilityCode
        )
    )
    .slice(0, Math.max(0, 4 - examples.length))
    .forEach((scope) => {
      addExample({
        key: `direct-${scope.capabilityCode}`,
        titleKey: 'apiKeys.oneTime.exampleDirectCapability',
        title: `${scope.capabilityCode} capability`,
        command: buildCurlCommand({
          apiKey: data.apiKey,
          method: 'POST',
          path: `/v1/capabilities/${scope.capabilityCode}/execute`,
          body: {
            prompt: 'Run this capability with my input.',
          },
        }),
      });
    });

  return examples.slice(0, 4);
};

const API_SCOPE_DESCRIPTIONS: Record<string, string> = {
  'agents:create': 'Create tenant agents during provisioning.',
  'agents:read': 'Read allowed agent metadata.',
  'agents:update': 'Update tenant agents during provisioning.',
  'agents:execute': 'Run the selected or bound agent.',
  'chat_sessions:create': 'Create chat sessions.',
  'chat_messages:create': 'Send chat messages.',
  'chat_messages:read': 'Read chat messages and responses.',
  'knowledge:create': 'Create knowledge resources for provisioned agents.',
  'knowledge:read': 'Read knowledge resources for provisioned agents.',
  'knowledge:update': 'Update knowledge resources for provisioned agents.',
  'knowledge:sync': 'Trigger knowledge sync jobs.',
  'files:upload': 'Upload files for provisioned knowledge.',
  'files:generate': 'Generate file artifacts through enabled agent tools.',
  'files:read': 'Download files created or scoped to this key.',
  'integration_clients:read': 'Read the selected integration client.',
  'integration_clients:update': 'Create or update tenant-agent bindings.',
  'usage:read': 'Read usage attributed to this integration client.',
};

const API_SCOPE_DESCRIPTION_KEYS: Record<string, string> = {
  'agents:create': 'apiKeys.modal.scopeDescriptions.agentsCreate',
  'agents:read': 'apiKeys.modal.scopeDescriptions.agentsRead',
  'agents:update': 'apiKeys.modal.scopeDescriptions.agentsUpdate',
  'agents:execute': 'apiKeys.modal.scopeDescriptions.agentsExecute',
  'chat_sessions:create': 'apiKeys.modal.scopeDescriptions.chatSessionsCreate',
  'chat_messages:create': 'apiKeys.modal.scopeDescriptions.chatMessagesCreate',
  'chat_messages:read': 'apiKeys.modal.scopeDescriptions.chatMessagesRead',
  'knowledge:create': 'apiKeys.modal.scopeDescriptions.knowledgeCreate',
  'knowledge:read': 'apiKeys.modal.scopeDescriptions.knowledgeRead',
  'knowledge:update': 'apiKeys.modal.scopeDescriptions.knowledgeUpdate',
  'knowledge:sync': 'apiKeys.modal.scopeDescriptions.knowledgeSync',
  'files:upload': 'apiKeys.modal.scopeDescriptions.filesUpload',
  'files:generate': 'apiKeys.modal.scopeDescriptions.filesGenerate',
  'files:read': 'apiKeys.modal.scopeDescriptions.filesRead',
  'integration_clients:read': 'apiKeys.modal.scopeDescriptions.integrationClientsRead',
  'integration_clients:update': 'apiKeys.modal.scopeDescriptions.integrationClientsUpdate',
  'usage:read': 'apiKeys.modal.scopeDescriptions.usageRead',
};

function displayName(apiKey: ApiKey): string {
  return apiKey.metadata?.appName || apiKey.publicId;
}

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatOptionalDate(dateString: string | null | undefined, locale: string): string {
  return dateString ? formatDate(dateString, locale) : '—';
}

function apiKeyEnvironment(apiKey: ApiKey): string {
  return apiKey.environment || apiKey.metadata?.environment || '—';
}

function formatRateLimit(apiKey: ApiKey): string {
  const minute = apiKey.rateLimitPerMinute ? `${apiKey.rateLimitPerMinute}/min` : null;
  const day = apiKey.rateLimitPerDay ? `${apiKey.rateLimitPerDay}/day` : null;
  return [minute, day].filter(Boolean).join(' · ') || '—';
}

type ApiKeySortField =
  | 'name'
  | 'status'
  | 'environment'
  | 'scopes'
  | 'createdAt'
  | 'lastUsed'
  | 'expiresAt';
type SortDirection = 'asc' | 'desc';

const API_KEY_ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

function apiKeyScopeCount(apiKey: ApiKey): number {
  return apiKey.scopes?.length ?? apiKey.capabilities.length;
}

function apiKeySearchText(apiKey: ApiKey): string {
  const scopeText = apiKey.scopes?.map((scope) => scope.scope).join(' ') ?? '';
  const capabilityText = apiKey.capabilities
    .map((capability) => `${capability.capabilityCode} ${capability.capabilityName}`)
    .join(' ');

  return [
    displayName(apiKey),
    apiKey.publicId,
    apiKey.prefix,
    apiKey.status,
    apiKeyEnvironment(apiKey),
    apiKey.metadata?.description,
    scopeText,
    capabilityText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function apiKeySortValue(apiKey: ApiKey, field: ApiKeySortField): string | number {
  if (field === 'name') return displayName(apiKey).toLowerCase();
  if (field === 'status') return apiKey.status;
  if (field === 'environment') return apiKeyEnvironment(apiKey).toLowerCase();
  if (field === 'scopes') return apiKeyScopeCount(apiKey);
  return apiKey[field] ? new Date(apiKey[field] ?? '').getTime() : 0;
}

function compareApiKeys(
  left: ApiKey,
  right: ApiKey,
  sortField: ApiKeySortField,
  sortDirection: SortDirection
): number {
  const leftValue = apiKeySortValue(left, sortField);
  const rightValue = apiKeySortValue(right, sortField);
  const direction = sortDirection === 'asc' ? 1 : -1;

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * direction;
  }

  return String(leftValue).localeCompare(String(rightValue)) * direction;
}

// ============================================
// Main Component
// ============================================

export const ApiKeyManagement: React.FC = () => {
  const { t } = useTranslation();
  const { success, error } = useNotification();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [oneTimeKeyModal, setOneTimeKeyModal] = useState<{
    open: boolean;
    data: CreateApiKeyResponse | null;
  }>({ open: false, data: null });
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    apiKey: ApiKey | null;
  }>({ open: false, apiKey: null });
  const [rotateDialog, setRotateDialog] = useState<{
    open: boolean;
    apiKey: ApiKey | null;
  }>({ open: false, apiKey: null });
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    loadApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    const response = await listApiKeys();
    if (response.success && response.data) {
      setApiKeys(response.data);
    } else {
      error(response.error || t('apiKeys.errors.loadFailed'));
    }
    setLoading(false);
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      success(t('apiKeys.messages.copied'));
    } catch {
      error(t('apiKeys.errors.copyFailed'));
    }
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-4 md:p-6 lg:p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">
            {t('apiKeys.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 md:text-base">
            {t('apiKeys.subtitle')}
          </p>
        </div>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={() => setCreateModalOpen(true)}
          sx={{ minHeight: 44 }}
        >
          {t('apiKeys.create')}
        </Button>
      </div>

      <IntegrationClientsPanel />
      <PersonalApiKeyUsagePanel apiKeys={apiKeys} />
      <ThirdPartyUsagePanel />

      <ApiKeysTable
        apiKeys={apiKeys}
        onCreate={() => setCreateModalOpen(true)}
        onSelect={setSelectedApiKey}
        onRotate={(apiKey) => setRotateDialog({ open: true, apiKey })}
        onRevoke={(apiKey) => setRevokeDialog({ open: true, apiKey })}
      />

      {/* Create Modal */}
      <CreateApiKeyModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(data) => {
          setCreateModalOpen(false);
          setOneTimeKeyModal({ open: true, data });
          loadApiKeys();
        }}
      />

      {/* One-Time Key Display Modal */}
      <OneTimeKeyModal
        open={oneTimeKeyModal.open}
        data={oneTimeKeyModal.data}
        onClose={() => setOneTimeKeyModal({ open: false, data: null })}
        onCopy={handleCopyKey}
      />

      <ApiKeyDetailDialog
        apiKey={selectedApiKey}
        open={Boolean(selectedApiKey)}
        onClose={() => setSelectedApiKey(null)}
        onRotate={(apiKey) => {
          setSelectedApiKey(null);
          setRotateDialog({ open: true, apiKey });
        }}
        onRevoke={(apiKey) => {
          setSelectedApiKey(null);
          setRevokeDialog({ open: true, apiKey });
        }}
      />

      {/* Revoke Confirmation Dialog */}
      <RevokeConfirmationDialog
        open={revokeDialog.open}
        apiKey={revokeDialog.apiKey}
        onClose={() => setRevokeDialog({ open: false, apiKey: null })}
        onConfirm={async () => {
          if (revokeDialog.apiKey) {
            const response = await revokeApiKey(revokeDialog.apiKey.publicId);
            if (response.success) {
              success(t('apiKeys.messages.revoked'));
              loadApiKeys();
            } else {
              error(response.error || t('apiKeys.errors.revokeFailed'));
            }
          }
          setRevokeDialog({ open: false, apiKey: null });
        }}
      />

      <RotateConfirmationDialog
        open={rotateDialog.open}
        apiKey={rotateDialog.apiKey}
        onClose={() => setRotateDialog({ open: false, apiKey: null })}
        onConfirm={async () => {
          if (rotateDialog.apiKey) {
            const response = await rotateApiKey(rotateDialog.apiKey.publicId);
            if (response.success && response.data?.apiKey) {
              success(t('apiKeys.messages.rotated'));
              setOneTimeKeyModal({ open: true, data: response.data });
              loadApiKeys();
            } else {
              error(response.error || t('apiKeys.errors.rotateFailed'));
            }
          }
          setRotateDialog({ open: false, apiKey: null });
        }}
      />
    </div>
  );
};

// ============================================
// API Keys Table
// ============================================

interface ApiKeysTableProps {
  apiKeys: ApiKey[];
  onCreate: () => void;
  onSelect: (apiKey: ApiKey) => void;
  onRotate: (apiKey: ApiKey) => void;
  onRevoke: (apiKey: ApiKey) => void;
}

const ApiKeysTable: React.FC<ApiKeysTableProps> = ({
  apiKeys,
  onCreate,
  onSelect,
  onRotate,
  onRevoke,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApiKey['status']>('all');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [sortField, setSortField] = useState<ApiKeySortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const environments = useMemo(
    () =>
      Array.from(
        new Set(apiKeys.map(apiKeyEnvironment).filter((environment) => environment !== '—'))
      ).sort(),
    [apiKeys]
  );

  const filteredApiKeys = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return apiKeys
      .filter((apiKey) => statusFilter === 'all' || apiKey.status === statusFilter)
      .filter(
        (apiKey) => environmentFilter === 'all' || apiKeyEnvironment(apiKey) === environmentFilter
      )
      .filter((apiKey) => !normalizedSearch || apiKeySearchText(apiKey).includes(normalizedSearch))
      .sort((left, right) => compareApiKeys(left, right, sortField, sortDirection));
  }, [apiKeys, environmentFilter, searchTerm, sortDirection, sortField, statusFilter]);

  const pagedApiKeys = useMemo(
    () => filteredApiKeys.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredApiKeys, page, rowsPerPage]
  );

  useEffect(() => {
    setPage(0);
  }, [apiKeys.length, environmentFilter, searchTerm, sortDirection, sortField, statusFilter]);

  const handleSort = (field: ApiKeySortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection(
      field === 'name' || field === 'environment' || field === 'status' ? 'asc' : 'desc'
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setEnvironmentFilter('all');
  };

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
        <Key className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-slate-500" />
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100">
          {t('apiKeys.empty.title')}
        </h3>
        <p className="mb-6 text-gray-600 dark:text-slate-400">{t('apiKeys.empty.description')}</p>
        <Button variant="contained" startIcon={<Plus size={20} />} onClick={onCreate}>
          {t('apiKeys.create')}
        </Button>
      </div>
    );
  }

  const sortCell = (field: ApiKeySortField, label: string) => (
    <TableSortLabel
      active={sortField === field}
      direction={sortField === field ? sortDirection : 'asc'}
      onClick={() => handleSort(field)}
    >
      {label}
    </TableSortLabel>
  );

  return (
    <section className="rounded-lg border border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <div className="border-b border-gray-200 p-4 dark:border-slate-700">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto]">
          <TextField
            fullWidth
            size="small"
            label={t('apiKeys.table.search')}
            placeholder={t('apiKeys.table.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} className="text-gray-400" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            fullWidth
            size="small"
            label={t('apiKeys.table.statusFilter')}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | ApiKey['status'])}
          >
            <MenuItem value="all">{t('apiKeys.table.allStatuses')}</MenuItem>
            <MenuItem value="ACTIVE">{t('apiKeys.status.ACTIVE')}</MenuItem>
            <MenuItem value="REVOKED">{t('apiKeys.status.REVOKED')}</MenuItem>
          </TextField>
          <TextField
            select
            fullWidth
            size="small"
            label={t('apiKeys.table.environmentFilter')}
            value={environmentFilter}
            onChange={(event) => setEnvironmentFilter(event.target.value)}
          >
            <MenuItem value="all">{t('apiKeys.table.allEnvironments')}</MenuItem>
            {environments.map((environment) => (
              <MenuItem key={environment} value={environment}>
                {environment}
              </MenuItem>
            ))}
          </TextField>
          <Button type="button" variant="outlined" onClick={clearFilters}>
            {t('apiKeys.table.clearFilters')}
          </Button>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          {t('apiKeys.table.filteredCount', {
            shown: filteredApiKeys.length,
            total: apiKeys.length,
          })}
        </div>
      </div>

      <TableContainer className="overflow-x-auto">
        <Table
          size="small"
          sx={{
            minWidth: 1180,
            '& .MuiTableCell-root': { color: 'inherit' },
            '& .MuiTableSortLabel-root': { color: 'inherit !important' },
            '& .MuiTableSortLabel-icon': { color: 'inherit !important' },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>{sortCell('name', t('apiKeys.table.columns.name'))}</TableCell>
              <TableCell>{t('apiKeys.table.columns.prefix')}</TableCell>
              <TableCell>{sortCell('scopes', t('apiKeys.table.columns.scopes'))}</TableCell>
              <TableCell>{sortCell('status', t('apiKeys.table.columns.status'))}</TableCell>
              <TableCell>
                {sortCell('environment', t('apiKeys.table.columns.environment'))}
              </TableCell>
              <TableCell>{sortCell('createdAt', t('apiKeys.table.columns.created'))}</TableCell>
              <TableCell>{sortCell('lastUsed', t('apiKeys.table.columns.lastUsed'))}</TableCell>
              <TableCell>{sortCell('expiresAt', t('apiKeys.table.columns.expires'))}</TableCell>
              <TableCell>{t('apiKeys.table.columns.rateLimit')}</TableCell>
              <TableCell align="right">{t('apiKeys.table.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedApiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    {t('apiKeys.table.noResults')}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pagedApiKeys.map((apiKey) => {
                const isActive = apiKey.status === 'ACTIVE';

                return (
                  <TableRow
                    hover
                    key={apiKey.publicId}
                    tabIndex={0}
                    onClick={() => onSelect(apiKey)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onSelect(apiKey);
                    }}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="min-w-[190px]">
                        <div className="truncate text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {displayName(apiKey)}
                        </div>
                        <div className="truncate font-mono text-xs text-gray-400 dark:text-slate-500">
                          {apiKey.publicId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-600 dark:text-slate-300">
                        {apiKey.prefix || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ApiKeyScopePreview apiKey={apiKey} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(`apiKeys.status.${apiKey.status}`, {
                          defaultValue: apiKey.status,
                        })}
                        size="small"
                        color={isActive ? 'success' : 'default'}
                        icon={isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      />
                    </TableCell>
                    <TableCell>{apiKeyEnvironment(apiKey)}</TableCell>
                    <TableCell>{formatDate(apiKey.createdAt, dateLocale)}</TableCell>
                    <TableCell>{formatOptionalDate(apiKey.lastUsed, dateLocale)}</TableCell>
                    <TableCell>{formatOptionalDate(apiKey.expiresAt, dateLocale)}</TableCell>
                    <TableCell>{formatRateLimit(apiKey)}</TableCell>
                    <TableCell align="right">
                      {isActive && (
                        <div className="flex justify-end gap-1">
                          <Tooltip title={t('apiKeys.card.rotate')} arrow>
                            <IconButton
                              onClick={(event) => {
                                event.stopPropagation();
                                onRotate(apiKey);
                              }}
                              color="primary"
                              size="small"
                            >
                              <RefreshCw size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('apiKeys.revoke.revokeKey')} arrow>
                            <IconButton
                              onClick={(event) => {
                                event.stopPropagation();
                                onRevoke(apiKey);
                              }}
                              color="error"
                              size="small"
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        className="text-gray-700 dark:text-slate-300"
        component="div"
        count={filteredApiKeys.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={API_KEY_ROWS_PER_PAGE_OPTIONS}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        labelRowsPerPage={t('apiKeys.table.rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) =>
          t('apiKeys.table.displayedRows', { from, to, count })
        }
        sx={{
          color: 'inherit',
          '& .MuiTablePagination-selectLabel': { color: 'inherit' },
          '& .MuiTablePagination-displayedRows': { color: 'inherit' },
          '& .MuiSvgIcon-root': { color: 'inherit' },
        }}
      />
    </section>
  );
};

const ApiKeyScopePreview: React.FC<{ apiKey: ApiKey }> = ({ apiKey }) => {
  const { t } = useTranslation();
  const scopeCount = apiKeyScopeCount(apiKey);
  const visibleLimit = 2;

  if (scopeCount === 0) {
    return (
      <span className="text-sm text-gray-400 dark:text-slate-500">
        {t('apiKeys.card.noCapabilities')}
      </span>
    );
  }

  const visibleScopes = apiKey.scopes?.slice(0, visibleLimit);
  const visibleCapabilities = apiKey.scopes?.length
    ? []
    : apiKey.capabilities.slice(0, visibleLimit);
  const remaining = Math.max(0, scopeCount - visibleLimit);

  return (
    <div className="flex min-w-[220px] max-w-[320px] flex-wrap gap-1.5">
      {visibleScopes?.map((scope) => (
        <ApiScopeBadge
          key={`${scope.scope}:${scope.resourceType ?? ''}:${scope.resourceId ?? ''}`}
          scope={scope}
        />
      ))}
      {visibleCapabilities.map((capability) => (
        <CapabilityBadge key={capability.capabilityCode} scope={capability} />
      ))}
      {remaining > 0 && (
        <Chip
          label={t('apiKeys.table.moreScopes', { count: remaining })}
          size="small"
          variant="outlined"
          className="!text-xs"
        />
      )}
    </div>
  );
};

interface ApiKeyDetailDialogProps {
  apiKey: ApiKey | null;
  open: boolean;
  onClose: () => void;
  onRotate: (apiKey: ApiKey) => void;
  onRevoke: (apiKey: ApiKey) => void;
}

const ApiKeyDetailDialog: React.FC<ApiKeyDetailDialogProps> = ({
  apiKey,
  open,
  onClose,
  onRotate,
  onRevoke,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  if (!apiKey) return null;

  const isActive = apiKey.status === 'ACTIVE';
  const details = [
    { label: t('apiKeys.detail.publicId'), value: apiKey.publicId, mono: true },
    { label: t('apiKeys.card.prefix'), value: apiKey.prefix || '—', mono: true },
    { label: t('apiKeys.card.environment'), value: apiKeyEnvironment(apiKey) },
    { label: t('apiKeys.table.columns.created'), value: formatDate(apiKey.createdAt, dateLocale) },
    { label: t('apiKeys.card.lastUsed'), value: formatOptionalDate(apiKey.lastUsed, dateLocale) },
    { label: t('apiKeys.card.expires'), value: formatOptionalDate(apiKey.expiresAt, dateLocale) },
    {
      label: t('apiKeys.detail.revokedAt'),
      value: formatOptionalDate(apiKey.revokedAt, dateLocale),
    },
    { label: t('apiKeys.card.rateLimit'), value: formatRateLimit(apiKey) },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex flex-col gap-2 border-b border-gray-200 dark:border-slate-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">
              {displayName(apiKey)}
            </div>
            <div className="truncate font-mono text-xs font-normal text-gray-400 dark:text-slate-500">
              {apiKey.publicId}
            </div>
          </div>
          <Chip
            label={t(`apiKeys.status.${apiKey.status}`, { defaultValue: apiKey.status })}
            size="small"
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          />
        </div>
      </DialogTitle>
      <DialogContent className="!pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {details.map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-slate-700"
            >
              <div className="text-xs text-gray-400 dark:text-slate-500">{item.label}</div>
              <div
                className={`mt-1 truncate text-sm text-gray-800 dark:text-slate-200 ${
                  item.mono ? 'font-mono' : ''
                }`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {apiKey.metadata?.description && (
          <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
            <div className="text-xs text-gray-400 dark:text-slate-500">
              {t('apiKeys.detail.description')}
            </div>
            <p className="mt-1 text-sm text-gray-700 dark:text-slate-300">
              {apiKey.metadata.description}
            </p>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
            {apiKey.scopes?.length ? t('apiKeys.detail.scopes') : t('apiKeys.detail.capabilities')}
          </div>
          {apiKeyScopeCount(apiKey) === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-600 dark:text-slate-400">
              {t('apiKeys.card.noCapabilities')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {apiKey.scopes?.length
                ? apiKey.scopes.map((scope) => (
                    <ApiScopeBadge
                      key={`${scope.scope}:${scope.resourceType ?? ''}:${scope.resourceId ?? ''}`}
                      scope={scope}
                    />
                  ))
                : apiKey.capabilities.map((capability) => (
                    <CapabilityBadge key={capability.capabilityCode} scope={capability} />
                  ))}
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions className="border-t border-gray-200 dark:border-slate-700">
        <Button onClick={onClose}>{t('apiKeys.detail.close')}</Button>
        {isActive && (
          <>
            <Button
              type="button"
              variant="outlined"
              startIcon={<RefreshCw size={16} />}
              onClick={() => onRotate(apiKey)}
            >
              {t('apiKeys.card.rotate')}
            </Button>
            <Button
              type="button"
              color="error"
              variant="contained"
              startIcon={<Trash2 size={16} />}
              onClick={() => onRevoke(apiKey)}
            >
              {t('apiKeys.revoke.revokeKey')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ============================================
// Capability Badge
// ============================================

interface CapabilityBadgeProps {
  scope: ApiKey['capabilities'][number];
}

const CapabilityBadge: React.FC<CapabilityBadgeProps> = ({ scope }) => {
  const { t } = useTranslation();
  const actions = API_KEY_ACTIONS.filter((k) => scope[k])
    .map((k) => t(`apiKeys.actions.${k}`))
    .join(' · ');

  return (
    <Tooltip title={actions || t('apiKeys.actions.none')} arrow placement="top">
      <Chip
        icon={<Zap size={12} />}
        label={scope.capabilityName}
        size="small"
        variant="outlined"
        className="!border-blue-300 !text-xs !text-blue-700 dark:!border-blue-700 dark:!text-blue-300"
      />
    </Tooltip>
  );
};

interface ApiScopeBadgeProps {
  scope: NonNullable<ApiKey['scopes']>[number];
}

const ApiScopeBadge: React.FC<ApiScopeBadgeProps> = ({ scope }) => {
  const { t } = useTranslation();
  const restriction = scope.resourceType
    ? `${scope.resourceType}:${scope.resourcePublicId ?? scope.resourceId ?? '*'}`
    : t('apiKeys.modal.allOwnedResources', { defaultValue: 'All owned resources' });

  return (
    <Tooltip title={restriction} arrow placement="top">
      <Chip
        icon={<Zap size={12} />}
        label={scope.scope}
        size="small"
        variant="outlined"
        className="!border-blue-300 !text-xs !text-blue-700 dark:!border-blue-700 dark:!text-blue-300"
      />
    </Tooltip>
  );
};

// ============================================
// Integration Clients Panel
// ============================================

const IntegrationClientsPanel: React.FC = () => {
  const { t } = useTranslation();
  const { success, error } = useNotification();
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bindings, setBindings] = useState<ExternalAgentBinding[]>([]);
  const [selectedClientPublicId, setSelectedClientPublicId] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingBindings, setLoadingBindings] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [savingBinding, setSavingBinding] = useState(false);
  const [provisioningAgent, setProvisioningAgent] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({ name: '', environment: 'live' });
  const [bindingForm, setBindingForm] = useState({
    agentPublicId: '',
    externalTenantId: '',
    externalTenantType: 'salon',
  });
  const [provisionForm, setProvisionForm] = useState({
    externalTenantId: '',
    externalTenantType: 'salon',
    templateAgentPublicId: '',
    name: '',
  });

  const selectedClient = clients.find((client) => client.public_id === selectedClientPublicId);
  const filteredClients = useMemo(() => {
    const normalizedSearch = clientSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return clients;

    return clients.filter((client) =>
      [
        client.name,
        client.public_id,
        client.environment,
        client.status,
        String(client.binding_count ?? 0),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [clientSearchTerm, clients]);

  const loadClients = async () => {
    setLoadingClients(true);
    const [clientsRes, agentsRes] = await Promise.all([listIntegrationClients(), listAgents()]);

    if (clientsRes.success && clientsRes.data) {
      setClients(clientsRes.data);
      setSelectedClientPublicId((current) => current || clientsRes.data?.[0]?.public_id || '');
    } else {
      error(clientsRes.error || t('apiKeys.errors.loadIntegrationClientsFailed'));
    }

    if (agentsRes.success && agentsRes.data) {
      setAgents(agentsRes.data);
    } else {
      error(agentsRes.error || t('apiKeys.errors.loadAgentsFailed'));
    }

    setLoadingClients(false);
  };

  const loadBindings = async (clientPublicId: string) => {
    if (!clientPublicId) {
      setBindings([]);
      return;
    }

    setLoadingBindings(true);
    const response = await listIntegrationClientBindings(clientPublicId);

    if (response.success && response.data) {
      setBindings(response.data);
    } else {
      error(response.error || t('apiKeys.errors.loadBindingsFailed'));
    }

    setLoadingBindings(false);
  };

  useEffect(() => {
    void loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadBindings(selectedClientPublicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientPublicId]);

  const handleCreateClient = async () => {
    const name = newClient.name.trim();
    if (!name || savingClient) return;

    setSavingClient(true);
    const response = await createIntegrationClient({
      name,
      environment: newClient.environment,
      status: 'active',
    });

    if (response.success && response.data) {
      setClients((prev) => [response.data as IntegrationClient, ...prev]);
      setSelectedClientPublicId(response.data.public_id);
      setClientSearchTerm('');
      setNewClient({ name: '', environment: 'live' });
      success(t('apiKeys.messages.integrationClientCreated'));
    } else {
      error(response.error || t('apiKeys.errors.createIntegrationClientFailed'));
    }

    setSavingClient(false);
  };

  const handleCreateBinding = async () => {
    if (!selectedClientPublicId || !bindingForm.agentPublicId || !bindingForm.externalTenantId) {
      return;
    }

    setSavingBinding(true);
    const response = await upsertIntegrationClientBinding(selectedClientPublicId, {
      agent_public_id: bindingForm.agentPublicId,
      external_tenant_id: bindingForm.externalTenantId.trim(),
      external_tenant_type: bindingForm.externalTenantType.trim() || undefined,
      status: 'active',
    });

    if (response.success) {
      success(t('apiKeys.messages.bindingSaved'));
      setBindingForm({ agentPublicId: '', externalTenantId: '', externalTenantType: 'salon' });
      await loadBindings(selectedClientPublicId);
      await loadClients();
    } else {
      error(response.error || t('apiKeys.errors.saveBindingFailed'));
    }

    setSavingBinding(false);
  };

  const handleProvisionAgent = async () => {
    if (!selectedClientPublicId || !provisionForm.externalTenantId) return;

    setProvisioningAgent(true);
    const response = await provisionIntegrationClientAgent(selectedClientPublicId, {
      external_tenant_id: provisionForm.externalTenantId.trim(),
      external_tenant_type: provisionForm.externalTenantType.trim() || undefined,
      template_agent_public_id: provisionForm.templateAgentPublicId || undefined,
      name: provisionForm.name.trim() || undefined,
      status: 'active',
    });

    if (response.success) {
      success(t('apiKeys.messages.tenantAgentProvisioned'));
      setProvisionForm({
        externalTenantId: '',
        externalTenantType: 'salon',
        templateAgentPublicId: '',
        name: '',
      });
      await loadBindings(selectedClientPublicId);
      await loadClients();
    } else {
      error(response.error || t('apiKeys.errors.provisionAgentFailed'));
    }

    setProvisioningAgent(false);
  };

  const handleBindingStatus = async (binding: ExternalAgentBinding, status: string) => {
    if (!selectedClientPublicId) return;

    const response = await updateIntegrationClientBinding(
      selectedClientPublicId,
      binding.public_id,
      {
        status,
      }
    );

    if (response.success) {
      success(t('apiKeys.messages.bindingUpdated'));
      await loadBindings(selectedClientPublicId);
    } else {
      error(response.error || t('apiKeys.errors.updateBindingFailed'));
    }
  };

  const totalBindings = clients.reduce((sum, client) => sum + (client.binding_count ?? 0), 0);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('apiKeys.integrationClients.title')}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t('apiKeys.integrationClients.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip
            size="small"
            icon={<Building2 size={14} />}
            label={t('apiKeys.integrationClients.clientCount', { count: clients.length })}
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<Users size={14} />}
            label={t('apiKeys.integrationClients.bindingCount', { count: totalBindings })}
            variant="outlined"
          />
          <Button
            type="button"
            size="small"
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => void loadClients()}
            disabled={loadingClients}
          >
            {t('apiKeys.integrationClients.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
        <TextField
          fullWidth
          size="small"
          label={t('apiKeys.integrationClients.clientName')}
          placeholder="NailMap Production"
          value={newClient.name}
          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
        />
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.modal.environment')}
          value={newClient.environment}
          onChange={(e) => setNewClient({ ...newClient, environment: e.target.value })}
        >
          <MenuItem value="live">live</MenuItem>
          <MenuItem value="test">test</MenuItem>
        </TextField>
        <Button
          type="button"
          variant="contained"
          startIcon={
            savingClient ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />
          }
          disabled={!newClient.name.trim() || savingClient}
          onClick={handleCreateClient}
        >
          {t('apiKeys.integrationClients.createClient')}
        </Button>
      </div>

      <Divider className="!my-4" />

      {loadingClients ? (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-500 dark:text-slate-400">
          <CircularProgress size={18} />
          {t('apiKeys.integrationClients.loading')}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-slate-600 dark:text-slate-400">
          {t('apiKeys.integrationClients.empty')}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-w-0">
            <TextField
              fullWidth
              size="small"
              label={t('apiKeys.integrationClients.searchClients')}
              placeholder={t('apiKeys.integrationClients.searchClientsPlaceholder')}
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
            />
            <div className="mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {filteredClients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-600 dark:text-slate-400">
                  {t('apiKeys.integrationClients.noClientResults')}
                </div>
              ) : (
                filteredClients.map((client) => {
                  const selected = client.public_id === selectedClientPublicId;
                  return (
                    <button
                      key={client.public_id}
                      type="button"
                      onClick={() => setSelectedClientPublicId(client.public_id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {client.name}
                          </div>
                          <div className="truncate font-mono text-xs text-gray-400 dark:text-slate-500">
                            {client.public_id}
                          </div>
                        </div>
                        <Chip
                          size="small"
                          label={client.status}
                          color={client.status === 'active' ? 'success' : 'default'}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Chip size="small" label={client.environment} variant="outlined" />
                        <Chip
                          size="small"
                          label={t('apiKeys.integrationClients.bindingCount', {
                            count: client.binding_count ?? 0,
                          })}
                          variant="outlined"
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0">
            {selectedClient && (
              <div className="mb-3 flex flex-col gap-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {selectedClient.name}
                </div>
                <div className="font-mono text-xs text-gray-400 dark:text-slate-500">
                  {selectedClient.public_id}
                </div>
              </div>
            )}

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                  <Link2 size={16} />
                  {t('apiKeys.integrationClients.bindExistingAgent')}
                </div>
                <div className="grid gap-2">
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t('apiKeys.modal.agentResource')}
                    value={bindingForm.agentPublicId}
                    onChange={(e) =>
                      setBindingForm({ ...bindingForm, agentPublicId: e.target.value })
                    }
                  >
                    <MenuItem value="">{t('apiKeys.modal.none')}</MenuItem>
                    {agents.map((agent) => (
                      <MenuItem key={agent.publicId} value={agent.publicId}>
                        {agent.name} · {agent.publicId}
                      </MenuItem>
                    ))}
                  </TextField>
                  <div className="grid gap-2 md:grid-cols-2">
                    <TextField
                      fullWidth
                      size="small"
                      label={t('apiKeys.integrationClients.externalTenantId')}
                      placeholder="salon_456"
                      value={bindingForm.externalTenantId}
                      onChange={(e) =>
                        setBindingForm({ ...bindingForm, externalTenantId: e.target.value })
                      }
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label={t('apiKeys.integrationClients.externalTenantType')}
                      value={bindingForm.externalTenantType}
                      onChange={(e) =>
                        setBindingForm({ ...bindingForm, externalTenantType: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={savingBinding ? <CircularProgress size={16} /> : <Link2 size={16} />}
                    disabled={
                      !selectedClientPublicId ||
                      !bindingForm.agentPublicId ||
                      !bindingForm.externalTenantId.trim() ||
                      savingBinding
                    }
                    onClick={handleCreateBinding}
                  >
                    {t('apiKeys.integrationClients.saveBinding')}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                  <Bot size={16} />
                  {t('apiKeys.integrationClients.provisionTenantAgent')}
                </div>
                <div className="grid gap-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <TextField
                      fullWidth
                      size="small"
                      label={t('apiKeys.integrationClients.externalTenantId')}
                      placeholder="salon_456"
                      value={provisionForm.externalTenantId}
                      onChange={(e) =>
                        setProvisionForm({ ...provisionForm, externalTenantId: e.target.value })
                      }
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label={t('apiKeys.integrationClients.externalTenantType')}
                      value={provisionForm.externalTenantType}
                      onChange={(e) =>
                        setProvisionForm({ ...provisionForm, externalTenantType: e.target.value })
                      }
                    />
                  </div>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('apiKeys.integrationClients.agentName')}
                    placeholder="NailMap Salon 456 Assistant"
                    value={provisionForm.name}
                    onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                  />
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t('apiKeys.integrationClients.templateAgent')}
                    value={provisionForm.templateAgentPublicId}
                    onChange={(e) =>
                      setProvisionForm({
                        ...provisionForm,
                        templateAgentPublicId: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="">{t('apiKeys.modal.none')}</MenuItem>
                    {agents.map((agent) => (
                      <MenuItem key={agent.publicId} value={agent.publicId}>
                        {agent.name} · {agent.publicId}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={
                      provisioningAgent ? <CircularProgress size={16} /> : <Bot size={16} />
                    }
                    disabled={
                      !selectedClientPublicId ||
                      !provisionForm.externalTenantId.trim() ||
                      provisioningAgent
                    }
                    onClick={handleProvisionAgent}
                  >
                    {t('apiKeys.integrationClients.provisionAgent')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {t('apiKeys.integrationClients.bindings')}
                </div>
                <Button
                  type="button"
                  size="small"
                  variant="text"
                  startIcon={<RefreshCw size={14} />}
                  disabled={!selectedClientPublicId || loadingBindings}
                  onClick={() => void loadBindings(selectedClientPublicId)}
                >
                  {t('apiKeys.integrationClients.refresh')}
                </Button>
              </div>

              {loadingBindings ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  <CircularProgress size={18} />
                  {t('apiKeys.integrationClients.loadingBindings')}
                </div>
              ) : bindings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-slate-600 dark:text-slate-400">
                  {t('apiKeys.integrationClients.noBindings')}
                </div>
              ) : (
                <TableContainer className="max-h-[360px] overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
                  <Table
                    stickyHeader
                    size="small"
                    sx={{
                      minWidth: 720,
                      '& .MuiTableCell-root': { color: 'inherit' },
                      '& .MuiTableCell-head': {
                        backgroundColor: 'rgb(249 250 251)',
                        color: 'rgb(107 114 128)',
                        fontSize: 12,
                        fontWeight: 700,
                      },
                      '.dark & .MuiTableCell-head': {
                        backgroundColor: 'rgb(15 23 42)',
                        color: 'rgb(148 163 184)',
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('apiKeys.integrationClients.tenant')}</TableCell>
                        <TableCell>{t('apiKeys.integrationClients.agent')}</TableCell>
                        <TableCell>{t('apiKeys.integrationClients.usage')}</TableCell>
                        <TableCell>{t('apiKeys.integrationClients.status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bindings.map((binding) => (
                        <TableRow key={binding.public_id} hover>
                          <TableCell>
                            <div className="min-w-[180px]">
                              <div className="truncate text-xs font-semibold text-gray-800 dark:text-slate-200">
                                {binding.external_tenant_id}
                              </div>
                              <div className="truncate text-xs text-gray-400 dark:text-slate-500">
                                {binding.external_tenant_type || 'tenant'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[220px]">
                              <div className="truncate text-xs text-gray-700 dark:text-slate-300">
                                {binding.agent_name}
                              </div>
                              <div className="truncate font-mono text-xs text-gray-400 dark:text-slate-500">
                                {binding.agent_public_id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="min-w-[110px] text-xs text-gray-600 dark:text-slate-300">
                              {(binding.usage?.messages ?? 0).toLocaleString()} msg
                              <br />
                              {(binding.usage?.total_tokens ?? 0).toLocaleString()} tok
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-[150px] items-center gap-2">
                              <Chip
                                size="small"
                                label={binding.status}
                                color={binding.status === 'active' ? 'success' : 'default'}
                              />
                              {binding.status === 'active' ? (
                                <Button
                                  type="button"
                                  size="small"
                                  variant="text"
                                  onClick={() => void handleBindingStatus(binding, 'disabled')}
                                >
                                  {t('apiKeys.integrationClients.disable')}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="small"
                                  variant="text"
                                  onClick={() => void handleBindingStatus(binding, 'active')}
                                >
                                  {t('apiKeys.integrationClients.enable')}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ============================================
// Third-Party Usage Panel
// ============================================

const THIRD_PARTY_USAGE_GROUPS: ThirdPartyUsageGroupBy[] = [
  'external_tenant',
  'agent',
  'day',
  'api_key',
  'capability',
  'tool',
];

const API_KEY_USAGE_GROUPS: ApiKeyUsageGroupBy[] = ['api_key', 'capability', 'agent', 'day'];

function defaultUsageFromDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultUsageToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function usageRowLabel(row: ThirdPartyUsageRow, groupBy: ThirdPartyUsageGroupBy): string {
  if (groupBy === 'agent') return row.agent_public_id || 'unknown-agent';
  if (groupBy === 'day') return row.day || 'unknown-day';
  if (groupBy === 'api_key') return row.api_key_id ? `API key #${row.api_key_id}` : 'unknown-key';
  if (groupBy === 'capability') return row.capability || 'unknown-capability';
  if (groupBy === 'tool') return row.tool_id || 'unknown-tool';
  return row.external_tenant_id || row.client_id || 'unknown-tenant';
}

function apiKeyUsageRowLabel(row: ApiKeyUsageRow, groupBy: ApiKeyUsageGroupBy): string {
  if (groupBy === 'agent') return row.agent_public_id || 'owner-level';
  if (groupBy === 'day') return row.day || 'unknown-day';
  if (groupBy === 'capability') return row.capability || 'unknown-capability';
  return row.api_key_public_id || (row.api_key_id ? `API key #${row.api_key_id}` : 'unknown-key');
}

const PersonalApiKeyUsagePanel: React.FC<{ apiKeys: ApiKey[] }> = ({ apiKeys }) => {
  const { t } = useTranslation();
  const { error } = useNotification();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rows, setRows] = useState<ApiKeyUsageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<ApiKeyUsageGroupBy>('api_key');
  const [from, setFrom] = useState(defaultUsageFromDate);
  const [to, setTo] = useState(defaultUsageToDate);
  const [apiKeyPublicId, setApiKeyPublicId] = useState('');
  const [agentPublicId, setAgentPublicId] = useState('');
  const [capability, setCapability] = useState('');

  const totals = rows.reduce(
    (sum, row) => ({
      requests: sum.requests + row.requests,
      usageUnits: sum.usageUnits + row.usage_units,
      chargedCredits: sum.chargedCredits + row.charged_credits,
    }),
    { requests: 0, usageUnits: 0, chargedCredits: 0 }
  );

  const loadFilterResources = async () => {
    setFiltersLoading(true);
    const agentsRes = await listAgents();
    if (agentsRes.success && agentsRes.data) {
      setAgents(agentsRes.data);
    }
    setFiltersLoading(false);
  };

  const loadUsage = async () => {
    setLoading(true);

    try {
      const response = await getApiKeyUsage({
        groupBy,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        apiKeyPublicId: apiKeyPublicId || undefined,
        agentPublicId: agentPublicId || undefined,
        capability: capability.trim() || undefined,
      });
      setRows(response.data ?? []);
    } catch (err) {
      setRows([]);
      error(err instanceof Error ? err.message : t('apiKeys.errors.loadUsageFailed'));
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadFilterResources();
  }, []);

  useEffect(() => {
    void loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, from, to, apiKeyPublicId, agentPublicId]);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('apiKeys.usage.personalTitle')}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t('apiKeys.usage.personalSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <UsageStat label={t('apiKeys.usage.requests')} value={totals.requests} />
          <UsageStat label={t('apiKeys.usage.usageUnits')} value={totals.usageUnits} />
          <UsageStat label={t('apiKeys.usage.chargedCredits')} value={totals.chargedCredits} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[150px_150px_180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <TextField
          fullWidth
          size="small"
          type="date"
          label={t('apiKeys.usage.from')}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          size="small"
          type="date"
          label={t('apiKeys.usage.to')}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.usage.groupBy')}
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as ApiKeyUsageGroupBy)}
        >
          {API_KEY_USAGE_GROUPS.map((group) => (
            <MenuItem key={group} value={group}>
              {t(`apiKeys.usage.groups.${group}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.usage.apiKey')}
          value={apiKeyPublicId}
          onChange={(e) => setApiKeyPublicId(e.target.value)}
        >
          <MenuItem value="">{t('apiKeys.usage.allApiKeys')}</MenuItem>
          {apiKeys.map((apiKey) => (
            <MenuItem key={apiKey.publicId} value={apiKey.publicId}>
              {displayName(apiKey)} · {apiKey.publicId}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.modal.agentResource')}
          value={agentPublicId}
          onChange={(e) => setAgentPublicId(e.target.value)}
          disabled={filtersLoading}
        >
          <MenuItem value="">{t('apiKeys.usage.allAgents')}</MenuItem>
          {agents.map((agent) => (
            <MenuItem key={agent.publicId} value={agent.publicId}>
              {agent.name} · {agent.publicId}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          size="small"
          label={t('apiKeys.usage.capability')}
          placeholder="text_to_image"
          value={capability}
          onChange={(e) => setCapability(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void loadUsage();
            }
          }}
        />
        <Button
          type="button"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
          onClick={() => void loadUsage()}
          disabled={loading}
        >
          {t('apiKeys.usage.apply')}
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_130px_150px] bg-gray-50 text-xs font-semibold text-gray-500 dark:bg-slate-900 dark:text-slate-400">
          <div className="p-2">{t('apiKeys.usage.group')}</div>
          <div className="p-2">{t('apiKeys.usage.context')}</div>
          <div className="p-2">{t('apiKeys.usage.requests')}</div>
          <div className="p-2">{t('apiKeys.usage.usageUnits')}</div>
          <div className="p-2">{t('apiKeys.usage.chargedCredits')}</div>
          <div className="p-2">{t('apiKeys.usage.latestUsed')}</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
            <CircularProgress size={18} />
            {t('apiKeys.usage.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
            {t('apiKeys.usage.personalEmpty')}
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${apiKeyUsageRowLabel(row, groupBy)}-${index}`}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_110px_120px_130px_150px] border-t border-gray-100 text-xs dark:border-slate-700"
            >
              <div className="min-w-0 p-2">
                <div className="truncate font-semibold text-gray-800 dark:text-slate-200">
                  {apiKeyUsageRowLabel(row, groupBy)}
                </div>
                <div className="truncate text-gray-400 dark:text-slate-500">
                  {row.latest_request_id || groupBy}
                </div>
              </div>
              <div className="min-w-0 p-2 text-gray-500 dark:text-slate-400">
                <div className="truncate">{row.capability || 'capability:-'}</div>
                <div className="truncate">{row.agent_public_id || 'agent:-'}</div>
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.requests.toLocaleString()}
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.usage_units.toLocaleString()}
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.charged_credits.toLocaleString()}
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.latest_used_at ? formatDate(row.latest_used_at, 'en-US') : '—'}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

const ThirdPartyUsagePanel: React.FC = () => {
  const { t } = useTranslation();
  const { error } = useNotification();
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rows, setRows] = useState<ThirdPartyUsageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<ThirdPartyUsageGroupBy>('external_tenant');
  const [from, setFrom] = useState(defaultUsageFromDate);
  const [to, setTo] = useState(defaultUsageToDate);
  const [clientId, setClientId] = useState('');
  const [agentPublicId, setAgentPublicId] = useState('');
  const [externalTenantId, setExternalTenantId] = useState('');

  const totals = rows.reduce(
    (sum, row) => ({
      messages: sum.messages + row.messages,
      tokens: sum.tokens + row.total_tokens,
      credits: sum.credits + row.cost_credits,
      toolCalls: sum.toolCalls + row.tool_calls,
    }),
    { messages: 0, tokens: 0, credits: 0, toolCalls: 0 }
  );

  const loadFilterResources = async () => {
    setFiltersLoading(true);
    const [clientsRes, agentsRes] = await Promise.all([listIntegrationClients(), listAgents()]);

    if (clientsRes.success && clientsRes.data) {
      setClients(clientsRes.data);
    }

    if (agentsRes.success && agentsRes.data) {
      setAgents(agentsRes.data);
    }

    setFiltersLoading(false);
  };

  const loadUsage = async () => {
    setLoading(true);

    try {
      const response = await getThirdPartyUsage({
        groupBy,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        clientId: clientId || undefined,
        agentPublicId: agentPublicId || undefined,
        externalTenantId: externalTenantId.trim() || undefined,
      });
      setRows(response.data ?? []);
    } catch (err) {
      setRows([]);
      error(err instanceof Error ? err.message : t('apiKeys.errors.loadUsageFailed'));
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadFilterResources();
  }, []);

  useEffect(() => {
    void loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, from, to, clientId, agentPublicId]);

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('apiKeys.usage.title')}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t('apiKeys.usage.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <UsageStat label={t('apiKeys.usage.messages')} value={totals.messages} />
          <UsageStat label={t('apiKeys.usage.tokens')} value={totals.tokens} />
          <UsageStat label={t('apiKeys.usage.credits')} value={totals.credits} />
          <UsageStat label={t('apiKeys.usage.toolCalls')} value={totals.toolCalls} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[150px_150px_180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <TextField
          fullWidth
          size="small"
          type="date"
          label={t('apiKeys.usage.from')}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          size="small"
          type="date"
          label={t('apiKeys.usage.to')}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.usage.groupBy')}
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as ThirdPartyUsageGroupBy)}
        >
          {THIRD_PARTY_USAGE_GROUPS.map((group) => (
            <MenuItem key={group} value={group}>
              {t(`apiKeys.usage.groups.${group}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.modal.integrationClientResource')}
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={filtersLoading}
        >
          <MenuItem value="">{t('apiKeys.usage.allClients')}</MenuItem>
          {clients.map((client) => (
            <MenuItem key={client.public_id} value={client.public_id}>
              {client.name} · {client.public_id}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label={t('apiKeys.modal.agentResource')}
          value={agentPublicId}
          onChange={(e) => setAgentPublicId(e.target.value)}
          disabled={filtersLoading}
        >
          <MenuItem value="">{t('apiKeys.usage.allAgents')}</MenuItem>
          {agents.map((agent) => (
            <MenuItem key={agent.publicId} value={agent.publicId}>
              {agent.name} · {agent.publicId}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          size="small"
          label={t('apiKeys.usage.externalTenantId')}
          placeholder="salon_456"
          value={externalTenantId}
          onChange={(e) => setExternalTenantId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void loadUsage();
            }
          }}
        />
        <Button
          type="button"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
          onClick={() => void loadUsage()}
          disabled={loading}
        >
          {t('apiKeys.usage.apply')}
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_110px_120px_120px_110px] bg-gray-50 text-xs font-semibold text-gray-500 dark:bg-slate-900 dark:text-slate-400">
          <div className="p-2">{t('apiKeys.usage.group')}</div>
          <div className="p-2">{t('apiKeys.usage.context')}</div>
          <div className="p-2">{t('apiKeys.usage.messages')}</div>
          <div className="p-2">{t('apiKeys.usage.tokens')}</div>
          <div className="p-2">{t('apiKeys.usage.credits')}</div>
          <div className="p-2">{t('apiKeys.usage.toolCalls')}</div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
            <CircularProgress size={18} />
            {t('apiKeys.usage.loading')}
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
            {t('apiKeys.usage.empty')}
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={`${usageRowLabel(row, groupBy)}-${index}`}
              className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_110px_120px_120px_110px] border-t border-gray-100 text-xs dark:border-slate-700"
            >
              <div className="min-w-0 p-2">
                <div className="truncate font-semibold text-gray-800 dark:text-slate-200">
                  {usageRowLabel(row, groupBy)}
                </div>
                <div className="truncate text-gray-400 dark:text-slate-500">
                  {row.external_tenant_type || groupBy}
                </div>
              </div>
              <div className="min-w-0 p-2 text-gray-500 dark:text-slate-400">
                <div className="truncate">{row.client_id || 'client:-'}</div>
                <div className="truncate">{row.agent_public_id || 'agent:-'}</div>
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.messages.toLocaleString()}
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.total_tokens.toLocaleString()}
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.cost_credits.toLocaleString()}
              </div>
              <div className="p-2 text-gray-700 dark:text-slate-300">
                {row.tool_calls.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

const UsageStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 px-3 py-2 text-right dark:border-slate-700">
    <div className="text-xs text-gray-400 dark:text-slate-500">{label}</div>
    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
      {value.toLocaleString()}
    </div>
  </div>
);

// ============================================
// Create API Key Modal
// ============================================

interface CreateApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: CreateApiKeyResponse) => void;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { success, error } = useNotification();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [integrationClients, setIntegrationClients] = useState<IntegrationClient[]>([]);
  const [knowledges, setKnowledges] = useState<Knowledge[]>([]);
  const [scopeCatalog, setScopeCatalog] = useState<ApiScopeCatalogItem[]>([]);
  const [selectedCatalogScopes, setSelectedCatalogScopes] = useState<string[]>([]);
  const [selectedScopeRestrictions, setSelectedScopeRestrictions] = useState<
    Record<string, ApiKeyApiScopeInput>
  >({});
  const [scopeSearchTerm, setScopeSearchTerm] = useState('');
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Optional metadata
  const [metadata, setMetadata] = useState({
    appName: '',
    environment: '',
    description: '',
  });
  const [selectedUseCase, setSelectedUseCase] = useState<ApiKeyUseCaseId>('selectedScopes');
  const [selectedAgentPublicId, setSelectedAgentPublicId] = useState('');
  const [selectedIntegrationClientPublicId, setSelectedIntegrationClientPublicId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [rateLimit, setRateLimit] = useState({
    requestsPerMinute: '',
    requestsPerDay: '',
  });
  const [showAdvancedScopes, setShowAdvancedScopes] = useState(false);
  const [advancedScopesJson, setAdvancedScopesJson] = useState('');
  const [newClient, setNewClient] = useState({ name: '', environment: 'live' });
  const [creatingClient, setCreatingClient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedUseCaseConfig = API_KEY_USE_CASES.find((item) => item.id === selectedUseCase);
  const selectedAgent = agents.find((agent) => agent.publicId === selectedAgentPublicId);
  const selectedIntegrationClient = integrationClients.find(
    (client) => client.public_id === selectedIntegrationClientPublicId
  );

  const presetScopes: ApiKeyApiScopeInput[] =
    selectedUseCase === 'selectedScopes'
      ? selectedCatalogScopes.map((scope) => selectedScopeRestrictions[scope] ?? { scope })
      : selectedUseCase === 'chatWithOneAgent'
        ? selectedAgentPublicId
          ? API_KEY_SCOPE_PRESETS.chatWithOneAgent(selectedAgentPublicId)
          : []
        : selectedIntegrationClientPublicId
          ? API_KEY_SCOPE_PRESETS[selectedUseCase](selectedIntegrationClientPublicId)
          : [];

  const hasAdvancedScopes = advancedScopesJson.trim().length > 0;
  const canSubmit =
    (presetScopes.length > 0 || (showAdvancedScopes && hasAdvancedScopes)) &&
    !submitting &&
    !resourcesLoading;
  const needsIntegrationClient =
    selectedUseCase === 'thirdPartyRuntime' || selectedUseCase === 'thirdPartyProvisioning';
  const needsAgent = selectedUseCase === 'chatWithOneAgent';
  const resourceName =
    selectedUseCase === 'chatWithOneAgent' ? selectedAgent?.name : selectedIntegrationClient?.name;
  const normalizedScopeSearchTerm = scopeSearchTerm.trim().toLowerCase();
  const filteredScopeCatalog = normalizedScopeSearchTerm
    ? scopeCatalog.filter((item) =>
        [
          item.scope,
          item.name,
          item.description,
          item.resourceType,
          item.action,
          item.capabilityCode,
          ...(item.aliases ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedScopeSearchTerm))
      )
    : scopeCatalog;
  const catalogByResource = filteredScopeCatalog.reduce<Record<string, ApiScopeCatalogItem[]>>(
    (groups, item) => {
      const key = item.resourceType || 'other';
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    },
    {}
  );
  const orderedCatalogGroups = Object.entries(catalogByResource).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const toggleCatalogScope = (scope: string) => {
    setSelectedCatalogScopes((prev) => {
      if (!prev.includes(scope)) return [...prev, scope];

      setSelectedScopeRestrictions((current) => {
        const next = { ...current };
        delete next[scope];
        return next;
      });
      return prev.filter((item) => item !== scope);
    });
  };

  const restrictionTypeForScope = (
    item: ApiScopeCatalogItem
  ): 'agent' | 'knowledge' | undefined => {
    const [resourceType] = item.resourceRestrictionTypes;
    return resourceType === 'agent' || resourceType === 'knowledge' ? resourceType : undefined;
  };

  const setScopeRestriction = (
    scope: string,
    resourceType: 'agent' | 'knowledge',
    resourcePublicId: string
  ) => {
    setSelectedScopeRestrictions((prev) => {
      const next = { ...prev };

      if (!resourcePublicId) {
        delete next[scope];
        return next;
      }

      next[scope] = {
        scope,
        resourceType,
        resourcePublicId,
      };
      return next;
    });
  };

  // Load selectable resources when modal opens.
  useEffect(() => {
    if (!open) return;
    setResourcesLoading(true);
    Promise.all([
      listAgents(),
      listIntegrationClients(),
      listApiScopeCatalog(),
      listKnowledge('user'),
    ]).then(([agentsRes, clientsRes, scopeCatalogRes, knowledgeRes]) => {
      if (agentsRes.success && agentsRes.data) {
        setAgents(agentsRes.data);
      } else {
        error(agentsRes.error || 'Failed to load agents');
      }

      if (clientsRes.success && clientsRes.data) {
        setIntegrationClients(clientsRes.data);
      } else {
        error(clientsRes.error || 'Failed to load integration clients');
      }

      if (scopeCatalogRes.success && scopeCatalogRes.data) {
        setScopeCatalog(scopeCatalogRes.data);
      } else {
        error(scopeCatalogRes.error || 'Failed to load API scope catalog');
      }

      if (knowledgeRes.success && knowledgeRes.data) {
        setKnowledges(knowledgeRes.data);
      } else {
        error(knowledgeRes.error || 'Failed to load knowledge');
      }

      setResourcesLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setAdvancedScopesJson(presetScopes.length > 0 ? JSON.stringify(presetScopes, null, 2) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedUseCase,
    selectedAgentPublicId,
    selectedIntegrationClientPublicId,
    selectedCatalogScopes,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    let apiScopesInput = presetScopes;

    if (showAdvancedScopes && hasAdvancedScopes) {
      try {
        const parsed = JSON.parse(advancedScopesJson) as unknown;
        if (!Array.isArray(parsed)) {
          throw new Error('Advanced scopes must be a JSON array');
        }
        apiScopesInput = parsed as ApiKeyApiScopeInput[];
      } catch (err) {
        error(err instanceof Error ? err.message : 'Invalid advanced scopes JSON');
        setSubmitting(false);
        return;
      }
    }

    const cleanMeta: CreateApiKeyInput['metadata'] = {};
    if (metadata.appName.trim()) cleanMeta.appName = metadata.appName.trim();
    if (metadata.environment.trim()) cleanMeta.environment = metadata.environment.trim();
    if (metadata.description.trim()) cleanMeta.description = metadata.description.trim();

    const requestsPerMinute = Number(rateLimit.requestsPerMinute);
    const requestsPerDay = Number(rateLimit.requestsPerDay);
    const cleanRateLimit: NonNullable<CreateApiKeyInput['rateLimit']> = {};
    if (Number.isFinite(requestsPerMinute) && requestsPerMinute > 0) {
      cleanRateLimit.requestsPerMinute = requestsPerMinute;
    }
    if (Number.isFinite(requestsPerDay) && requestsPerDay > 0) {
      cleanRateLimit.requestsPerDay = requestsPerDay;
    }

    const input: CreateApiKeyInput = {
      scopes: apiScopesInput,
      ...(Object.keys(cleanMeta).length > 0 && { metadata: cleanMeta }),
      ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
      ...(Object.keys(cleanRateLimit).length > 0 && { rateLimit: cleanRateLimit }),
    };

    const response = await createApiKey(input);

    if (response.success && response.data?.apiKey) {
      onSuccess(enrichCreatedApiKeyScopes(response.data, apiScopesInput));
      resetForm();
    } else {
      error(response.error || t('apiKeys.errors.createFailed'));
    }

    setSubmitting(false);
  };

  const handleCreateIntegrationClient = async () => {
    const name = newClient.name.trim();
    if (!name || creatingClient) return;

    setCreatingClient(true);
    const response = await createIntegrationClient({
      name,
      environment: newClient.environment,
      status: 'active',
    });

    if (response.success && response.data) {
      setIntegrationClients((prev) => [response.data as IntegrationClient, ...prev]);
      setSelectedIntegrationClientPublicId(response.data.public_id);
      setNewClient({ name: '', environment: 'live' });
      success(t('apiKeys.messages.integrationClientCreated'));
    } else {
      error(response.error || t('apiKeys.errors.createIntegrationClientFailed'));
    }
    setCreatingClient(false);
  };

  const resetForm = () => {
    setMetadata({ appName: '', environment: '', description: '' });
    setSelectedUseCase('selectedScopes');
    setSelectedAgentPublicId('');
    setSelectedIntegrationClientPublicId('');
    setSelectedCatalogScopes([]);
    setSelectedScopeRestrictions({});
    setScopeSearchTerm('');
    setExpiresAt('');
    setRateLimit({ requestsPerMinute: '', requestsPerDay: '' });
    setShowAdvancedScopes(false);
    setAdvancedScopesJson('');
    setNewClient({ name: '', environment: 'live' });
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('apiKeys.modal.createTitle')}</DialogTitle>
        <DialogContent className="space-y-6 !pt-3">
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              {t('apiKeys.modal.useCase', { defaultValue: 'Use case' })}{' '}
              <span className="text-red-500">*</span>
            </p>
            <p className="mb-2 text-xs leading-5 text-gray-500 dark:text-slate-400">
              {t('apiKeys.modal.useCaseHelper', {
                defaultValue:
                  'Choose a preset flow. Selected scopes is best for personal service-level API keys.',
              })}
            </p>

            {resourcesLoading ? (
              <div className="flex items-center gap-2 py-4">
                <CircularProgress size={18} />
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {t('apiKeys.modal.loadingResources', { defaultValue: 'Loading resources...' })}
                </span>
              </div>
            ) : (
              <TextField
                select
                fullWidth
                value={selectedUseCase}
                onChange={(event) => setSelectedUseCase(event.target.value as ApiKeyUseCaseId)}
                size="small"
                SelectProps={{
                  renderValue: (value) => {
                    const useCase = API_KEY_USE_CASES.find((item) => item.id === value);
                    return useCase
                      ? t(`apiKeys.modal.presets.${useCase.id}`, {
                          defaultValue: useCase.title,
                        })
                      : '';
                  },
                }}
                helperText={
                  selectedUseCaseConfig
                    ? t(selectedUseCaseConfig.descriptionKey, {
                        defaultValue: selectedUseCaseConfig.description,
                      })
                    : undefined
                }
              >
                {API_KEY_USE_CASES.map((useCase) => (
                  <MenuItem key={useCase.id} value={useCase.id}>
                    <div className="min-w-0 py-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                        {t(`apiKeys.modal.presets.${useCase.id}`, {
                          defaultValue: useCase.title,
                        })}
                      </p>
                      <p className="mt-0.5 whitespace-normal text-xs leading-4 text-gray-500 dark:text-slate-400">
                        {t(useCase.descriptionKey, {
                          defaultValue: useCase.description,
                        })}
                      </p>
                    </div>
                  </MenuItem>
                ))}
              </TextField>
            )}
          </div>

          {selectedUseCaseConfig?.resourceRequired && (
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
                {t(selectedUseCaseConfig.resourceLabelKey, {
                  defaultValue: selectedUseCaseConfig.resourceLabel,
                })}{' '}
                <span className="text-red-500">*</span>
              </p>

              {needsIntegrationClient ? (
                <div className="space-y-3">
                  <TextField
                    select
                    fullWidth
                    label={t('apiKeys.modal.integrationClientResource')}
                    value={selectedIntegrationClientPublicId}
                    onChange={(e) => setSelectedIntegrationClientPublicId(e.target.value)}
                    size="small"
                    helperText={
                      integrationClients.length === 0
                        ? t('apiKeys.modal.noIntegrationClientsHelper')
                        : t('apiKeys.modal.integrationClientHelper')
                    }
                  >
                    <MenuItem value="">{t('apiKeys.modal.none')}</MenuItem>
                    {integrationClients.map((client) => (
                      <MenuItem key={client.public_id} value={client.public_id}>
                        {client.name} · {client.environment} · {client.public_id}
                      </MenuItem>
                    ))}
                  </TextField>

                  <div className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                      {t('apiKeys.modal.createIntegrationClient')}
                    </p>
                    <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
                      <TextField
                        fullWidth
                        label={t('apiKeys.modal.clientName')}
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        size="small"
                        placeholder="NailMap Production"
                      />
                      <TextField
                        select
                        fullWidth
                        label={t('apiKeys.modal.environment')}
                        value={newClient.environment}
                        onChange={(e) =>
                          setNewClient({ ...newClient, environment: e.target.value })
                        }
                        size="small"
                      >
                        <MenuItem value="live">live</MenuItem>
                        <MenuItem value="test">test</MenuItem>
                      </TextField>
                      <Button
                        type="button"
                        variant="outlined"
                        disabled={!newClient.name.trim() || creatingClient}
                        onClick={handleCreateIntegrationClient}
                        startIcon={
                          creatingClient ? <CircularProgress size={16} /> : <Plus size={16} />
                        }
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              ) : needsAgent ? (
                <TextField
                  select
                  fullWidth
                  label={t('apiKeys.modal.agentResource')}
                  value={selectedAgentPublicId}
                  onChange={(e) => setSelectedAgentPublicId(e.target.value)}
                  size="small"
                  helperText={
                    agents.length === 0
                      ? t('apiKeys.modal.noAgentsHelper')
                      : t('apiKeys.modal.agentHelper')
                  }
                >
                  <MenuItem value="">{t('apiKeys.modal.none')}</MenuItem>
                  {agents.map((agent) => (
                    <MenuItem key={agent.publicId} value={agent.publicId}>
                      {agent.name} · {agent.status || 'draft'} · {agent.publicId}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
            </div>
          )}

          {selectedUseCase === 'selectedScopes' && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                    {t('apiKeys.modal.resourceScopes')}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                    {t('apiKeys.modal.resourceScopesHelper')}
                  </p>
                </div>
                <Chip
                  size="small"
                  label={t('apiKeys.modal.scopeCount', { count: selectedCatalogScopes.length })}
                  color={selectedCatalogScopes.length > 0 ? 'primary' : 'default'}
                  variant="outlined"
                />
              </div>

              <TextField
                fullWidth
                value={scopeSearchTerm}
                onChange={(event) => setScopeSearchTerm(event.target.value)}
                size="small"
                placeholder={t('apiKeys.modal.searchScopes', {
                  defaultValue: 'Search scopes, capabilities, actions...',
                })}
                InputProps={{
                  startAdornment: <Search size={16} className="mr-2 text-gray-400" />,
                }}
                className="!mb-3"
              />

              <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700">
                {orderedCatalogGroups.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 dark:text-slate-400">
                    {scopeCatalog.length === 0
                      ? t('apiKeys.modal.loadingResources', {
                          defaultValue: 'Loading resources...',
                        })
                      : t('apiKeys.modal.noScopesFound', {
                          defaultValue: 'No scopes match your search.',
                        })}
                  </div>
                ) : (
                  orderedCatalogGroups.map(([resourceType, scopes]) => (
                    <div
                      key={resourceType}
                      className="border-t border-gray-100 first:border-t-0 dark:border-slate-700"
                    >
                      <div className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                        {resourceType.replace(/_/g, ' ')}
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {scopes.map((item) => {
                          const isSelected = selectedCatalogScopes.includes(item.scope);
                          const restrictionType = restrictionTypeForScope(item);
                          const restriction = selectedScopeRestrictions[item.scope];
                          const restrictionOptions =
                            restrictionType === 'agent'
                              ? agents.map((agent) => ({
                                  value: agent.publicId,
                                  label: `${agent.name} · ${agent.status || 'draft'} · ${
                                    agent.publicId
                                  }`,
                                }))
                              : restrictionType === 'knowledge'
                                ? knowledges.map((knowledge) => ({
                                    value: knowledge.publicId,
                                    label: `${knowledge.name} · ${knowledge.publicId}`,
                                  }))
                                : [];

                          return (
                            <div
                              key={item.scope}
                              className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleCatalogScope(item.scope)}
                                size="small"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-gray-900 dark:text-slate-100">
                                  {item.name}
                                </span>
                                <code className="block break-words text-xs text-blue-700 dark:text-blue-300">
                                  {item.scope}
                                </code>
                                <span className="block text-xs text-gray-500 dark:text-slate-400">
                                  {item.description}
                                </span>
                                {isSelected && restrictionType && (
                                  <TextField
                                    select
                                    fullWidth
                                    value={restriction?.resourcePublicId ?? ''}
                                    onChange={(event) =>
                                      setScopeRestriction(
                                        item.scope,
                                        restrictionType,
                                        event.target.value
                                      )
                                    }
                                    size="small"
                                    margin="dense"
                                    label={t('apiKeys.modal.restrictToResource', {
                                      defaultValue: `Restrict to ${restrictionType}`,
                                    })}
                                    helperText={t('apiKeys.modal.ownerLevelScopeHelper', {
                                      defaultValue:
                                        'Leave empty to allow all owned resources for this scope.',
                                    })}
                                  >
                                    <MenuItem value="">
                                      {t('apiKeys.modal.allOwnedResources', {
                                        defaultValue: 'All owned resources',
                                      })}
                                    </MenuItem>
                                    {restrictionOptions.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                )}
                              </span>
                              {item.source === 'capability' && (
                                <Chip size="small" variant="outlined" label="capability" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              {t('apiKeys.modal.metadata')}{' '}
              <span className="font-normal text-gray-400">{t('apiKeys.modal.optional')}</span>
            </p>

            <TextField
              fullWidth
              label={t('apiKeys.modal.appName')}
              value={metadata.appName}
              onChange={(e) => setMetadata({ ...metadata, appName: e.target.value })}
              size="small"
              margin="dense"
              placeholder={t('apiKeys.modal.appNamePlaceholder')}
            />
            <TextField
              fullWidth
              label={t('apiKeys.modal.environment')}
              value={metadata.environment}
              onChange={(e) => setMetadata({ ...metadata, environment: e.target.value })}
              size="small"
              margin="dense"
              placeholder={t('apiKeys.modal.environmentPlaceholder')}
            />
            <TextField
              fullWidth
              label={t('apiKeys.modal.description')}
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              size="small"
              margin="dense"
              multiline
              rows={2}
              placeholder={t('apiKeys.modal.descriptionPlaceholder')}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              {t('apiKeys.modal.keyPolicy')}{' '}
              <span className="font-normal text-gray-400">{t('apiKeys.modal.optional')}</span>
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <TextField
                fullWidth
                label={t('apiKeys.modal.expiresAt')}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                type="datetime-local"
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label={t('apiKeys.modal.rateLimitMinute')}
                value={rateLimit.requestsPerMinute}
                onChange={(e) => setRateLimit({ ...rateLimit, requestsPerMinute: e.target.value })}
                type="number"
                size="small"
                inputProps={{ min: 1 }}
              />
              <TextField
                fullWidth
                label={t('apiKeys.modal.rateLimitDay')}
                value={rateLimit.requestsPerDay}
                onChange={(e) => setRateLimit({ ...rateLimit, requestsPerDay: e.target.value })}
                type="number"
                size="small"
                inputProps={{ min: 1 }}
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {t('apiKeys.modal.resourceScopes')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                  {resourceName
                    ? t('apiKeys.modal.generatedPolicyFor', { name: resourceName })
                    : selectedUseCase === 'selectedScopes'
                      ? t('apiKeys.modal.resourceScopesHelper')
                      : t('apiKeys.modal.selectResourceForPolicy')}
                </p>
              </div>
              <Chip
                size="small"
                label={t('apiKeys.modal.scopeCount', { count: presetScopes.length })}
                color={presetScopes.length > 0 ? 'primary' : 'default'}
                variant="outlined"
              />
            </div>

            {presetScopes.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                {selectedUseCase === 'selectedScopes'
                  ? t('apiKeys.modal.selectScopesToContinue', {
                      defaultValue: 'Select at least one API scope to continue.',
                    })
                  : needsIntegrationClient
                    ? t('apiKeys.modal.selectIntegrationClientToContinue')
                    : t('apiKeys.modal.selectAgentToContinue')}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)] bg-gray-50 text-xs font-semibold text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                  <div className="p-2">{t('apiKeys.modal.scopeColumn')}</div>
                  <div className="p-2">{t('apiKeys.modal.resourceColumn')}</div>
                  <div className="p-2">{t('apiKeys.modal.meaningColumn')}</div>
                </div>
                {presetScopes.map((scope) => (
                  <div
                    key={`${scope.scope}:${scope.resourceType ?? ''}:${scope.resourcePublicId ?? ''}`}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)] border-t border-gray-100 text-xs dark:border-slate-700"
                  >
                    <code className="min-w-0 break-words p-2 text-blue-700 dark:text-blue-300">
                      {scope.scope}
                    </code>
                    <div className="min-w-0 break-words p-2 text-gray-600 dark:text-slate-300">
                      {scope.resourceType
                        ? `${scope.resourceType}:${scope.resourcePublicId ?? '*'}`
                        : t('apiKeys.modal.allOwnedResources', {
                            defaultValue: 'All owned resources',
                          })}
                    </div>
                    <div className="p-2 text-gray-500 dark:text-slate-400">
                      {t(
                        API_SCOPE_DESCRIPTION_KEYS[scope.scope] || 'apiKeys.modal.customApiScope',
                        {
                          defaultValue:
                            scopeCatalog.find((item) => item.scope === scope.scope)?.description ||
                            API_SCOPE_DESCRIPTIONS[scope.scope] ||
                            'Custom API scope.',
                        }
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Divider className="!my-3" />
            <FormControlLabel
              control={
                <Checkbox
                  checked={showAdvancedScopes}
                  onChange={(e) => setShowAdvancedScopes(e.target.checked)}
                  size="small"
                />
              }
              label={
                <span className="text-sm text-gray-700 dark:text-slate-300">
                  {t('apiKeys.modal.advancedScopes', {
                    defaultValue: 'Advanced: edit generated scopes JSON',
                  })}
                </span>
              }
            />
            <Collapse in={showAdvancedScopes}>
              <TextField
                fullWidth
                value={advancedScopesJson}
                onChange={(e) => setAdvancedScopesJson(e.target.value)}
                size="small"
                multiline
                rows={6}
                placeholder='[{"scope":"agents:execute","resourceType":"agent","resourcePublicId":"agt_..."}]'
                helperText={t('apiKeys.modal.resourceScopesHelper')}
              />
            </Collapse>
          </div>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            {t('apiKeys.modal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            startIcon={
              submitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ShieldCheck size={16} />
              )
            }
          >
            {submitting ? t('apiKeys.modal.creating') : t('apiKeys.modal.createKey')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ============================================
// One-Time Key Display Modal
// SECURITY: Raw API key shown ONLY ONCE — never stored
// ============================================

interface OneTimeKeyModalProps {
  open: boolean;
  data: CreateApiKeyResponse | null;
  onClose: () => void;
  onCopy: (key: string) => void;
}

const OneTimeKeyModal: React.FC<OneTimeKeyModalProps> = ({ open, data, onClose, onCopy }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [copiedCurlExampleKey, setCopiedCurlExampleKey] = useState<string | null>(null);
  const curlExamples = buildApiKeyCurlExamples(data);

  const handleCopy = () => {
    if (data?.apiKey) {
      onCopy(data.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCurlExample = (example: ApiKeyCurlExample) => {
    onCopy(example.command);
    setCopiedCurlExampleKey(example.key);
    setTimeout(() => setCopiedCurlExampleKey(null), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth disableEscapeKeyDown>
      <DialogTitle className="text-amber-600 dark:text-amber-500">
        {t('apiKeys.oneTime.title')}
      </DialogTitle>
      <DialogContent>
        {/* Warning */}
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{t('apiKeys.oneTime.warningStrong')}</strong> {t('apiKeys.oneTime.warning')}
          </p>
        </div>

        {/* Raw Key */}
        <div className="rounded-lg bg-gray-100 p-4 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <code className="flex-1 break-all font-mono text-sm text-gray-800 dark:text-slate-300">
              {data?.apiKey}
            </code>
            <Button
              variant="outlined"
              startIcon={<Copy size={16} />}
              onClick={handleCopy}
              size="small"
            >
              {copied ? t('apiKeys.oneTime.copied') : t('apiKeys.oneTime.copy')}
            </Button>
          </div>
        </div>

        {/* Granted Capabilities */}
        {((data?.scopes && data.scopes.length > 0) ||
          (data?.capabilities && data.capabilities.length > 0)) && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t('apiKeys.oneTime.capabilitiesGranted')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.scopes?.length
                ? data.scopes.map((scope) => (
                    <ApiScopeBadge
                      key={`${scope.scope}:${scope.resourceType ?? ''}:${scope.resourceId ?? ''}`}
                      scope={scope}
                    />
                  ))
                : data.capabilities.map((cap) => (
                    <CapabilityBadge key={cap.capabilityCode} scope={cap} />
                  ))}
            </div>
          </div>
        )}

        {curlExamples.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t('apiKeys.oneTime.curlExamplesTitle')}
            </p>
            <p className="mb-3 text-xs leading-5 text-gray-500 dark:text-slate-400">
              {t('apiKeys.oneTime.curlExamplesDescription')}
            </p>
            <div className="space-y-3">
              {curlExamples.map((example) => (
                <div
                  key={example.key}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <span>{t(example.titleKey, { defaultValue: example.title })}</span>
                    <Tooltip
                      title={
                        copiedCurlExampleKey === example.key
                          ? t('apiKeys.oneTime.copied')
                          : t('apiKeys.oneTime.copy')
                      }
                    >
                      <IconButton
                        aria-label={t('apiKeys.oneTime.copyCurlExample')}
                        size="small"
                        onClick={() => handleCopyCurlExample(example)}
                      >
                        {copiedCurlExampleKey === example.key ? (
                          <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </div>
                  <pre className="overflow-x-auto bg-gray-100 p-3 text-xs leading-5 text-gray-800 dark:bg-slate-950 dark:text-slate-200">
                    <code>{example.command}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security tip */}
        <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('apiKeys.oneTime.securityTip')}
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('apiKeys.oneTime.saved')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================
// Revoke Confirmation Dialog
// ============================================

interface RevokeConfirmationDialogProps {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
  onConfirm: () => void;
}

const RevokeConfirmationDialog: React.FC<RevokeConfirmationDialogProps> = ({
  open,
  apiKey,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('apiKeys.revoke.title')}</DialogTitle>
      <DialogContent>
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">
            {t('apiKeys.revoke.warningBefore')} <strong>{t('apiKeys.revoke.irreversible')}</strong>.{' '}
            {t('apiKeys.revoke.warningAfter')}
          </p>
        </div>

        <p className="text-gray-700 dark:text-slate-300">
          {t('apiKeys.revoke.confirm', { name: apiKey ? displayName(apiKey) : '' })}
        </p>

        {/* Show capabilities being lost */}
        {apiKey && apiKey.capabilities.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
              {t('apiKeys.revoke.accessTo')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {apiKey.capabilities.map((cap) => (
                <CapabilityBadge key={cap.capabilityCode} scope={cap} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded bg-gray-100 p-3 dark:bg-slate-900">
          <code className="font-mono text-sm text-gray-800 dark:text-slate-300">
            {apiKey?.publicId}
          </code>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('apiKeys.revoke.cancel')}</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          {t('apiKeys.revoke.revokeKey')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface RotateConfirmationDialogProps {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
  onConfirm: () => void;
}

const RotateConfirmationDialog: React.FC<RotateConfirmationDialogProps> = ({
  open,
  apiKey,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('apiKeys.rotate.title')}</DialogTitle>
      <DialogContent>
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('apiKeys.rotate.warning')}
          </p>
        </div>
        <p className="text-gray-700 dark:text-slate-300">
          {t('apiKeys.rotate.confirm', { name: apiKey ? displayName(apiKey) : '' })}
        </p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('apiKeys.rotate.cancel')}</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          startIcon={<RefreshCw size={16} />}
          disabled={!apiKey}
        >
          {t('apiKeys.rotate.rotateKey')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
