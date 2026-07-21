import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Brain, Edit3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '../common/ConfirmDialog';
import { useNotification } from '../../hooks/useNotification';
import {
  createUserMemory,
  deleteUserMemory,
  listUserMemories,
  updateUserMemory,
} from '../../services/api';
import type {
  CreateUserMemoryInput,
  UserMemory,
  UserMemoryScopeType,
  UserMemoryStatus,
} from '../../types';

type ScopeFilter = UserMemoryScopeType | 'all';

interface MemoryFormState {
  category: string;
  key: string;
  value: string;
  importance: number;
  confidence: number;
}

const emptyForm: MemoryFormState = {
  category: 'custom',
  key: '',
  value: '',
  importance: 50,
  confidence: 100,
};

const scopeOptions: ScopeFilter[] = ['all', 'USER', 'AGENT', 'PROJECT'];
const statusOptions: UserMemoryStatus[] = ['ACTIVE', 'SUPERSEDED', 'DELETED'];

const buildMemoryPayload = (form: MemoryFormState): CreateUserMemoryInput => ({
  scopeType: 'USER',
  scopeId: 0,
  category: form.category.trim(),
  key: form.key.trim(),
  value: form.value.trim(),
  valueType: 'text',
  importance: form.importance,
  confidence: form.confidence,
  source: 'explicit',
});

