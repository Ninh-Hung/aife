/**
 * Create Knowledge Modal
 * Modal for creating new knowledge sources
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { X, Save } from 'lucide-react';
import { Knowledge, CreateKnowledgeInput } from '../../types';
import { createKnowledge } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';

// ============================================
// Props Interface
// ============================================

interface CreateKnowledgeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (knowledge: Knowledge) => void;
}

// ============================================
// Initial Form State
// ============================================

const initialFormState: CreateKnowledgeInput = {
  name: '',
  description: '',
  sourceType: 'text',
  sourceContent: '',
};

// ============================================
// CreateKnowledgeModal Component
// ============================================

export const CreateKnowledgeModal: React.FC<CreateKnowledgeModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { success, error: showError } = useNotification();
  const [formData, setFormData] = useState<CreateKnowledgeInput>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateKnowledgeInput, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange =
    (field: keyof CreateKnowledgeInput) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
      // Clear error for this field
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateKnowledgeInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.sourceContent?.trim()) {
      newErrors.sourceContent = 'Content is required';
    } else if (formData.sourceContent.length < 10) {
      newErrors.sourceContent = 'Content must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await createKnowledge(formData);

      if (response.success && response.data) {
        success('Knowledge created successfully!');
        onCreated(response.data);
        setFormData(initialFormState);
        setErrors({});
      } else {
        showError(response.error || 'Failed to create knowledge');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create knowledge');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setFormData(initialFormState);
      setErrors({});
      onClose();
    }
  };

  const getContentLabel = () => {
    switch (formData.sourceType) {
      case 'text':
        return 'Text Content';
      case 'url':
        return 'URL';
      case 'file':
      case 'pdf':
        return 'File Path or Content';
      case 'repo':
        return 'Repository URL';
      default:
        return 'Content';
    }
  };

  const getContentPlaceholder = () => {
    switch (formData.sourceType) {
      case 'text':
        return 'Enter the text content that the agent should reference...';
      case 'url':
        return 'https://example.com/documentation';
      case 'file':
      case 'pdf':
        return 'File content or path...';
      case 'repo':
        return 'https://github.com/username/repository';
      default:
        return 'Enter content...';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: 'bg-white dark:bg-slate-800',
      }}
    >
      <DialogTitle className="border-b border-gray-200 dark:border-slate-700">
        <Box className="flex items-center justify-between">
          <span className="text-gray-900 dark:text-slate-100">Create New Knowledge</span>
          <IconButton
            onClick={handleClose}
            disabled={isSaving}
            size="small"
            className="text-gray-600 dark:text-slate-400"
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent className="mt-4">
        <Box className="space-y-4">
          <TextField
            label="Name"
            fullWidth
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name || 'e.g., Product Documentation, API Reference'}
            disabled={isSaving}
            required
          />

          <TextField
            label="Description"
            fullWidth
            value={formData.description}
            onChange={handleChange('description')}
            helperText="Brief description of this knowledge source (optional)"
            disabled={isSaving}
            multiline
            rows={2}
          />

          <FormControl fullWidth>
            <InputLabel>Source Type</InputLabel>
            <Select
              value={formData.sourceType}
              onChange={handleChange('sourceType')}
              label="Source Type"
              disabled={isSaving}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="url">URL</MenuItem>
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="repo">Repository</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label={getContentLabel()}
            fullWidth
            multiline
            rows={formData.sourceType === 'text' ? 8 : 3}
            value={formData.sourceContent}
            onChange={handleChange('sourceContent')}
            error={!!errors.sourceContent}
            helperText={
              errors.sourceContent ||
              (formData.sourceType === 'text'
                ? 'Paste the text content that the agent should reference'
                : 'Enter the source location or content')
            }
            disabled={isSaving}
            required
            placeholder={getContentPlaceholder()}
          />
        </Box>
      </DialogContent>

      <DialogActions className="border-t border-gray-200 px-6 py-4 dark:border-slate-700">
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isSaving}
          className="border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={18} /> : <Save size={18} />}
          className="bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:bg-gray-300 dark:disabled:bg-slate-700"
        >
          {isSaving ? 'Creating...' : 'Create Knowledge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
