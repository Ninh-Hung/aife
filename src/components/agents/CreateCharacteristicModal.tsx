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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { X, Save } from 'lucide-react';
import { Characteristic, CharacteristicLayer, CreateCharacteristicInput } from '../../types';
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
  description: '',
  layer: 'behavior',
  prompt: '',
  status: 'published',
};

const CHARACTERISTIC_LAYERS: Array<{
  value: CharacteristicLayer;
  label: string;
  helper: string;
  placeholder: string;
}> = [
  {
    value: 'identity',
    label: 'Identity',
    helper: 'Who the agent is and what role it should play',
    placeholder: 'Example: You are a senior product advisor for early-stage SaaS founders...',
  },
  {
    value: 'tone_style',
    label: 'Tone & Style',
    helper: 'How the agent should sound when responding',
    placeholder: 'Example: Use concise, direct language. Avoid hype. Keep responses practical...',
  },
  {
    value: 'values',
    label: 'Values & Priorities',
    helper: 'What the agent should optimize for',
    placeholder:
      'Example: Prioritize accuracy, user safety, explicit tradeoffs, and practical next steps...',
  },
  {
    value: 'behavior',
    label: 'Behavioral Rules',
    helper: 'Reusable rules for how the agent should behave',
    placeholder: 'Example: Ask one clarifying question when the request lacks enough context...',
  },
  {
    value: 'constraints',
    label: 'Constraints',
    helper: 'Boundaries, refusals, and things the agent should avoid',
    placeholder:
      'Example: Do not invent facts. Say when information is uncertain or unavailable...',
  },
  {
    value: 'domain',
    label: 'Domain Guidance',
    helper: 'Domain-specific behavior or expertise style',
    placeholder:
      'Example: When discussing legal topics, explain risk categories and recommend professional review...',
  },
];

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

  const handleLayerChange = (event: SelectChangeEvent<CharacteristicLayer>) => {
    setFormData((prev) => ({
      ...prev,
      layer: event.target.value as CharacteristicLayer,
    }));
    setErrors((prev) => ({
      ...prev,
      layer: undefined,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCharacteristicInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Code is required';
    } else if (!/^[a-z0-9._-]+$/.test(formData.code)) {
      newErrors.code =
        'Code must contain lowercase letters, numbers, dots, hyphens, or underscores';
    }

    if (!formData.layer) {
      newErrors.layer = 'Layer is required';
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
      const response = await createCharacteristic({
        ...formData,
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        prompt: formData.prompt.trim(),
        status: 'published',
      });

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

  const selectedLayer = CHARACTERISTIC_LAYERS.find((layer) => layer.value === formData.layer);

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
          <Box>
            <Typography variant="body2" className="mb-3 text-gray-600 dark:text-slate-400">
              Create one reusable prompt layer. You can combine identity, tone, values, and rules
              when building an agent.
            </Typography>
          </Box>

          <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={handleChange('name')}
              error={!!errors.name}
              helperText={errors.name || 'e.g., Friendly Tone, Risk-Aware Advisor'}
              disabled={isSaving}
              required
            />

            <FormControl fullWidth error={!!errors.layer} disabled={isSaving} required>
              <InputLabel>Layer</InputLabel>
              <Select label="Layer" value={formData.layer} onChange={handleLayerChange}>
                {CHARACTERISTIC_LAYERS.map((layer) => (
                  <MenuItem key={layer.value} value={layer.value}>
                    {layer.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.layer || selectedLayer?.helper}</FormHelperText>
            </FormControl>
          </Box>

          <TextField
            label="Code"
            fullWidth
            value={formData.code}
            onChange={handleChange('code')}
            error={!!errors.code}
            helperText={errors.code || 'Unique identifier, auto-generated from name'}
            disabled={isSaving}
            required
          />

          <TextField
            label="Description"
            fullWidth
            value={formData.description || ''}
            onChange={handleChange('description')}
            error={!!errors.description}
            helperText={errors.description || 'Short note shown when selecting characteristics'}
            disabled={isSaving}
          />

          <TextField
            label="Prompt"
            fullWidth
            multiline
            rows={8}
            value={formData.prompt}
            onChange={handleChange('prompt')}
            error={!!errors.prompt}
            helperText={
              errors.prompt || 'This prompt block will be injected under the selected layer'
            }
            disabled={isSaving}
            required
            placeholder={selectedLayer?.placeholder}
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