const formatDate = (value?: Date | string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export const UserMemorySettings: React.FC = () => {
  const { t } = useTranslation();
  const { success, error: notifyError } = useNotification();
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<UserMemoryStatus>('ACTIVE');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<UserMemory | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<UserMemory | null>(null);
  const [form, setForm] = useState<MemoryFormState>(emptyForm);

  const trimmedSearch = search.trim();

  const loadMemories = async () => {
    setIsLoading(true);
    setLoadError(null);

    const response = await listUserMemories({
      scopeType: scopeFilter === 'all' ? undefined : scopeFilter,
      status: statusFilter,
      search: trimmedSearch || undefined,
    });

    if (response.success && response.data) {
      setMemories(response.data);
    } else {
      setLoadError(response.error || t('settings.memory.errors.loadFailed'));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeFilter, statusFilter]);

  const activeCount = useMemo(
    () => memories.filter((memory) => memory.status === 'ACTIVE').length,
    [memories]
  );

  const openCreateDialog = () => {
    setEditingMemory(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (memory: UserMemory) => {
    setEditingMemory(memory);
    setForm({
      category: memory.category,
      key: memory.key,
      value: memory.value,
      importance: memory.importance,
      confidence: memory.confidence,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setEditingMemory(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.category.trim() || !form.key.trim() || !form.value.trim()) {
      notifyError(t('settings.memory.validation.required'));
      return;
    }

    setIsSaving(true);

    const payload = buildMemoryPayload(form);
    const response = editingMemory
      ? await updateUserMemory(editingMemory.publicId, {
          category: payload.category,
          key: payload.key,
          value: payload.value,
          importance: payload.importance,
          confidence: payload.confidence,
        })
      : await createUserMemory(payload);

    if (response.success && response.data) {
      await loadMemories();
      success(
        editingMemory
          ? t('settings.memory.messages.updated')
          : t('settings.memory.messages.created')
      );
      setIsDialogOpen(false);
      setEditingMemory(null);
      setForm(emptyForm);
    } else {
      notifyError(response.error || t('settings.memory.errors.saveFailed'));
    }

    setIsSaving(false);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setMemoryToDelete(null);
  };

  const handleDelete = async () => {
    if (!memoryToDelete) return;

    setDeletingId(memoryToDelete.publicId);
    const response = await deleteUserMemory(memoryToDelete.publicId);

    if (response.success) {
      setMemories((current) =>
        statusFilter === 'DELETED'
          ? current.map((memory) =>
              memory.publicId === memoryToDelete.publicId && response.data ? response.data : memory
            )
          : current.filter((memory) => memory.publicId !== memoryToDelete.publicId)
      );
      success(t('settings.memory.messages.deleted'));
      setMemoryToDelete(null);
    } else {
      notifyError(response.error || t('settings.memory.errors.deleteFailed'));
    }

    setDeletingId(null);
  };

  return (
    <Card
      className="mt-4 max-w-5xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      elevation={0}
    >
      <Box className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Box className="flex min-w-0 items-start gap-3">
          <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Brain className="text-violet-600 dark:text-violet-300" size={20} />
          </Box>
          <Box className="min-w-0">
            <Typography variant="subtitle1" className="font-semibold text-gray-900 dark:text-white">
              {t('settings.memory.title')}
            </Typography>
            <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
              {t('settings.memory.description')}
            </Typography>
            <Typography variant="caption" className="mt-2 block text-gray-500 dark:text-slate-500">
              {t('settings.memory.activeCount', { count: activeCount })}
            </Typography>
          </Box>
        </Box>

        <Box className="flex shrink-0 gap-2">
          <Tooltip title={t('settings.memory.actions.refresh')}>
            <span>
              <IconButton
                type="button"
                onClick={() => void loadMemories()}
                disabled={isLoading}
                aria-label={t('settings.memory.actions.refresh')}
              >
                {isLoading ? <CircularProgress size={18} /> : <RefreshCw size={18} />}
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={openCreateDialog}>
            {t('settings.memory.actions.create')}
          </Button>
        </Box>
      </Box>

      <Box className="mb-4 grid gap-3 md:grid-cols-[160px_180px_1fr_auto]">
        <FormControl size="small">
          <InputLabel>{t('settings.memory.filters.scope')}</InputLabel>
          <Select
            value={scopeFilter}
            label={t('settings.memory.filters.scope')}
            onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
            className="bg-white dark:bg-slate-800"
          >
            {scopeOptions.map((scope) => (
              <MenuItem key={scope} value={scope}>
                {t(`settings.memory.scope.${scope}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel>{t('settings.memory.filters.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('settings.memory.filters.status')}
            onChange={(event) => setStatusFilter(event.target.value as UserMemoryStatus)}
            className="bg-white dark:bg-slate-800"
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                {t(`settings.memory.status.${status}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void loadMemories();
            }
          }}
          placeholder={t('settings.memory.filters.search')}
          InputProps={{
            startAdornment: <Search className="mr-2 text-gray-400" size={16} />,
          }}
        />

        <Button type="button" variant="outlined" onClick={() => void loadMemories()}>
          {t('settings.memory.actions.search')}
        </Button>
      </Box>

      {loadError && (
        <Alert severity="error" className="mb-4" onClose={() => setLoadError(null)}>
          {loadError}
        </Alert>
      )}

      <Box className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
        <Box className="hidden grid-cols-[1.4fr_1fr_110px_120px_96px] gap-4 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400 md:grid">
          <span>{t('settings.memory.columns.key')}</span>
          <span>{t('settings.memory.columns.value')}</span>
          <span>{t('settings.memory.columns.scope')}</span>
          <span>{t('settings.memory.columns.meta')}</span>
          <span className="text-right">{t('settings.memory.columns.actions')}</span>
        </Box>

        {isLoading ? (
          <Box className="flex items-center justify-center py-12">
            <CircularProgress size={28} />
          </Box>
        ) : memories.length === 0 ? (
          <Box className="px-4 py-12 text-center">
            <Typography className="text-gray-600 dark:text-slate-400">
              {t('settings.memory.empty')}
            </Typography>
          </Box>
        ) : (
          memories.map((memory) => {
            const updatedAt = formatDate(memory.updatedAt);

            return (
              <Box
                key={memory.publicId}
                className="grid gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-slate-700 md:grid-cols-[1.4fr_1fr_110px_120px_96px] md:gap-4 md:py-3"
              >
                <Box className="min-w-0">
                  <Typography className="break-words font-medium text-gray-900 dark:text-slate-100">
                    {memory.key}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 dark:text-slate-500">
                    {memory.category}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  className="min-w-0 whitespace-pre-wrap break-words text-gray-700 dark:text-slate-300"
                >
                  {memory.value}
                </Typography>

                <Box>
                  <Chip
                    label={t(`settings.memory.scope.${memory.scopeType}`)}
                    size="small"
                    variant="outlined"
                  />
                  {memory.scopeType !== 'USER' && (
                    <Typography variant="caption" className="mt-1 block text-gray-500">
                      #{memory.scopeId}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" className="block text-gray-500 dark:text-slate-500">
                    {t('settings.memory.importance', { value: memory.importance })}
                  </Typography>
                  <Typography variant="caption" className="block text-gray-500 dark:text-slate-500">
                    {t('settings.memory.useCount', { count: memory.useCount })}
                  </Typography>
                  {updatedAt && (
                    <Typography
                      variant="caption"
                      className="block truncate text-gray-500 dark:text-slate-500"
                    >
                      {updatedAt}
                    </Typography>
                  )}
                </Box>

                <Box className="flex justify-end gap-1">
                  <Tooltip title={t('settings.memory.actions.edit')}>
                    <span>
                      <IconButton
                        type="button"
                        size="small"
                        disabled={memory.status === 'DELETED'}
                        onClick={() => openEditDialog(memory)}
                      >
                        <Edit3 size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('settings.memory.actions.delete')}>
                    <span>
                      <IconButton
                        type="button"
                        size="small"
                        disabled={memory.status === 'DELETED' || deletingId === memory.publicId}
                        onClick={() => setMemoryToDelete(memory)}
                      >
                        {deletingId === memory.publicId ? (
                          <CircularProgress size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Dialog open={isDialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingMemory
            ? t('settings.memory.dialog.editTitle')
            : t('settings.memory.dialog.title')}
        </DialogTitle>
        <DialogContent className="space-y-4 pt-3">
          {editingMemory?.scopeType && editingMemory.scopeType !== 'USER' && (
            <Alert severity="info">
              {t('settings.memory.dialog.scopedInfo', {
                scope: t(`settings.memory.scope.${editingMemory.scopeType}`),
              })}
            </Alert>
          )}
          <TextField
            fullWidth
            label={t('settings.memory.fields.category')}
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value }))
            }
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label={t('settings.memory.fields.key')}
            value={form.key}
            onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
            inputProps={{ maxLength: 160 }}
            helperText={t('settings.memory.fields.keyHelp')}
          />
          <TextField
            fullWidth
            multiline
            minRows={4}
            label={t('settings.memory.fields.value')}
            value={form.value}
            onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
            inputProps={{ maxLength: 5000 }}
          />
          <Box>
            <Typography variant="body2" className="mb-1 text-gray-600 dark:text-slate-300">
              {t('settings.memory.fields.importance', { value: form.importance })}
            </Typography>
            <Slider
              min={0}
              max={100}
              value={form.importance}
              onChange={(_, value) =>
                setForm((current) => ({
                  ...current,
                  importance: Array.isArray(value) ? value[0] : value,
                }))
              }
            />
          </Box>
          <Box>
            <Typography variant="body2" className="mb-1 text-gray-600 dark:text-slate-300">
              {t('settings.memory.fields.confidence', { value: form.confidence })}
            </Typography>
            <Slider
              min={0}
              max={100}
              value={form.confidence}
              onChange={(_, value) =>
                setForm((current) => ({
                  ...current,
                  confidence: Array.isArray(value) ? value[0] : value,
                }))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={closeDialog} disabled={isSaving}>
            {t('settings.memory.actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
          >
            {isSaving ? t('settings.memory.actions.saving') : t('settings.memory.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(memoryToDelete)}
        title={t('settings.memory.deleteDialog.title')}
        message={
          <>
            {t('settings.memory.deleteDialog.beforeKey')}{' '}
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {memoryToDelete?.key}
            </span>
            ?
          </>
        }
        confirmText={t('settings.memory.actions.delete')}
        confirmColor="error"
        loading={Boolean(memoryToDelete && deletingId === memoryToDelete.publicId)}
        onClose={closeDeleteDialog}
        onConfirm={() => void handleDelete()}
      />
    </Card>
  );
};
