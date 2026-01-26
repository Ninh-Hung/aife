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
  FormHelperText,
} from '@mui/material';
import { X, Save, Upload, FileText } from 'lucide-react';
import { Knowledge, KnowledgeSourceType } from '../../types';
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
// Form State Interface
// ============================================

interface FormState {
  name: string;
  description: string;
  sourceType: KnowledgeSourceType;
  content: string;
  files: File[];
}

// ============================================
// Validation Errors Interface
// ============================================

interface ValidationErrors {
  name?: string;
  content?: string;
  files?: string;
}

// ============================================
// Initial Form State
// ============================================

const initialFormState: FormState = {
  name: '',
  description: '',
  sourceType: 'text',
  content: '',
  files: [],
};

// ============================================
// Helper Functions
// ============================================

const isValidUrl = (url: string): boolean => {
  return url.startsWith('http://') || url.startsWith('https://');
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const isImageFile = (file: File): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const fileName = file.name.toLowerCase();
  return imageExtensions.some((ext) => fileName.endsWith(ext));
};

// ============================================
// CreateKnowledgeModal Component
// ============================================

export const CreateKnowledgeModal: React.FC<CreateKnowledgeModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  // ============================================
  // State
  // ============================================

  const { success, error: showError } = useNotification();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // ============================================
  // Validation Logic
  // ============================================

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Source-specific validation
    if (formData.sourceType === 'text') {
      if (!formData.content.trim()) {
        newErrors.content = 'Content is required';
      }
    } else if (formData.sourceType === 'url') {
      if (!formData.content.trim()) {
        newErrors.content = 'Source URL is required';
      } else if (!isValidUrl(formData.content)) {
        newErrors.content = 'URL must start with http:// or https://';
      }
    } else if (formData.sourceType === 'file') {
      if (formData.files.length === 0) {
        newErrors.files = 'Please select at least one file';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isSubmitDisabled = (): boolean => {
    // Name is empty
    if (!formData.name.trim()) return true;

    // Source-specific validation
    if (formData.sourceType === 'text' || formData.sourceType === 'url') {
      if (!formData.content.trim()) return true;
      if (formData.sourceType === 'url' && !isValidUrl(formData.content)) return true;
    }

    if (formData.sourceType === 'file' && formData.files.length === 0) {
      return true;
    }

    return false;
  };

  // ============================================
  // Event Handlers
  // ============================================

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: event.target.value }));
    setErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, description: event.target.value }));
  };

  const handleSourceTypeChange = (event: any) => {
    const newSourceType = event.target.value as KnowledgeSourceType;
    setFormData((prev) => ({
      ...prev,
      sourceType: newSourceType,
      content: '',
      files: [],
    }));
    setErrors({});
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, content: event.target.value }));
    setErrors((prev) => ({ ...prev, content: undefined }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    // Filter for supported extensions
    const supportedExtensions = ['.pdf', '.txt', '.md', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const validFiles = selectedFiles.filter((file) => {
      const fileName = file.name.toLowerCase();
      return supportedExtensions.some((ext) => fileName.endsWith(ext));
    });

    setFormData((prev) => ({ ...prev, files: [...prev.files, ...validFiles] }));
    setErrors((prev) => ({ ...prev, files: undefined }));

    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  // ============================================
  // Submit Handler
  // ============================================

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Prepare payload based on source type
      let payload: any;

      if (formData.sourceType === 'file') {
        // For file type, pass files for later upload handling
        payload = {
          name: formData.name,
          description: formData.description,
          source: 'file',
          files: formData.files,
        };
      } else {
        // For text and url types
        payload = {
          name: formData.name,
          description: formData.description,
          source: formData.sourceType,
          content: formData.content,
        };
      }

      const response = await createKnowledge(payload);

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

  // ============================================
  // Render
  // ============================================

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
          {/* Name Field */}
          <TextField
            label="Name"
            fullWidth
            value={formData.name}
            onChange={handleNameChange}
            error={!!errors.name}
            helperText={errors.name || 'e.g., Product Documentation, API Reference'}
            disabled={isSaving}
            required
          />

          {/* Description Field */}
          <TextField
            label="Description"
            fullWidth
            value={formData.description}
            onChange={handleDescriptionChange}
            helperText="Brief description of this knowledge source (optional)"
            disabled={isSaving}
            multiline
            rows={2}
          />

          {/* Source Type Selector */}
          <FormControl fullWidth>
            <InputLabel>Source Type</InputLabel>
            <Select
              value={formData.sourceType}
              onChange={handleSourceTypeChange}
              label="Source Type"
              disabled={isSaving}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="url">URL</MenuItem>
            </Select>
          </FormControl>

          {/* Conditional Input Rendering */}

          {/* Text Source Type */}
          {formData.sourceType === 'text' && (
            <TextField
              label="Content"
              fullWidth
              multiline
              rows={8}
              value={formData.content}
              onChange={handleContentChange}
              error={!!errors.content}
              helperText={errors.content || 'Paste the text content that the agent should reference'}
              disabled={isSaving}
              required
              placeholder="Enter text content for this knowledge source"
            />
          )}

          {/* URL Source Type */}
          {formData.sourceType === 'url' && (
            <TextField
              label="Source URL"
              fullWidth
              value={formData.content}
              onChange={handleContentChange}
              error={!!errors.content}
              helperText={errors.content}
              disabled={isSaving}
              required
              placeholder="https://example.com"
              type="url"
            />
          )}

          {/* File Source Type */}
          {formData.sourceType === 'file' && (
            <Box>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<Upload size={18} />}
                className="border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300"
                disabled={isSaving}
              >
                Select Files
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.txt,.md,.docx,.jpg,.jpeg,.png,.gif,.webp,.svg"
                  onChange={handleFileChange}
                />
              </Button>

              <FormHelperText error={!!errors.files}>
                {errors.files || 'Supported formats: Documents (.pdf, .txt, .md, .docx) and Images (.jpg, .png, .gif, .webp, .svg)'}
              </FormHelperText>

              {/* Selected Files Display */}
              {formData.files.length > 0 && (
                <Box className="mt-3 space-y-2">
                  {formData.files.map((file, index) => {
                    const isImage = isImageFile(file);
                    const imageUrl = isImage ? URL.createObjectURL(file) : null;

                    return (
                      <Box
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <Box className="flex items-center gap-3">
                          {isImage && imageUrl ? (
                            <Box className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-gray-300 dark:border-slate-600">
                              <img
                                src={imageUrl}
                                alt={file.name}
                                className="h-full w-full object-cover"
                                onLoad={() => URL.revokeObjectURL(imageUrl)}
                              />
                            </Box>
                          ) : (
                            <Box className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-200 dark:bg-slate-800">
                              <FileText size={20} className="text-gray-600 dark:text-slate-400" />
                            </Box>
                          )}
                          <Box className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              {formatFileSize(file.size)}
                              {isImage && ' • Image'}
                            </div>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isSaving}
                          className="ml-2 text-gray-600 dark:text-slate-400"
                        >
                          <X size={16} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
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
          disabled={isSaving || isSubmitDisabled()}
          startIcon={isSaving ? <CircularProgress size={18} /> : <Save size={18} />}
          className="bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:bg-gray-300 dark:disabled:bg-slate-700"
        >
          {isSaving ? 'Creating...' : 'Create Knowledge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
