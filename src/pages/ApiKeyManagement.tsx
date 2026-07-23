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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle2,
  Copy,
  Key,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  createApiKey,
  listAgents,
  listApiKeys,
  listCapabilities,
  listIntegrationClients,
  revokeApiKey,
} from '../services/api';
import type {
  Agent,
  ApiKey,
  ApiKeyApiScopeInput,
  ApiKeyScopeInput,
  Capability,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  IntegrationClient,
} from '../types';
import { useNotification } from '../hooks/useNotification';
import { useTranslation } from 'react-i18next';

// ============================================
// Helpers
// ============================================

const API_KEY_ACTIONS = ['canExecute', 'canCreate', 'canDelete'] as const;
const API_KEY_SCOPE_PRESETS = {
  chatWithOneAgent: (agentPublicId: string): ApiKeyApiScopeInput[] => [
    { scope: 'agents:execute', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'chat_sessions:create', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'chat_messages:create', resourceType: 'agent', resourcePublicId: agentPublicId },
    { scope: 'usage:read' },
  ],
  thirdPartyRuntime: (clientPublicId: string): ApiKeyApiScopeInput[] => [
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
    { scope: 'usage:read' },
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
    { scope: 'agents:create' },
    { scope: 'knowledge:create' },
    { scope: 'knowledge:sync' },
    { scope: 'files:upload' },
  ],
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

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
            <Key className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-slate-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100">
              {t('apiKeys.empty.title')}
            </h3>
            <p className="mb-6 text-gray-600 dark:text-slate-400">
              {t('apiKeys.empty.description')}
            </p>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => setCreateModalOpen(true)}
            >
              {t('apiKeys.create')}
            </Button>
          </div>
        ) : (
          apiKeys.map((apiKey, index) => (
            <ApiKeyCard
              key={apiKey.publicId}
              apiKey={apiKey}
              index={index}
              onRevoke={() => setRevokeDialog({ open: true, apiKey })}
            />
          ))
        )}
      </div>

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
    </div>
  );
};

// ============================================
// API Key Card
// ============================================

interface ApiKeyCardProps {
  apiKey: ApiKey;
  index: number;
  onRevoke: () => void;
}

