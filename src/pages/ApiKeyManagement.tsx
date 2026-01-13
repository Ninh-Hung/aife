/**
 * API Key Management Page
 * Allows users to create, view, and revoke API keys
 * SECURITY: Raw API keys are NEVER stored - only shown once at creation
 */

import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from '@mui/material';
import { CheckCircle2, Copy, Key, Plus, Trash2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/api';
import type { ApiKey, CreateApiKeyInput } from '../types';
import { useNotification } from '../hooks/useNotification';

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
    apiKey: string | null;
  }>({ open: false, apiKey: null });
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    apiKey: ApiKey | null;
  }>({ open: false, apiKey: null });

  // Load API keys on mount
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

  const handleCreateClick = () => {
    setCreateModalOpen(true);
  };

  const handleRevokeClick = (apiKey: ApiKey) => {
    setRevokeDialog({ open: true, apiKey });
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      success('API key copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      error('Failed to copy API key');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">
            API Keys
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 md:text-base">
            Manage authentication tokens for accessing platform APIs
          </p>
        </div>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleCreateClick}
          className="bg-blue-600 hover:bg-blue-700"
          sx={{ minHeight: 44 }} // Touch target optimization
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
              Create your first API key to get started
            </p>
            <Button variant="contained" startIcon={<Plus size={20} />} onClick={handleCreateClick}>
              Create API Key
            </Button>
          </div>
        ) : (
          apiKeys.map((apiKey, index) => (
            <div
              key={apiKey.publicId}
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600"
            >
              {/* Desktop Layout: Horizontal Row */}
              <div className="hidden items-center gap-4 lg:flex">
                {/* Column 1: No. */}
                <div className="flex w-12 shrink-0 items-center justify-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Column 2: Name */}
                <div className="w-48 shrink-0">
                  <h3 className="truncate text-base font-bold text-blue-600 dark:text-blue-400">
                    {apiKey.metadata?.appName || apiKey.name}
                  </h3>
                </div>

                {/* Column 3: Key Value */}
                <div className="flex flex-1 items-center gap-2">
                  <code className="rounded bg-gray-100 px-3 py-1.5 font-mono text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-300">
                    {apiKey.prefix}••••••••••••
                  </code>
                </div>

                {/* Column 4: Status */}
                <div className="w-28 shrink-0">
                  <Chip
                    label={apiKey.status}
                    size="small"
                    color={apiKey.status === 'ACTIVE' ? 'success' : 'default'}
                    icon={
                      apiKey.status === 'ACTIVE' ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )
                    }
                  />
                </div>

                {/* Column 5: Created At */}
                <div className="w-32 shrink-0">
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    {formatDate(apiKey.createdAt)}
                  </span>
                </div>

                {/* Column 6: Action */}
                <div className="w-12 shrink-0">
                  {apiKey.status === 'ACTIVE' && (
                    <IconButton
                      onClick={() => handleRevokeClick(apiKey)}
                      color="error"
                      size="small"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  )}
                </div>
              </div>

              {/* Mobile/Tablet Layout: Wrapped Columns */}
              <div className="flex flex-col gap-3 lg:hidden">
                {/* Row 1: No. + Name + Status */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="flex-1 truncate text-base font-bold text-blue-600 dark:text-blue-400">
                    {apiKey.metadata?.appName || apiKey.name}
                  </h3>
                  <Chip
                    label={apiKey.status}
                    size="small"
                    color={apiKey.status === 'ACTIVE' ? 'success' : 'default'}
                    icon={
                      apiKey.status === 'ACTIVE' ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )
                    }
                  />
                </div>

                {/* Row 2: Key Value with Copy */}
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-gray-100 px-3 py-1.5 font-mono text-sm text-gray-800 dark:bg-slate-900 dark:text-slate-300">
                    {apiKey.prefix}••••••••••••
                  </code>
                </div>

                {/* Row 3: Created At + Delete */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Created: {formatDate(apiKey.createdAt)}
                  </span>
                  {apiKey.status === 'ACTIVE' && (
                    <IconButton
                      onClick={() => handleRevokeClick(apiKey)}
                      color="error"
                      size="small"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <CreateApiKeyModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(rawKey) => {
          setCreateModalOpen(false);
          // SECURITY: Display raw key ONCE in one-time modal
          setOneTimeKeyModal({ open: true, apiKey: rawKey });
          loadApiKeys();
        }}
      />

      {/* One-Time Key Display Modal */}
      <OneTimeKeyModal
        open={oneTimeKeyModal.open}
        apiKey={oneTimeKeyModal.apiKey}
        onClose={() => {
          // SECURITY: Clear the raw key from memory after modal closes
          setOneTimeKeyModal({ open: false, apiKey: null });
        }}
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
    </>
  );
};

// ============================================
// Create API Key Modal
// ============================================

interface CreateApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (rawKey: string) => void;
}

const CreateApiKeyModal: React.FC<CreateApiKeyModalProps> = ({ open, onClose, onSuccess }) => {
  const { error } = useNotification();
  const [formData, setFormData] = useState<CreateApiKeyInput>({
    name: '',
    metadata: {
      appName: '',
      environment: '',
      description: '',
    },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Clean up metadata - remove empty fields
    const cleanMetadata: NonNullable<CreateApiKeyInput['metadata']> = {};
    if (formData.metadata?.appName?.trim()) {
      cleanMetadata.appName = formData.metadata.appName.trim();
    }
    if (formData.metadata?.environment?.trim()) {
      cleanMetadata.environment = formData.metadata.environment.trim();
    }
    if (formData.metadata?.description?.trim()) {
      cleanMetadata.description = formData.metadata.description.trim();
    }

    const input: CreateApiKeyInput = {
      name: formData.name.trim(),
      ...(Object.keys(cleanMetadata).length > 0 && { metadata: cleanMetadata }),
    };

    const response = await createApiKey(input);

    if (response.success && response.data?.apiKey) {
      // SECURITY: Pass raw key to parent for one-time display
      onSuccess(response.data.apiKey);
      // Reset form
      setFormData({
        name: '',
        metadata: { appName: '', environment: '', description: '' },
      });
    } else {
      error(response.error || 'Failed to create API key');
    }

    setSubmitting(false);
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        name: '',
        metadata: { appName: '', environment: '', description: '' },
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            placeholder="My Application API Key"
          />

          <TextField
            fullWidth
            label="App Name (optional)"
            value={formData.metadata?.appName || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                metadata: { ...formData.metadata, appName: e.target.value },
              })
            }
            margin="normal"
            placeholder="My App"
          />

          <TextField
            fullWidth
            label="Environment (optional)"
            value={formData.metadata?.environment || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                metadata: { ...formData.metadata, environment: e.target.value },
              })
            }
            margin="normal"
            placeholder="production, staging, development"
          />

          <TextField
            fullWidth
            label="Description (optional)"
            value={formData.metadata?.description || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                metadata: { ...formData.metadata, description: e.target.value },
              })
            }
            margin="normal"
            multiline
            rows={2}
            placeholder="Brief description of this API key's purpose"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || !formData.name.trim()}>
            {submitting ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ============================================
// One-Time Key Display Modal
// SECURITY: This modal displays the raw API key ONLY ONCE
// The key is NEVER stored and will be lost when modal closes
// ============================================

interface OneTimeKeyModalProps {
  open: boolean;
  apiKey: string | null;
  onClose: () => void;
  onCopy: (key: string) => void;
}

const OneTimeKeyModal: React.FC<OneTimeKeyModalProps> = ({ open, apiKey, onClose, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (apiKey) {
      onCopy(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      // Prevent accidental close
      disableEscapeKeyDown
    >
      <DialogTitle className="text-amber-600 dark:text-amber-500">Save Your API Key</DialogTitle>
      <DialogContent>
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>This API key will only be shown once.</strong> Please copy and store it
            securely. You will not be able to retrieve it again.
          </p>
        </div>

        <div className="rounded-lg bg-gray-100 p-4 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <code className="flex-1 break-all font-mono text-sm text-gray-800 dark:text-slate-300">
              {apiKey}
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

        <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Store this key in a secure location such as a password manager or environment variables.
            Never commit it to version control.
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
          Are you sure you want to revoke the API key:{' '}
          <strong>{apiKey?.metadata?.appName || apiKey?.name}</strong>?
        </p>

        <div className="mt-4 rounded bg-gray-100 p-3 dark:bg-slate-900">
          <code className="font-mono text-sm text-gray-800 dark:text-slate-300">
            {apiKey?.prefix}****
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
