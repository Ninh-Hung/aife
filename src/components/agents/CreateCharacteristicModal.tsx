/**
 * Create Characteristic Modal
 * Modal for creating new user characteristics
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
} from '@mui/material';
import { X, Save } from 'lucide-react';
import { Characteristic, CreateCharacteristicInput } from '../../types';
import { createCharacteristic } from '../../services/api';
import { useNotification } from '../../hooks/useNotification';

// ============================================
// Props Interface
// ============================================

interface CreateCharacteristicModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (characteristic: Characteristic) => void;
}

// ============================================
// Initial Form State
// ============================================

const initialFormState: CreateCharacteristicInput = {
  code: '',
  name: '',
  prompt: '',
};

// ============================================
// CreateCharacteristicModal Component
// ============================================

export const CreateCharacteristicModal: React.FC<CreateCharacteristicModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { success, error: showError } = useNotification();
  const [formData, setFormData] = useState<CreateCharacteristicInput>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateCharacteristicInput, string>>>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleChange =
    (field: keyof CreateCharacteristicInput) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
      // Clear error for this field
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));

      // Auto-generate code from name if code is empty
      if (field === 'name' && !formData.code) {
        const code = event.target.value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
        setFormData((prev) => ({
          ...prev,
          code,
        }));
      }
    };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCharacteristicInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[a-z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = 'Behavior definition is required';
    } else if (formData.prompt.length < 20) {
      newErrors.prompt = 'Behavior definition must be at least 20 characters';
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
      const response = await createCharacteristic(formData);

      if (response.success && response.data) {
        success('Characteristic created successfully!');
        onCreated(response.data);
        setFormData(initialFormState);
        setErrors({});
      } else {
        showError(response.error || 'Failed to create characteristic');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create characteristic');
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: 'bg-white dark:bg-slate-800',
      }}
    >
      <DialogTitle className="border-b border-gray-200 dark:border-slate-700">
        <Box className="flex items-center justify-between">
          <span className="text-gray-900 dark:text-slate-100">Create New Characteristic</span>
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
            helperText={errors.name || 'e.g., Professional Tone, Friendly Assistant'}
            disabled={isSaving}
            required
          />

          <TextField
            label="Code"
            fullWidth
            value={formData.code}
            onChange={handleChange('code')}
            error={!!errors.code}
            helperText={
              errors.code || 'Unique identifier (auto-generated from name, lowercase_with_underscores)'
            }
            disabled={isSaving}
            required
          />

          <TextField
            label="Behavior Definition"
            fullWidth
            multiline
            rows={8}
            value={formData.prompt}
            onChange={handleChange('prompt')}
            error={!!errors.prompt}
            helperText={
              errors.prompt ||
              'Define how the agent should behave when this characteristic is applied'
            }
            disabled={isSaving}
            required
            placeholder="Example: You are a professional communicator who maintains a formal tone. Always be concise, accurate, and respectful in your responses..."
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
          {isSaving ? 'Creating...' : 'Create Characteristic'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
