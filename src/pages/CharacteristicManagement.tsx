import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { BrainCircuit, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { CreateCharacteristicModal } from '../components/agents/CreateCharacteristicModal';
import type { Characteristic, CharacteristicScope } from '../types';
import { deleteCharacteristic, listCharacteristics } from '../services/api';

const getScopeKey = (characteristic: Characteristic) => {
  if (characteristic.isSystem) return 'system';
  if (characteristic.visibility === 'project') return 'project';
  return 'user';
};

export const CharacteristicManagement: React.FC = () => {
  const { t } = useTranslation();
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [scopeFilter, setScopeFilter] = useState<CharacteristicScope>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCharacteristic, setEditingCharacteristic] = useState<Characteristic | null>(null);
  const [characteristicToDelete, setCharacteristicToDelete] = useState<Characteristic | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const trimmedSearch = useMemo(() => search.trim(), [search]);

  const loadCharacteristics = async () => {
    setIsLoading(true);
    setError(null);

    const response = await listCharacteristics(scopeFilter, trimmedSearch || undefined);

    if (response.success && response.data) {
      setCharacteristics(response.data);
    } else {
      setError(response.error || t('characteristicManagement.errors.loadFailed'));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadCharacteristics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeFilter]);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void loadCharacteristics();
  };

  const handleScopeChange = (event: SelectChangeEvent<CharacteristicScope>) => {
    setScopeFilter(event.target.value as CharacteristicScope);
  };

  const handleCreated = (characteristic: Characteristic) => {
    setCharacteristics((current) => [characteristic, ...current]);
    setIsCreateOpen(false);
  };

  const handleUpdated = (characteristic: Characteristic) => {
    setCharacteristics((current) =>
      current.map((item) => (item.publicId === characteristic.publicId ? characteristic : item))
    );
    setEditingCharacteristic(null);
  };

  const handleCloseEdit = () => {
    setEditingCharacteristic(null);
  };

  const handleRequestDelete = (characteristic: Characteristic) => {
    setCharacteristicToDelete(characteristic);
  };

  const handleCloseDeleteDialog = () => {
    if (characteristicToDelete && deletingIds.has(characteristicToDelete.publicId)) return;
    setCharacteristicToDelete(null);
  };

  const handleConfirmDelete = async () => {
    const characteristic = characteristicToDelete;
    if (!characteristic) return;

    setDeletingIds((current) => new Set(current).add(characteristic.publicId));
    const response = await deleteCharacteristic(characteristic.publicId);

    if (response.success) {
      setCharacteristics((current) =>
        current.filter((item) => item.publicId !== characteristic.publicId)
      );
      setCharacteristicToDelete(null);
    } else {
      setError(response.error || t('characteristicManagement.errors.deleteFailed'));
    }

    setDeletingIds((current) => {
      const next = new Set(current);
      next.delete(characteristic.publicId);
      return next;
    });
  };

  return (
    <Box className="h-full bg-gray-50 p-6 dark:bg-slate-900">
      <Box className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Box>
          <Box className="mb-1 flex items-center gap-2">
            <BrainCircuit size={22} className="text-teal-600 dark:text-teal-400" />
            <Typography variant="h5" className="font-semibold text-gray-900 dark:text-slate-100">
              {t('characteristicManagement.title')}
            </Typography>
          </Box>
          <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
            {t('characteristicManagement.subtitle')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setIsCreateOpen(true)}
        >
          {t('characteristicManagement.create')}
        </Button>
      </Box>

      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        className="mb-4 flex flex-col gap-3 md:flex-row"
      >
        <FormControl size="small" className="min-w-[180px]">
          <InputLabel>{t('characteristicManagement.filters.scope')}</InputLabel>
          <Select
            value={scopeFilter}
            label={t('characteristicManagement.filters.scope')}
            onChange={handleScopeChange}
            className="bg-white dark:bg-slate-800"
          >
            <MenuItem value="all">{t('characteristicManagement.scope.all')}</MenuItem>
            <MenuItem value="system">{t('characteristicManagement.scope.system')}</MenuItem>
            <MenuItem value="user">{t('characteristicManagement.scope.user')}</MenuItem>
            <MenuItem value="project">{t('characteristicManagement.scope.project')}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('characteristicManagement.filters.searchPlaceholder')}
          className="min-w-0 flex-1 bg-white dark:bg-slate-800"
        />

        <Button type="submit" variant="outlined">
          {t('characteristicManagement.search')}
        </Button>

        <Tooltip title={t('characteristicManagement.refresh')}>
          <span>
            <IconButton onClick={() => void loadCharacteristics()} disabled={isLoading}>
              {isLoading ? <CircularProgress size={18} /> : <RefreshCw size={18} />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Box className="hidden grid-cols-[1.2fr_140px_120px_1.4fr_96px] gap-4 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400 md:grid">
          <span>{t('characteristicManagement.columns.name')}</span>
          <span>{t('characteristicManagement.columns.layer')}</span>
          <span>{t('characteristicManagement.columns.scope')}</span>
          <span>{t('characteristicManagement.columns.prompt')}</span>
          <span className="text-right">{t('characteristicManagement.columns.actions')}</span>
        </Box>

        {isLoading ? (
          <Box className="flex items-center justify-center py-12">
            <CircularProgress size={28} />
          </Box>
        ) : characteristics.length === 0 ? (
          <Box className="px-4 py-12 text-center">
            <Typography className="text-gray-600 dark:text-slate-400">
              {t('characteristicManagement.empty')}
            </Typography>
          </Box>
        ) : (
          characteristics.map((characteristic) => {
            const canManage = !characteristic.isSystem;
            const isDeleting = deletingIds.has(characteristic.publicId);
            const scopeKey = getScopeKey(characteristic);

            return (
              <Box
                key={characteristic.publicId}
                className="grid grid-cols-1 gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-slate-700 md:grid-cols-[1.2fr_140px_120px_1.4fr_96px] md:gap-4 md:py-3"
              >
                <Box className="min-w-0">
                  <Typography className="truncate font-medium text-gray-900 dark:text-slate-100">
                    {characteristic.name}
                  </Typography>
                  <Typography variant="caption" className="block truncate text-gray-500">
                    {t('agents.characteristics.code', { code: characteristic.code })}
                  </Typography>
                  {characteristic.description && (
                    <Typography
                      variant="caption"
                      className="block truncate text-gray-500 dark:text-slate-500"
                    >
                      {characteristic.description}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Chip
                    label={t(`agents.characteristics.layers.${characteristic.layer}`, {
                      defaultValue: characteristic.layer,
                    })}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Chip
                    label={t(`characteristicManagement.scope.${scopeKey}`)}
                    size="small"
                    variant="outlined"
                    color={characteristic.isSystem ? 'info' : 'default'}
                  />
                </Box>

                <Typography
                  variant="body2"
                  className="line-clamp-2 text-gray-600 dark:text-slate-400"
                >
                  {characteristic.prompt}
                </Typography>

                <Box className="flex justify-end gap-1">
                  <Tooltip
                    title={
                      canManage
                        ? t('characteristicManagement.actions.edit')
                        : t('characteristicManagement.actions.systemCannotEdit')
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canManage || isDeleting}
                        onClick={() => setEditingCharacteristic(characteristic)}
                      >
                        <Pencil size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      canManage
                        ? t('characteristicManagement.actions.delete')
                        : t('characteristicManagement.actions.systemCannotDelete')
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canManage || isDeleting}
                        onClick={() => handleRequestDelete(characteristic)}
                      >
                        {isDeleting ? <CircularProgress size={16} /> : <Trash2 size={16} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <CreateCharacteristicModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
      <CreateCharacteristicModal
        open={Boolean(editingCharacteristic)}
        onClose={handleCloseEdit}
        onCreated={() => undefined}
        initialCharacteristic={editingCharacteristic}
        onUpdated={handleUpdated}
      />
      <ConfirmDialog
        open={Boolean(characteristicToDelete)}
        title={t('characteristicManagement.deleteDialog.title')}
        message={
          <>
            {t('characteristicManagement.deleteDialog.beforeName')}{' '}
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {characteristicToDelete?.name}
            </span>{' '}
            {t('characteristicManagement.deleteDialog.afterName')}
          </>
        }
        confirmText={t('characteristicManagement.actions.delete')}
        confirmColor="error"
        loading={Boolean(
          characteristicToDelete && deletingIds.has(characteristicToDelete.publicId)
        )}
        onClose={handleCloseDeleteDialog}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Box>
  );
};

export default CharacteristicManagement;
