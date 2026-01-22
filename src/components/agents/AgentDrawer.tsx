/**
 * Agent Management Drawer
 * Refactored to support capability-driven, data-driven architecture
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { X, Sparkles, Save, ChevronDown } from 'lucide-react';
import { Agent, CreateAgentInput, Characteristic, Knowledge } from '../../types';
import { useNotification } from '../../hooks/useNotification';
import { CapabilitiesSection } from './CapabilitiesSection';
import { CharacteristicsSection } from './CharacteristicsSection';
import { KnowledgeSection } from './KnowledgeSection';

// ============================================
// Props Interface
// ============================================

interface AgentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: CreateAgentInput) => Promise<void>;
  agent?: Agent | null;
  onUpdate?: (id: string, agent: Partial<CreateAgentInput>) => Promise<void>;
}

// ============================================
// Initial Form State
// ============================================

const initialFormState: CreateAgentInput = {
  name: '',
  description: '',
  capabilityIds: [],
  characteristicIds: [],
  knowledgeIds: [],
  ownerType: 'USER',
};

// ============================================
// AgentDrawer Component
// ============================================

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  open,
  onClose,
  onSave,
  agent,
  onUpdate,
}) => {
  const { success, error } = useNotification();
  const [formData, setFormData] = useState<CreateAgentInput>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateAgentInput, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!agent;

  // Pre-fill form when editing
  useEffect(() => {
    if (agent && open) {
      setFormData({
        name: agent.name,
        description: agent.description || '',
        capabilityIds: agent.capabilityIds || [],
        characteristicIds: agent.characteristicIds || [],
        knowledgeIds: agent.knowledgeIds || [],
        ownerType: agent.ownerType || 'USER',
        ownerId: agent.ownerId,
      });
    } else if (!open) {
      // Reset form when drawer closes
      setFormData(initialFormState);
      setErrors({});
    }
  }, [agent, open]);

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

  const handleCapabilityToggle = (capabilityId: number) => {
    setFormData((prev) => {
      const isSelected = prev.capabilityIds.includes(capabilityId);
      return {
        ...prev,
        capabilityIds: isSelected
          ? prev.capabilityIds.filter((id) => id !== capabilityId)
          : [...prev.capabilityIds, capabilityId],
      };
    });
    // Clear capability error if any
    setErrors((prev) => ({ ...prev, capabilityIds: undefined }));
  };

  const handleCharacteristicToggle = (characteristicId: number) => {
    setFormData((prev) => {
      const isSelected = prev.characteristicIds.includes(characteristicId);
      return {
        ...prev,
        characteristicIds: isSelected
          ? prev.characteristicIds.filter((id) => id !== characteristicId)
          : [...prev.characteristicIds, characteristicId],
      };
    });
  };

  const handleKnowledgeToggle = (knowledgeId: number) => {
    setFormData((prev) => {
      const isSelected = prev.knowledgeIds.includes(knowledgeId);
      return {
        ...prev,
        knowledgeIds: isSelected
          ? prev.knowledgeIds.filter((id) => id !== knowledgeId)
          : [...prev.knowledgeIds, knowledgeId],
      };
    });
  };

  const handleCharacteristicCreated = (characteristic: Characteristic) => {
    // Auto-select newly created characteristic
    const charId = parseInt(characteristic.publicId);
    if (!formData.characteristicIds.includes(charId)) {
      setFormData((prev) => ({
        ...prev,
        characteristicIds: [...prev.characteristicIds, charId],
      }));
    }
  };

  const handleKnowledgeCreated = (knowledge: Knowledge) => {
    // Auto-select newly created knowledge
    const knowledgeId = parseInt(knowledge.publicId);
    if (!formData.knowledgeIds.includes(knowledgeId)) {
      setFormData((prev) => ({
        ...prev,
        knowledgeIds: [...prev.knowledgeIds, knowledgeId],
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateAgentInput, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Agent name is required';
    }

    if (formData.capabilityIds.length === 0) {
      newErrors.capabilityIds = 'At least one capability is required';
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
      if (isEditMode && agent && onUpdate) {
        await onUpdate(agent.id, formData);
        success('Agent updated successfully!');
      } else {
        await onSave(formData);
        success('Agent created successfully!');
      }
      // Reset form and close drawer on success
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
          width: { xs: '100%', sm: 600 },
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
              {isEditMode ? 'Edit Agent' : 'Create New Agent'}
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
            {/* 1. Basic Information */}
            <Box>
              <Typography
                variant="subtitle1"
                className="mb-3 font-semibold text-gray-900 dark:text-slate-100"
              >
                1. Basic Information
              </Typography>

              <Box className="space-y-4">
                <FormControl fullWidth error={!!errors.name}>
                  <InputLabel htmlFor="agent-name">Agent Name *</InputLabel>
                  <OutlinedInput
                    id="agent-name"
                    label="Agent Name *"
                    value={formData.name}
                    onChange={handleChange('name')}
                    placeholder="e.g., Professional Translator"
                    disabled={isSaving}
                  />
                  {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
                </FormControl>

                <FormControl fullWidth>
                  <TextField
                    label="Description"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={handleChange('description')}
                    placeholder="Describe what this agent does and its personality..."
                    disabled={isSaving}
                    helperText="Optional: Metadata describing this agent (not used as system prompt)"
                  />
                </FormControl>
              </Box>
            </Box>

            <Divider />

            {/* 2. Capabilities */}
            <Box>
              <Typography
                variant="subtitle1"
                className="mb-3 font-semibold text-gray-900 dark:text-slate-100"
              >
                2. Capabilities *
              </Typography>
              <CapabilitiesSection
                selectedCapabilityIds={formData.capabilityIds}
                onCapabilityToggle={handleCapabilityToggle}
                error={errors.capabilityIds}
              />
            </Box>

            <Divider />

            {/* 3. Characteristics */}
            <Box>
              <Typography
                variant="subtitle1"
                className="mb-3 font-semibold text-gray-900 dark:text-slate-100"
              >
                3. Behavior & Persona
              </Typography>
              <CharacteristicsSection
                selectedCharacteristicIds={formData.characteristicIds}
                onCharacteristicToggle={handleCharacteristicToggle}
                onCharacteristicCreated={handleCharacteristicCreated}
              />
            </Box>

            <Divider />

            {/* 4. Knowledge */}
            <Box>
              <Typography
                variant="subtitle1"
                className="mb-3 font-semibold text-gray-900 dark:text-slate-100"
              >
                4. Knowledge & Context
              </Typography>
              <KnowledgeSection
                selectedKnowledgeIds={formData.knowledgeIds}
                onKnowledgeToggle={handleKnowledgeToggle}
                onKnowledgeCreated={handleKnowledgeCreated}
              />
            </Box>

            <Divider />

            {/* 5. Advanced (Placeholder) */}
            <Accordion
              className="border border-gray-200 dark:border-slate-700"
              sx={{ boxShadow: 'none' }}
            >
              <AccordionSummary
                expandIcon={<ChevronDown size={20} />}
                className="bg-gray-50 dark:bg-slate-800/50"
              >
                <Typography
                  variant="subtitle1"
                  className="font-semibold text-gray-900 dark:text-slate-100"
                >
                  5. Advanced Settings (Coming Soon)
                </Typography>
              </AccordionSummary>
              <AccordionDetails className="bg-gray-50 dark:bg-slate-800/50">
                <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                  Future options: Default language, output format, agent visibility, scheduling
                  hints
                </Typography>
              </AccordionDetails>
            </Accordion>
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
            {isSaving ? 'Saving...' : isEditMode ? 'Update Agent' : 'Save Agent'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
