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
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BookOpen,
  FileText,
  Globe,
  RefreshCw,
  Trash2,
  Upload,
  Plus,
} from 'lucide-react';
import { CreateKnowledgeModal } from '../components/agents/CreateKnowledgeModal';
import type { Knowledge, KnowledgeScope, KnowledgeSourceType } from '../types';
import {
  deleteKnowledge,
  getKnowledge,
  listKnowledge,
  resyncKnowledge,
} from '../services/api';

const getStatusColor = (status?: string | null) => {
  switch (status) {
    case 'success':
      return 'success';
    case 'partial':
      return 'warning';
    case 'failed':
      return 'error';
    case 'processing':
      return 'info';
    case 'deleting':
      return 'error';
    default:
      return 'default';
  }
};

const getSourceIcon = (sourceType: KnowledgeSourceType) => {
  switch (sourceType) {
    case 'file':
      return <Upload size={16} />;
    case 'url':
      return <Globe size={16} />;
    default:
      return <FileText size={16} />;
  }
};

const getErrorMessage = (errorSummary?: string | null): string | null => {
  if (!errorSummary) return null;

  try {
    const parsed = JSON.parse(errorSummary) as { error?: string; errors?: string[] };
    return parsed.error || parsed.errors?.join('; ') || errorSummary;
  } catch {
    return errorSummary;
  }
};

const isSyncInProgress = (knowledge: Knowledge): boolean => {
  const status = knowledge.syncStatus || 'pending';
  return status === 'pending' || status === 'processing';
};

