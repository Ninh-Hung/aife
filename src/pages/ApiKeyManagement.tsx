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
  listApiKeys,
  listCapabilities,
  revokeApiKey,
} from '../services/api';
import type {
  ApiKey,
  ApiKeyScopeInput,
  Capability,
  CreateApiKeyInput,
  CreateApiKeyResponse,
} from '../types';
import { useNotification } from '../hooks/useNotification';

// ============================================
// Helpers
// ============================================

const ACTION_LABELS: Record<'canExecute' | 'canCreate' | 'canDelete', string> = {
  canExecute: 'Execute',
  canCreate: 'Create',
  canDelete: 'Delete',
};

function displayName(apiKey: ApiKey): string {
  return apiKey.metadata?.appName || apiKey.publicId;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================
// Main Component
// ============================================

export const ApiKeyManagement: React.FC = () => {
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
      error(response.error || 'Failed to load API keys');
    }
    setLoading(false);
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      success('API key copied to clipboard');
    } catch {
      error('Failed to copy API key');
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
            API Keys
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 md:text-base">
            Manage authentication tokens scoped to specific capabilities
          </p>
        </div>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={() => setCreateModalOpen(true)}
          sx={{ minHeight: 44 }}
        >
          Create API Key
        </Button>
      </div>

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
            <Key className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-slate-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100">
              No API keys yet
            </h3>
            <p className="mb-6 text-gray-600 dark:text-slate-400">
              Create your first API key and assign capabilities to it
            </p>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create API Key
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
              success('API key revoked successfully');
              loadApiKeys();
            } else {
              error(response.error || 'Failed to revoke API key');
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
  const name = displayName(apiKey);
  const isActive = apiKey.status === 'ACTIVE';

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
          <h3 className="truncate text-base font-bold text-blue-600 dark:text-blue-400">
            {name}
          </h3>
          <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
            {apiKey.publicId}
          </span>
        </div>

        {/* Capabilities */}
        <div className="flex flex-1 flex-wrap gap-1.5">
          {apiKey.capabilities.length === 0 ? (
            <span className="text-sm text-gray-400 dark:text-slate-500">No capabilities</span>
          ) : (
            apiKey.capabilities.map((cap) => (
              <CapabilityBadge key={cap.capabilityCode} scope={cap} />
            ))
          )}
        </div>

        {/* Status */}
        <div className="w-28 shrink-0">
          <Chip
            label={apiKey.status}
            size="small"
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          />
        </div>

        {/* Created At */}
        <div className="w-32 shrink-0 text-sm text-gray-600 dark:text-slate-400">
          {formatDate(apiKey.createdAt)}
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
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-base font-bold text-blue-600 dark:text-blue-400">
              {name}
            </h3>
            <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
              {apiKey.publicId}
            </span>
          </div>
          <Chip
            label={apiKey.status}
            size="small"
            color={isActive ? 'success' : 'default'}
            icon={isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          />
        </div>

        {/* Row 2: Capabilities */}
        {apiKey.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {apiKey.capabilities.map((cap) => (
              <CapabilityBadge key={cap.capabilityCode} scope={cap} />
            ))}
          </div>
        )}

        {/* Row 3: Date + Delete */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">
            Created: {formatDate(apiKey.createdAt)}
          </span>
          {isActive && (
            <IconButton onClick={onRevoke} color="error" size="small">
              <Trash2 size={18} />
            </IconButton>
          )}
        </div>
      </div>
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
  const actions = (
    Object.keys(ACTION_LABELS) as Array<keyof typeof ACTION_LABELS>
  )
    .filter((k) => scope[k])
    .map((k) => ACTION_LABELS[k])
    .join(' · ');

  return (
    <Tooltip title={actions || 'No actions'} arrow placement="top">
      <Chip
        icon={<Zap size={12} />}
        label={scope.capabilityName}
        size="small"
        variant="outlined"
        className="!text-xs !border-blue-300 !text-blue-700 dark:!border-blue-700 dark:!text-blue-300"
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
  const { error } = useNotification();

  // Available capabilities from the server
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
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

  const [submitting, setSubmitting] = useState(false);

  // Load capabilities when modal opens
  useEffect(() => {
    if (!open) return;
    setCapsLoading(true);
    listCapabilities().then((res) => {
      if (res.success && res.data) {
        setCapabilities(res.data);
      } else {
        error(res.error || 'Failed to load capabilities');
      }
      setCapsLoading(false);
    });
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

  const toggleAction = (
    code: string,
    action: 'canExecute' | 'canCreate' | 'canDelete'
  ) => {
    setSelectedScopes((prev) => ({
      ...prev,
      [code]: { ...prev[code], [action]: !prev[code][action] },
    }));
  };

  const selectedCount = Object.keys(selectedScopes).length;
  const canSubmit = selectedCount > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const scopesInput: ApiKeyScopeInput[] = Object.entries(selectedScopes).map(
      ([capabilityCode, actions]) => ({ capabilityCode, ...actions })
    );

    const cleanMeta: CreateApiKeyInput['metadata'] = {};
    if (metadata.appName.trim()) cleanMeta.appName = metadata.appName.trim();
    if (metadata.environment.trim()) cleanMeta.environment = metadata.environment.trim();
    if (metadata.description.trim()) cleanMeta.description = metadata.description.trim();

    const input: CreateApiKeyInput = {
      capabilities: scopesInput,
      ...(Object.keys(cleanMeta).length > 0 && { metadata: cleanMeta }),
    };

    const response = await createApiKey(input);

    if (response.success && response.data?.apiKey) {
      onSuccess(response.data);
      resetForm();
    } else {
      error(response.error || 'Failed to create API key');
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedScopes({});
    setMetadata({ appName: '', environment: '', description: '' });
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent className="space-y-5 !pt-3">

          {/* ── Capabilities Section ── */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              Capabilities <span className="text-red-500">*</span>
            </p>
            <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">
              Select the capabilities this key is allowed to use.
            </p>

            {capsLoading ? (
              <div className="flex items-center gap-2 py-4">
                <CircularProgress size={18} />
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Loading capabilities…
                </span>
              </div>
            ) : capabilities.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                No capabilities available.
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
                        <div className="flex-1 min-w-0">
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
                          {(
                            ['canExecute', 'canCreate', 'canDelete'] as const
                          ).map((action) => (
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
                                  {ACTION_LABELS[action]}
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
                {selectedCount} capability{selectedCount !== 1 ? 'ies' : ''} selected
              </p>
            )}
          </div>

          {/* ── Metadata Section ── */}
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-slate-200">
              Metadata <span className="text-gray-400 font-normal">(optional)</span>
            </p>

            <TextField
              fullWidth
              label="App Name"
              value={metadata.appName}
              onChange={(e) => setMetadata({ ...metadata, appName: e.target.value })}
              size="small"
              margin="dense"
              placeholder="My App"
            />
            <TextField
              fullWidth
              label="Environment"
              value={metadata.environment}
              onChange={(e) => setMetadata({ ...metadata, environment: e.target.value })}
              size="small"
              margin="dense"
              placeholder="production, staging, development"
            />
            <TextField
              fullWidth
              label="Description"
              value={metadata.description}
              onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
              size="small"
              margin="dense"
              multiline
              rows={2}
              placeholder="Brief description of this key's purpose"
            />
          </div>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : <ShieldCheck size={16} />
            }
          >
            {submitting ? 'Creating…' : 'Create Key'}
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
        Save Your API Key
      </DialogTitle>
      <DialogContent>
        {/* Warning */}
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>This API key will only be shown once.</strong> Please copy and store it
            securely. You will not be able to retrieve it again.
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
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Granted Capabilities */}
        {data?.capabilities && data.capabilities.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
              Capabilities granted:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.capabilities.map((cap) => (
                <CapabilityBadge key={cap.capabilityCode} scope={cap} />
              ))}
            </div>
          </div>
        )}

        {/* Security tip */}
        <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Store this key in a secure location such as a password manager or environment
            variables. Never commit it to version control.
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          I've Saved My Key
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
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Revoke API Key</DialogTitle>
      <DialogContent>
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">
            This action is <strong>irreversible</strong>. The API key will be permanently disabled.
          </p>
        </div>

        <p className="text-gray-700 dark:text-slate-300">
          Are you sure you want to revoke:{' '}
          <strong>{apiKey ? displayName(apiKey) : ''}</strong>?
        </p>

        {/* Show capabilities being lost */}
        {apiKey && apiKey.capabilities.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
              This key has access to:
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
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Revoke Key
        </Button>
      </DialogActions>
    </Dialog>
  );
};
