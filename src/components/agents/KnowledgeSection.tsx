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
} from '@mui/material';
import { Plus, FileText, Globe, Upload } from 'lucide-react';
import { Knowledge, KnowledgeScope, KnowledgeSourceType } from '../../types';
import { listKnowledge } from '../../services/api';
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

  useEffect(() => {
    fetchKnowledge();
  }, [scopeFilter, typeFilter]);

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

  const renderKnowledgeItem = (knowledge: Knowledge) => {
    const selected = isSelected(knowledge);

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
            </Box>
            {knowledge.description && (
              <Typography variant="body2" className="mt-1 text-gray-600 dark:text-slate-400">
                {knowledge.description}
              </Typography>
            )}
          </Box>
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
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="repo">Repository</MenuItem>
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