const ApiKeyCard: React.FC<ApiKeyCardProps> = ({ apiKey, index, onRevoke }) => {
  const { t, i18n } = useTranslation();
  const name = displayName(apiKey);
  const isActive = apiKey.status === 'ACTIVE';
  const dateLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600">
      {/* Desktop Layout */}
      <div className="hidden items-start gap-4 lg:flex">
        {/* No. */}
        <div className="flex w-10 shrink-0 items-center justify-center pt-0.5">
          <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        {/* Name + publicId */}
        <div className="w-44 shrink-0">
          <h3 className="truncate text-base font-bold text-blue-600 dark:text-blue-400">{name}</h3>
          <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
            {apiKey.publicId}
          </span>
        </div>

        {/* Capabilities */}
        <div className="flex flex-1 flex-wrap gap-1.5">
          {(apiKey.scopes?.length ?? apiKey.capabilities.length) === 0 ? (
            <span className="text-sm text-gray-400 dark:text-slate-500">
              {t('apiKeys.card.noCapabilities')}
            </span>
          ) : apiKey.scopes?.length ? (
            apiKey.scopes.map((scope) => (
              <ApiScopeBadge
                key={`${scope.scope}:${scope.resourceType ?? ''}:${scope.resourceId ?? ''}`}
                scope={scope}
              />
            ))
          ) : (
            apiKey.capabilities.map((cap) => (
              <CapabilityBadge key={cap.capabilityCode} scope={cap} />
            ))
          )}
        </div>

        {/* Status */}
        <div className="w-28 shrink-0">
          <Chip
            label={t(`apiKeys.status.${apiKey.status}`, { defaultValue: apiKey.status })}
            size="small"
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          />
        </div>

        {/* Created At */}
        <div className="w-32 shrink-0 text-sm text-gray-600 dark:text-slate-400">
          {formatDate(apiKey.createdAt, dateLocale)}
        </div>

        {/* Action */}
        <div className="w-10 shrink-0">
          {isActive && (
            <IconButton onClick={onRevoke} color="error" size="small">
              <Trash2 size={18} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="flex flex-col gap-3 lg:hidden">
        {/* Row 1: No + Name + Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-blue-600 dark:text-blue-400">
              {name}
            </h3>
            <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
              {apiKey.publicId}
            </span>
          </div>
          <Chip
            label={t(`apiKeys.status.${apiKey.status}`, { defaultValue: apiKey.status })}
            size="small"
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          />
        </div>

        {/* Row 2: Capabilities */}
        {(apiKey.scopes?.length ?? apiKey.capabilities.length) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {apiKey.scopes?.length
              ? apiKey.scopes.map((scope) => (
                  <ApiScopeBadge
                    key={`${scope.scope}:${scope.resourceType ?? ''}:${scope.resourceId ?? ''}`}
                    scope={scope}
                  />
                ))
              : apiKey.capabilities.map((cap) => (
                  <CapabilityBadge key={cap.capabilityCode} scope={cap} />
                ))}
          </div>
        )}

        {/* Row 3: Date + Delete */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">
            {t('apiKeys.card.created', { date: formatDate(apiKey.createdAt, dateLocale) })}
          </span>
          {isActive && (
            <IconButton onClick={onRevoke} color="error" size="small">
              <Trash2 size={18} />
            </IconButton>
          )}
        </div>
      </div>

      <ApiKeyMetadataGrid apiKey={apiKey} dateLocale={dateLocale} />
    </div>
  );
};

const ApiKeyMetadataGrid: React.FC<{ apiKey: ApiKey; dateLocale: string }> = ({
  apiKey,
  dateLocale,
}) => {
  const { t } = useTranslation();
  const items = [
    { label: t('apiKeys.card.prefix'), value: apiKey.prefix || '—', mono: true },
    { label: t('apiKeys.card.environment'), value: apiKeyEnvironment(apiKey) },
    { label: t('apiKeys.card.expires'), value: formatOptionalDate(apiKey.expiresAt, dateLocale) },
    { label: t('apiKeys.card.lastUsed'), value: formatOptionalDate(apiKey.lastUsed, dateLocale) },
    { label: t('apiKeys.card.rateLimit'), value: formatRateLimit(apiKey) },
  ];

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs dark:border-slate-700 md:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <div className="text-gray-400 dark:text-slate-500">{item.label}</div>
          <div
            className={`truncate text-gray-700 dark:text-slate-300 ${item.mono ? 'font-mono' : ''}`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
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
  const restriction = scope.resourceType
    ? `${scope.resourceType}:${scope.resourcePublicId ?? scope.resourceId ?? '*'}`
    : 'all resources';

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
// Create API Key Modal
// ============================================

interface CreateApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: CreateApiKeyResponse) => void;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { error } = useNotification();

  // Available capabilities from the server
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [integrationClients, setIntegrationClients] = useState<IntegrationClient[]>([]);
  const [capsLoading, setCapsLoading] = useState(false);

  // Selected scopes: code -> { canExecute, canCreate, canDelete }
  const [selectedScopes, setSelectedScopes] = useState<
    Record<string, { canExecute: boolean; canCreate: boolean; canDelete: boolean }>
  >({});

  // Optional metadata
  const [metadata, setMetadata] = useState({
    appName: '',
    environment: '',
    description: '',
  });
  const [selectedAgentPublicId, setSelectedAgentPublicId] = useState('');
  const [selectedIntegrationClientPublicId, setSelectedIntegrationClientPublicId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [rateLimit, setRateLimit] = useState({
    requestsPerMinute: '',
    requestsPerDay: '',
  });
  const [advancedScopesJson, setAdvancedScopesJson] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load capabilities when modal opens
  useEffect(() => {
    if (!open) return;
    setCapsLoading(true);
    Promise.all([listCapabilities(), listAgents(), listIntegrationClients()]).then(
      ([capsRes, agentsRes, clientsRes]) => {
        if (capsRes.success && capsRes.data) {
          setCapabilities(capsRes.data);
        } else {
          error(capsRes.error || t('apiKeys.errors.loadCapabilitiesFailed'));
        }

        if (agentsRes.success && agentsRes.data) {
          setAgents(agentsRes.data);
        }

        if (clientsRes.success && clientsRes.data) {
          setIntegrationClients(clientsRes.data);
        }

        setCapsLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleCapability = (code: string) => {
    setSelectedScopes((prev) => {
      if (prev[code]) {
        const next = { ...prev };
        delete next[code];
        return next;
      }
      return { ...prev, [code]: { canExecute: true, canCreate: false, canDelete: false } };
    });
  };

  const toggleAction = (code: string, action: 'canExecute' | 'canCreate' | 'canDelete') => {
    setSelectedScopes((prev) => ({
      ...prev,
      [code]: { ...prev[code], [action]: !prev[code][action] },
    }));
  };

  const selectedCount = Object.keys(selectedScopes).length;
  const hasAdvancedScopes = advancedScopesJson.trim().length > 0;
  const canSubmit = (selectedCount > 0 || hasAdvancedScopes) && !submitting;

  const applyScopePreset = (preset: ApiKeyApiScopeInput[] | undefined) => {
    if (!preset) return;
    setAdvancedScopesJson(JSON.stringify(preset, null, 2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const scopesInput: ApiKeyScopeInput[] = Object.entries(selectedScopes).map(
      ([capabilityCode, actions]) => ({ capabilityCode, ...actions })
    );
    let apiScopesInput: ApiKeyApiScopeInput[] | undefined;

    if (hasAdvancedScopes) {
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
      ...(scopesInput.length > 0 && { capabilities: scopesInput }),
      ...(apiScopesInput && { scopes: apiScopesInput }),
      ...(Object.keys(cleanMeta).length > 0 && { metadata: cleanMeta }),
      ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
      ...(Object.keys(cleanRateLimit).length > 0 && { rateLimit: cleanRateLimit }),
    };

    const response = await createApiKey(input);

    if (response.success && response.data?.apiKey) {
      onSuccess(response.data);
      resetForm();
    } else {
      error(response.error || t('apiKeys.errors.createFailed'));
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedScopes({});
    setMetadata({ appName: '', environment: '', description: '' });
    setSelectedAgentPublicId('');
    setSelectedIntegrationClientPublicId('');
    setExpiresAt('');
    setRateLimit({ requestsPerMinute: '', requestsPerDay: '' });
    setAdvancedScopesJson('');
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t('apiKeys.modal.createTitle')}</DialogTitle>
        <DialogContent className="space-y-5 !pt-3">
          {/* ── Capabilities Section ── */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              {t('apiKeys.modal.capabilities')} <span className="text-red-500">*</span>
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
              {t('apiKeys.modal.capabilitiesHelper')}
            </p>

            {capsLoading ? (
              <div className="flex items-center gap-2 py-4">
                <CircularProgress size={18} />
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {t('apiKeys.modal.loadingCapabilities')}
                </span>
              </div>
            ) : capabilities.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {t('apiKeys.modal.noCapabilities')}
              </p>
            ) : (
              <div className="space-y-2">
                {capabilities.map((cap) => {
                  const isSelected = !!selectedScopes[cap.code];
                  const scope = selectedScopes[cap.code];

                  return (
                    <div
                      key={cap.code}
                      className={`rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                          : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {/* Capability Toggle Row */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleCapability(cap.code)}
                          size="small"
                          sx={{ padding: 0 }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Shield size={14} className="shrink-0 text-blue-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {cap.name}
                            </span>
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                              {cap.code}
                            </code>
                          </div>
                          {cap.description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                              {cap.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Permissions (only when selected) */}
                      {isSelected && (
                        <div className="mt-2 flex flex-wrap gap-3 pl-7">
                          {API_KEY_ACTIONS.map((action) => (
                            <FormControlLabel
                              key={action}
                              control={
                                <Checkbox
                                  checked={scope[action]}
                                  onChange={() => toggleAction(cap.code, action)}
                                  size="small"
                                  sx={{ padding: '2px 6px 2px 0' }}
                                />
                              }
                              label={
                                <span className="text-xs text-gray-700 dark:text-slate-300">
                                  {t(`apiKeys.actions.${action}`)}
                                </span>
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedCount > 0 && (
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                {selectedCount === 1
                  ? t('apiKeys.modal.capabilitySelected', { count: selectedCount })
                  : t('apiKeys.modal.capabilitiesSelected', { count: selectedCount })}
              </p>
            )}
          </div>

          {/* ── Metadata Section ── */}
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
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              {t('apiKeys.modal.resourceScopes')}{' '}
              <span className="font-normal text-gray-400">{t('apiKeys.modal.optional')}</span>
            </p>
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <TextField
                select
                fullWidth
                label={t('apiKeys.modal.agentResource')}
                value={selectedAgentPublicId}
                onChange={(e) => setSelectedAgentPublicId(e.target.value)}
                size="small"
              >
                <MenuItem value="">{t('apiKeys.modal.none')}</MenuItem>
                {agents.map((agent) => (
                  <MenuItem key={agent.publicId} value={agent.publicId}>
                    {agent.name} ({agent.publicId})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label={t('apiKeys.modal.integrationClientResource')}
                value={selectedIntegrationClientPublicId}
                onChange={(e) => setSelectedIntegrationClientPublicId(e.target.value)}
                size="small"
              >
                <MenuItem value="">{t('apiKeys.modal.none')}</MenuItem>
                {integrationClients.map((client) => (
                  <MenuItem key={client.public_id} value={client.public_id}>
                    {client.name} ({client.public_id})
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="small"
                variant="outlined"
                disabled={!selectedAgentPublicId}
                onClick={() =>
                  applyScopePreset(API_KEY_SCOPE_PRESETS.chatWithOneAgent(selectedAgentPublicId))
                }
              >
                {t('apiKeys.modal.presets.chatWithOneAgent')}
              </Button>
              <Button
                type="button"
                size="small"
                variant="outlined"
                disabled={!selectedIntegrationClientPublicId}
                onClick={() =>
                  applyScopePreset(
                    API_KEY_SCOPE_PRESETS.thirdPartyRuntime(selectedIntegrationClientPublicId)
                  )
                }
              >
                {t('apiKeys.modal.presets.thirdPartyRuntime')}
              </Button>
              <Button
                type="button"
                size="small"
                variant="outlined"
                disabled={!selectedIntegrationClientPublicId}
                onClick={() =>
                  applyScopePreset(
                    API_KEY_SCOPE_PRESETS.thirdPartyProvisioning(selectedIntegrationClientPublicId)
                  )
                }
              >
                {t('apiKeys.modal.presets.thirdPartyProvisioning')}
              </Button>
            </div>
            <TextField
              fullWidth
              value={advancedScopesJson}
              onChange={(e) => setAdvancedScopesJson(e.target.value)}
              size="small"
              multiline
              rows={5}
              placeholder='[{"scope":"agents:execute","resourceType":"agent","resourcePublicId":"agt_..."}]'
              helperText={t('apiKeys.modal.resourceScopesHelper')}
            />
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

  const handleCopy = () => {
    if (data?.apiKey) {
      onCopy(data.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
