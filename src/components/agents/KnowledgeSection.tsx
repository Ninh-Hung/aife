/**
 * Knowledge Section Component
 * Multi-select section for choosing and creating knowledge sources
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus, FileText, Globe, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { Knowledge, KnowledgeScope, KnowledgeSourceType } from '../../types';
import { deleteKnowledge, getKnowledge, listKnowledge, resyncKnowledge } from '../../services/api';
import { CreateKnowledgeModal } from './CreateKnowledgeModal';

// ============================================
// Props Interface
// ============================================

interface KnowledgeSectionProps {
  selectedKnowledgeIds: string[];
  onKnowledgeToggle: (knowledgeId: string) => void;
  onKnowledgeCreated: (knowledge: Knowledge) => void;
}

// ============================================
// Helper Functions
// ============================================

const getSourceTypeIcon = (sourceType: KnowledgeSourceType) => {
  switch (sourceType) {
    case 'text':
      return <FileText size={16} />;
    case 'url':
      return <Globe size={16} />;
    case 'file':
      return <Upload size={16} />;
    default:
      return <FileText size={16} />;
  }
};

const getSourceTypeColor = (sourceType: KnowledgeSourceType) => {
  switch (sourceType) {
    case 'text':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'url':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'file':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getScopeColor = (ownerType: string) => {
  switch (ownerType) {
    case 'SYSTEM':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'USER':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'PROJECT':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getSyncStatusColor = (syncStatus?: string | null) => {
  switch (syncStatus) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'partial':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'processing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'pending':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
    case 'deleting':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

const getKnowledgeErrorMessage = (errorSummary?: string | null): string | null => {
  if (!errorSummary) return null;

  try {
    const parsed = JSON.parse(errorSummary) as {
      error?: string;
      errors?: string[];
    };
    const message = parsed.error || parsed.errors?.join('; ');
    return message ? truncateText(message, 180) : truncateText(errorSummary, 180);
  } catch {
    return truncateText(errorSummary, 180);
  }
};

const truncateText = (value: string, maxLength: number): string => {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;
};

const isSyncInProgress = (knowledge: Knowledge): boolean => {
  const status = knowledge.syncStatus || 'pending';
  return status === 'pending' || status === 'processing';
};

// ============================================
// KnowledgeSection Component
// ============================================

export const KnowledgeSection: React.FC<KnowledgeSectionProps> = ({
  selectedKnowledgeIds,
  onKnowledgeToggle,
  onKnowledgeCreated,
}) => {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<KnowledgeScope>('all');
  const [typeFilter, setTypeFilter] = useState<KnowledgeSourceType | 'all'>('all');
  const [resyncingIds, setResyncingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const pollingKnowledgeKey = knowledgeList
    .filter(isSyncInProgress)
    .map((knowledge) => knowledge.publicId)
    .sort()
    .join('|');

  useEffect(() => {
    fetchKnowledge();
  }, [scopeFilter, typeFilter]);

  useEffect(() => {
    const pollingIds = pollingKnowledgeKey ? pollingKnowledgeKey.split('|') : [];

    if (pollingIds.length === 0) {
      return;
    }

    let cancelled = false;

    const pollKnowledgeStatus = async () => {
      const responses = await Promise.all(
        pollingIds.map((publicId) => getKnowledge(publicId))
      );

      if (cancelled) {
        return;
      }

      const updatedById = new Map(
        responses
          .filter((response): response is typeof response & { data: Knowledge } =>
            Boolean(response.success && response.data)
          )
          .map((response) => [response.data.publicId, response.data])
      );

      if (updatedById.size === 0) {
        return;
      }

      setKnowledgeList((prev) =>
        prev.map((knowledge) => updatedById.get(knowledge.publicId) ?? knowledge)
      );
    };

    const intervalId = window.setInterval(pollKnowledgeStatus, 3500);
    void pollKnowledgeStatus();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollingKnowledgeKey]);

  const fetchKnowledge = async () => {
    setLoading(true);
    setFetchError(null);

    const response = await listKnowledge(
      scopeFilter,
      typeFilter === 'all' ? undefined : typeFilter
    );

    if (response.success && response.data) {
      setKnowledgeList(response.data);
    } else {
      setFetchError(response.error || 'Failed to load knowledge');
    }

    setLoading(false);
  };

  const isSelected = (knowledge: Knowledge): boolean => {
    return selectedKnowledgeIds.includes(knowledge.publicId);
  };

  const handleKnowledgeCreated = (knowledge: Knowledge) => {
    setKnowledgeList((prev) => [knowledge, ...prev]);
    onKnowledgeCreated(knowledge);
    setIsModalOpen(false);
  };

  const handleResync = async (event: React.MouseEvent, knowledge: Knowledge) => {
    event.stopPropagation();
    setResyncingIds((prev) => new Set(prev).add(knowledge.publicId));

    const response = await resyncKnowledge(knowledge.publicId);
    if (response.success && response.data) {
      setKnowledgeList((prev) =>
        prev.map((item) =>
          item.publicId === knowledge.publicId ? response.data! : item
        )
      );
    } else {
      setFetchError(response.error || 'Failed to resync knowledge');
    }

    setResyncingIds((prev) => {
      const next = new Set(prev);
      next.delete(knowledge.publicId);
      return next;
    });
  };

  const handleDelete = async (event: React.MouseEvent, knowledge: Knowledge) => {
    event.stopPropagation();

    if (!window.confirm(`Delete "${knowledge.name}" and its indexed knowledge artifacts?`)) {
      return;
    }

    setDeletingIds((prev) => new Set(prev).add(knowledge.publicId));

    const response = await deleteKnowledge(knowledge.publicId);
    if (response.success) {
      setKnowledgeList((prev) =>
        prev.filter((item) => item.publicId !== knowledge.publicId)
      );
      if (isSelected(knowledge)) {
        onKnowledgeToggle(knowledge.publicId);
      }
    } else {
      setFetchError(response.error || 'Failed to delete knowledge');
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(knowledge.publicId);
      return next;
    });
  };

  const renderKnowledgeItem = (knowledge: Knowledge) => {
    const selected = isSelected(knowledge);
    const syncStatus = knowledge.syncStatus || 'pending';
    const isResyncing = resyncingIds.has(knowledge.publicId);
    const isDeleting = deletingIds.has(knowledge.publicId) || syncStatus === 'deleting';
    const actionDisabled = isResyncing || isDeleting;
    const syncErrorMessage = getKnowledgeErrorMessage(knowledge.errorSummary);

    return (
      <Box
        key={knowledge.publicId}
        onClick={() => onKnowledgeToggle(knowledge.publicId)}
        className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
          selected
            ? 'border-2 border-[#3B82F6] bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
        }`}
      >
        <Box className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            disableRipple
            tabIndex={-1}
            inputProps={{ readOnly: true }}
            className={selected ? 'text-[#3B82F6]' : ''}
            sx={{ mt: -1 }}
          />
          <Box className="flex-1">
            <Box className="mb-2 flex flex-wrap items-center gap-2">
              <Typography
                variant="subtitle1"
                className={`font-semibold ${
                  selected
                    ? 'text-[#3B82F6] dark:text-blue-400'
                    : 'text-gray-900 dark:text-slate-100'
                }`}
              >
                {knowledge.name}
              </Typography>
              <Chip
                icon={getSourceTypeIcon(knowledge.sourceType)}
                label={knowledge.sourceType.toUpperCase()}
                size="small"
                className={getSourceTypeColor(knowledge.sourceType)}
              />
              <Chip
                label={knowledge.ownerType}
                size="small"
                className={getScopeColor(knowledge.ownerType)}
              />
              <Chip
                label={syncStatus.toUpperCase()}
                size="small"
                className={getSyncStatusColor(syncStatus)}
              />
            </Box>
            {knowledge.description && (
              <Typography variant="body2" className="mt-1 text-gray-600 dark:text-slate-400">
                {knowledge.description}
              </Typography>
            )}
            <Typography variant="caption" className="mt-1 block text-gray-500 dark:text-slate-500">
              {knowledge.chunkCount ?? 0} chunks · {knowledge.vectorCount ?? 0} vectors
              {knowledge.syncedAt ? ` · synced ${new Date(knowledge.syncedAt).toLocaleString()}` : ''}
            </Typography>
            {(syncStatus === 'failed' || syncStatus === 'partial') && syncErrorMessage && (
              <Typography variant="caption" className="mt-1 block text-red-600 dark:text-red-300">
                {syncErrorMessage}
              </Typography>
            )}
          </Box>
          {knowledge.ownerType !== 'SYSTEM' && (
            <Box className="flex items-center gap-1">
              <Tooltip title="Resync knowledge">
                <span>
                  <IconButton
                    size="small"
                    disabled={actionDisabled}
                    onClick={(event) => handleResync(event, knowledge)}
                    className="text-gray-500 hover:text-[#3B82F6] dark:text-slate-400"
                  >
                    {isResyncing ? (
                      <CircularProgress size={16} />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete knowledge">
                <span>
                  <IconButton
                    size="small"
                    disabled={actionDisabled}
                    onClick={(event) => handleDelete(event, knowledge)}
                    className="text-gray-500 hover:text-red-600 dark:text-slate-400"
                  >
                    {isDeleting ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box className="space-y-4">
      <Box className="mb-4">
        <Typography variant="h6" className="mb-1 font-semibold text-gray-900 dark:text-slate-100">
          Knowledge & Context
        </Typography>
        <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
          Attach contextual data your agent can reference
        </Typography>
      </Box>

      <Box className="flex gap-3">
        <FormControl size="small" className="flex-1">
          <InputLabel>Scope</InputLabel>
          <Select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as KnowledgeScope)}
            label="Scope"
            className="bg-white dark:bg-slate-800"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="user">My Knowledge</MenuItem>
            <MenuItem value="project">Project</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" className="flex-1">
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as KnowledgeSourceType | 'all')}
            label="Type"
            className="bg-white dark:bg-slate-800"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="url">URL</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<Plus size={18} />}
        onClick={() => setIsModalOpen(true)}
        className="border-dashed border-gray-300 text-gray-700 hover:border-[#3B82F6] hover:text-[#3B82F6] dark:border-slate-600 dark:text-slate-300"
      >
        Create New Knowledge
      </Button>

      {loading ? (
        <Box className="flex items-center justify-center py-8">
          <CircularProgress size={32} />
        </Box>
      ) : fetchError ? (
        <Alert severity="error">{fetchError}</Alert>
      ) : (
        <Box className="max-h-[400px] space-y-2 overflow-y-auto">
          {knowledgeList.map(renderKnowledgeItem)}

          {knowledgeList.length === 0 && (
            <Box className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <Typography className="text-gray-600 dark:text-slate-400">
                No knowledge sources found. Create one to get started!
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <CreateKnowledgeModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleKnowledgeCreated}
      />
    </Box>
  );
};