export const KnowledgeManagement: React.FC = () => {
  const [knowledgeList, setKnowledgeList] = useState<Knowledge[]>([]);
  const [scopeFilter, setScopeFilter] = useState<KnowledgeScope>('all');
  const [typeFilter, setTypeFilter] = useState<KnowledgeSourceType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resyncingIds, setResyncingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const pollingKey = useMemo(
    () =>
      knowledgeList
        .filter(isSyncInProgress)
        .map((knowledge) => knowledge.publicId)
        .sort()
        .join('|'),
    [knowledgeList],
  );

  const loadKnowledge = async () => {
    setIsLoading(true);
    setError(null);

    const response = await listKnowledge(
      scopeFilter,
      typeFilter === 'all' ? undefined : typeFilter,
    );

    if (response.success && response.data) {
      setKnowledgeList(response.data);
    } else {
      setError(response.error || 'Failed to load knowledge');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadKnowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeFilter, typeFilter]);

  useEffect(() => {
    const ids = pollingKey ? pollingKey.split('|') : [];
    if (ids.length === 0) return;

    let cancelled = false;

    const poll = async () => {
      const responses = await Promise.all(ids.map((id) => getKnowledge(id)));
      if (cancelled) return;

      const updatedById = new Map(
        responses
          .filter((response): response is typeof response & { data: Knowledge } =>
            Boolean(response.success && response.data),
          )
          .map((response) => [response.data.publicId, response.data]),
      );

      if (updatedById.size > 0) {
        setKnowledgeList((current) =>
          current.map((knowledge) => updatedById.get(knowledge.publicId) ?? knowledge),
        );
      }
    };

    const intervalId = window.setInterval(poll, 3500);
    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pollingKey]);

  const handleCreated = (knowledge: Knowledge) => {
    setKnowledgeList((current) => [knowledge, ...current]);
    setIsCreateOpen(false);
  };

  const handleResync = async (knowledge: Knowledge) => {
    setResyncingIds((current) => new Set(current).add(knowledge.publicId));
    const response = await resyncKnowledge(knowledge.publicId);

    if (response.success && response.data) {
      setKnowledgeList((current) =>
        current.map((item) => (item.publicId === knowledge.publicId ? response.data! : item)),
      );
    } else {
      setError(response.error || 'Failed to resync knowledge');
    }

    setResyncingIds((current) => {
      const next = new Set(current);
      next.delete(knowledge.publicId);
      return next;
    });
  };

  const handleDelete = async (knowledge: Knowledge) => {
    if (!window.confirm(`Delete "${knowledge.name}" and its indexed artifacts?`)) return;

    setDeletingIds((current) => new Set(current).add(knowledge.publicId));
    const response = await deleteKnowledge(knowledge.publicId);

    if (response.success) {
      setKnowledgeList((current) =>
        current.filter((item) => item.publicId !== knowledge.publicId),
      );
    } else {
      setError(response.error || 'Failed to delete knowledge');
    }

    setDeletingIds((current) => {
      const next = new Set(current);
      next.delete(knowledge.publicId);
      return next;
    });
  };

  return (
    <Box className="h-full bg-gray-50 p-6 dark:bg-slate-900">
      <Box className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Box>
          <Box className="mb-1 flex items-center gap-2">
            <BookOpen size={22} className="text-blue-600 dark:text-blue-400" />
            <Typography variant="h5" className="font-semibold text-gray-900 dark:text-slate-100">
              Knowledge
            </Typography>
          </Box>
          <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
            Manage persistent sources used by your agents for RAG.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setIsCreateOpen(true)}
        >
          Create Knowledge
        </Button>
      </Box>

      <Box className="mb-4 flex flex-col gap-3 md:flex-row">
        <FormControl size="small" className="min-w-[180px]">
          <InputLabel>Scope</InputLabel>
          <Select
            value={scopeFilter}
            label="Scope"
            onChange={(event) => setScopeFilter(event.target.value as KnowledgeScope)}
            className="bg-white dark:bg-slate-800"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="user">My Knowledge</MenuItem>
            <MenuItem value="project">Project</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" className="min-w-[180px]">
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(event) => setTypeFilter(event.target.value as KnowledgeSourceType | 'all')}
            className="bg-white dark:bg-slate-800"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="url">URL</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={() => void loadKnowledge()}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Box className="grid grid-cols-[1.4fr_120px_120px_160px_120px] gap-4 border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
          <span>Name</span>
          <span>Source</span>
          <span>Scope</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </Box>

        {isLoading ? (
          <Box className="flex items-center justify-center py-12">
            <CircularProgress size={28} />
          </Box>
        ) : knowledgeList.length === 0 ? (
          <Box className="px-4 py-12 text-center">
            <Typography className="text-gray-600 dark:text-slate-400">
              No knowledge sources found.
            </Typography>
          </Box>
        ) : (
          knowledgeList.map((knowledge) => {
            const status = knowledge.syncStatus || 'pending';
            const syncError = getErrorMessage(knowledge.errorSummary);
            const isResyncing = resyncingIds.has(knowledge.publicId);
            const isDeleting = deletingIds.has(knowledge.publicId) || status === 'deleting';
            const actionDisabled = isResyncing || isDeleting || knowledge.ownerType === 'SYSTEM';

            return (
              <Box
                key={knowledge.publicId}
                className="grid grid-cols-[1.4fr_120px_120px_160px_120px] gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-slate-700"
              >
                <Box className="min-w-0">
                  <Typography className="truncate font-medium text-gray-900 dark:text-slate-100">
                    {knowledge.name}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 dark:text-slate-500">
                    {knowledge.chunkCount ?? 0} chunks · {knowledge.vectorCount ?? 0} vectors
                    {knowledge.files?.length ? ` · ${knowledge.files.length} files` : ''}
                  </Typography>
                  {syncError && (status === 'failed' || status === 'partial') && (
                    <Typography variant="caption" className="block truncate text-red-600 dark:text-red-300">
                      {syncError}
                    </Typography>
                  )}
                </Box>

                <Box>
                  <Chip
                    icon={getSourceIcon(knowledge.sourceType)}
                    label={knowledge.sourceType.toUpperCase()}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Chip label={knowledge.ownerType} size="small" variant="outlined" />
                </Box>

                <Box>
                  <Chip
                    label={status.toUpperCase()}
                    size="small"
                    color={getStatusColor(status)}
                    variant={status === 'pending' ? 'outlined' : 'filled'}
                  />
                  {knowledge.syncedAt && (
                    <Typography variant="caption" className="mt-1 block text-gray-500 dark:text-slate-500">
                      {new Date(knowledge.syncedAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>

                <Box className="flex justify-end gap-1">
                  <Tooltip title={knowledge.ownerType === 'SYSTEM' ? 'System knowledge cannot be resynced here' : 'Resync'}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={actionDisabled}
                        onClick={() => void handleResync(knowledge)}
                      >
                        {isResyncing ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={knowledge.ownerType === 'SYSTEM' ? 'System knowledge cannot be deleted here' : 'Delete'}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={actionDisabled}
                        onClick={() => void handleDelete(knowledge)}
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

      <CreateKnowledgeModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </Box>
  );
};

export default KnowledgeManagement;
