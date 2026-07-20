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
import { useTranslation } from 'react-i18next';

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

const CHARACTERISTIC_LAYERS: CharacteristicLayer[] = [
  'identity',
  'tone_style',
  'values',
  'behavior',
  'constraints',
  'domain',
];

// ============================================
// CreateCharacteristicModal Component
// ============================================

export const CreateCharacteristicModal: React.FC<CreateCharacteristicModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { t } = useTranslation();
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
      newErrors.name = t('agents.characteristicForm.validation.nameRequired');
    }

    if (!formData.code.trim()) {
      newErrors.code = t('agents.characteristicForm.validation.codeRequired');
    } else if (!/^[a-z0-9._-]+$/.test(formData.code)) {
      newErrors.code = t('agents.characteristicForm.validation.codeInvalid');
    }

    if (!formData.layer) {
      newErrors.layer = t('agents.characteristicForm.validation.layerRequired');
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = t('agents.characteristicForm.validation.promptRequired');
    } else if (formData.prompt.length < 20) {
      newErrors.prompt = t('agents.characteristicForm.validation.promptTooShort');
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
        success(t('agents.characteristicForm.messages.created'));
        onCreated(response.data);
        setFormData(initialFormState);
        setErrors({});
      } else {
        showError(response.error || t('agents.characteristicForm.errors.createFailed'));
      }
    } catch (err) {
      showError(
        err instanceof Error ? err.message : t('agents.characteristicForm.errors.createFailed')
      );
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: 'bg-white dark:bg-slate-800',
      }}
    >
      <DialogTitle className="border-b border-gray-200 dark:border-slate-700">
        <Box className="flex items-center justify-between">
          <span className="text-gray-900 dark:text-slate-100">
            {t('agents.characteristicForm.title')}
          </span>
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
              {t('agents.characteristicForm.description')}
            </Typography>
          </Box>

          <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              label={t('agents.characteristicForm.fields.name')}
              fullWidth
              value={formData.name}
              onChange={handleChange('name')}
              error={!!errors.name}
              helperText={errors.name || t('agents.characteristicForm.fields.nameHelper')}
              disabled={isSaving}
              required
            />

            <FormControl fullWidth error={!!errors.layer} disabled={isSaving} required>
              <InputLabel>{t('agents.characteristicForm.fields.layer')}</InputLabel>
              <Select
                label={t('agents.characteristicForm.fields.layer')}
                value={formData.layer}
                onChange={handleLayerChange}
              >
                {CHARACTERISTIC_LAYERS.map((layer) => (
                  <MenuItem key={layer} value={layer}>
                    {t(`agents.characteristics.layers.${layer}`)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.layer || t(`agents.characteristicForm.layerHelpers.${formData.layer}`)}
              </FormHelperText>
            </FormControl>
          </Box>

          <TextField
            label={t('agents.characteristicForm.fields.code')}
            fullWidth
            value={formData.code}
            onChange={handleChange('code')}
            error={!!errors.code}
            helperText={errors.code || t('agents.characteristicForm.fields.codeHelper')}
            disabled={isSaving}
            required
          />

          <TextField
            label={t('agents.characteristicForm.fields.description')}
            fullWidth
            value={formData.description || ''}
            onChange={handleChange('description')}
            error={!!errors.description}
            helperText={
              errors.description || t('agents.characteristicForm.fields.descriptionHelper')
            }
            disabled={isSaving}
          />

          <TextField
            label={t('agents.characteristicForm.fields.prompt')}
            fullWidth
            multiline
            rows={8}
            value={formData.prompt}
            onChange={handleChange('prompt')}
            error={!!errors.prompt}
            helperText={errors.prompt || t('agents.characteristicForm.fields.promptHelper')}
            disabled={isSaving}
            required
            placeholder={t(`agents.characteristicForm.layerPlaceholders.${formData.layer}`)}
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
          {t('agents.characteristicForm.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={18} /> : <Save size={18} />}
          className="bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:bg-gray-300 dark:disabled:bg-slate-700"
        >
          {isSaving
            ? t('agents.characteristicForm.creating')
            : t('agents.characteristicForm.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
