/**
 * Agent Management Drawer
 * Slides in from the right for creating/editing AI agents
 */

import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  Slider,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText,
} from '@mui/material';
import { X, Sparkles, Save } from 'lucide-react';
import { CreateAgentInput } from '../../types';
import { useNotification } from '../../hooks/useNotification';

// ============================================
// Props Interface
// ============================================

interface AgentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: CreateAgentInput) => Promise<void>;
}

// ============================================
// Initial Form State
// ============================================

const initialFormState: CreateAgentInput = {
  name: '',
  role: '',
  systemPrompt: '',
  creativityLevel: 50,
};

// ============================================
// AgentDrawer Component
// ============================================

export const AgentDrawer: React.FC<AgentDrawerProps> = ({ open, onClose, onSave }) => {
  const { success, error } = useNotification();
  const [formData, setFormData] = useState<CreateAgentInput>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateAgentInput, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // ============================================
  // Handlers
  // ============================================

  const handleChange =
    (field: keyof CreateAgentInput) =>
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
    };

  const handleCreativityChange = (_: Event, value: number | number[]) => {
    setFormData((prev) => ({
      ...prev,
      creativityLevel: value as number,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateAgentInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role/Persona is required';
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    } else if (formData.systemPrompt.length < 20) {
      newErrors.systemPrompt = 'System prompt must be at least 20 characters';
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
      await onSave(formData);
      // Reset form and close drawer on success
      success('Agent created successfully!');
      setFormData(initialFormState);
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to save agent');
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
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 500 },
        },
        className: 'bg-white dark:bg-slate-800',
      }}
    >
      <Box className="flex h-full flex-col">
        {/* Header */}
        <Box className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <Box className="flex items-center gap-2">
            <Sparkles className="text-indigo-600 dark:text-indigo-400" size={24} />
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-slate-100">
              Create New Agent
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-600 dark:text-slate-400"
            size="small"
          >
            <X size={20} />
          </IconButton>
        </Box>

        {/* Form Content */}
        <Box className="flex-1 overflow-y-auto px-6 py-6">
          <Box className="space-y-6">
            {/* Agent Name */}
            <FormControl fullWidth error={!!errors.name}>
              <InputLabel htmlFor="agent-name">Agent Name</InputLabel>
              <OutlinedInput
                id="agent-name"
                label="Agent Name"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="e.g., Professional Translator"
                disabled={isSaving}
              />
              {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
            </FormControl>

            {/* Role/Persona */}
            <FormControl fullWidth error={!!errors.role}>
              <InputLabel htmlFor="agent-role">Role / Persona</InputLabel>
              <OutlinedInput
                id="agent-role"
                label="Role / Persona"
                value={formData.role}
                onChange={handleChange('role')}
                placeholder="e.g., Expert Translator with cultural awareness"
                disabled={isSaving}
              />
              {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
              <FormHelperText>Describe the agent's expertise and personality</FormHelperText>
            </FormControl>

            <Divider />

            {/* System Prompt */}
            <FormControl fullWidth error={!!errors.systemPrompt}>
              <TextField
                label="System Prompt"
                multiline
                rows={8}
                value={formData.systemPrompt}
                onChange={handleChange('systemPrompt')}
                placeholder="You are a professional translator specializing in accurate, context-aware translations. Maintain the tone and style of the original text while ensuring cultural appropriateness..."
                disabled={isSaving}
                error={!!errors.systemPrompt}
                helperText={
                  errors.systemPrompt ||
                  'Define how the agent should behave and what guidelines it should follow'
                }
              />
            </FormControl>

            <Divider />

            {/* Creativity Level */}
            <Box>
              <Typography
                variant="subtitle2"
                className="mb-2 font-semibold text-gray-900 dark:text-slate-100"
              >
                Creativity Level
              </Typography>
              <Typography
                variant="caption"
                className="mb-4 block text-gray-600 dark:text-slate-400"
              >
                Lower values (0-30): More precise and consistent translations
                <br />
                Medium values (30-70): Balanced creativity and accuracy
                <br />
                Higher values (70-100): More creative and varied translations
              </Typography>

              <Box className="px-2">
                <Slider
                  value={formData.creativityLevel}
                  onChange={handleCreativityChange}
                  valueLabelDisplay="on"
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                  ]}
                  disabled={isSaving}
                  className="text-indigo-600 dark:text-indigo-400"
                />
              </Box>

              <Box className="mt-2 flex justify-between text-xs">
                <Typography variant="caption" className="text-gray-500 dark:text-slate-500">
                  Precise
                </Typography>
                <Typography
                  variant="caption"
                  className="font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  {formData.creativityLevel}
                </Typography>
                <Typography variant="caption" className="text-gray-500 dark:text-slate-500">
                  Creative
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <Button
            variant="outlined"
            fullWidth
            onClick={handleClose}
            disabled={isSaving}
            className="border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={isSaving}
            startIcon={<Save size={18} />}
            className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700"
          >
            {isSaving ? 'Saving...' : 'Save Agent'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
