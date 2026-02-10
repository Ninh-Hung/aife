/**
 * Agent Management Drawer
 * Refactored to support capability-driven, data-driven architecture
 */

import React, { useState, useEffect, useRef } from 'react';
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
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { X, Sparkles, Save, ChevronDown, Upload, Trash2, UserCircle } from 'lucide-react';
import { Agent, CreateAgentInput, Characteristic, Knowledge } from '../../types';
import { useNotification } from '../../hooks/useNotification';
import { uploadAgentAvatar, getAgent } from '../../services/api';
import { CapabilitiesSection } from './CapabilitiesSection';
import { CharacteristicsSection } from './CharacteristicsSection';
import { KnowledgeSection } from './KnowledgeSection';

// ============================================
// Constants
// ============================================

const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/gif',
  'image/webp',
  'image/avif',
];
const MAX_AVATAR_SIZE_MB = 5;

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
  avatarUrl: null,
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

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading state when fetching full agent details for editing
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);

  const isEditMode = !!agent;

  // Pre-fill form when editing — fetch full agent details (including association IDs)
  useEffect(() => {
    if (agent && open) {
      setIsLoadingAgent(true);
      getAgent(agent.publicId)
        .then((result) => {
          const full = result.success && result.data ? result.data : agent;
          setFormData({
            name: full.name,
            description: full.description || '',
            avatarUrl: (full.avatarUrl as string | null | undefined) ?? null,
            capabilityIds: (full as Agent).capabilityIds || [],
            characteristicIds: (full as Agent).characteristicIds || [],
            knowledgeIds: (full as Agent).knowledgeIds || [],
            ownerType: (full as Agent).ownerType || 'USER',
            ownerId: (full as Agent).ownerId,
          });
          setAvatarPreview((full.avatarUrl as string | null | undefined) ?? null);
        })
        .catch(() => {
          // Fallback to list-level data (no IDs, but better than nothing)
          setFormData({
            name: agent.name,
            description: agent.description || '',
            avatarUrl: agent.avatarUrl ?? null,
            capabilityIds: agent.capabilityIds || [],
            characteristicIds: agent.characteristicIds || [],
            knowledgeIds: agent.knowledgeIds || [],
            ownerType: agent.ownerType || 'USER',
            ownerId: agent.ownerId,
          });
          setAvatarPreview(agent.avatarUrl ?? null);
        })
        .finally(() => setIsLoadingAgent(false));
    } else if (!open) {
      // Reset form when drawer closes
      setFormData(initialFormState);
      setErrors({});
      setAvatarPreview(null);
      setIsLoadingAgent(false);
    }
  }, [agent, open]);

  // ============================================
  // Avatar Upload Handlers
  // ============================================

  const handleAvatarClick = () => {
    if (!isSaving && !isUploadingAvatar && !isLoadingAgent) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';

    if (!file) return;

    // Client-side validation — mirror backend rules
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      error(`Unsupported file type. Please upload JPG, PNG, SVG, GIF, or WebP.`);
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      error(`File is too large. Maximum size is ${MAX_AVATAR_SIZE_MB} MB.`);
      return;
    }

    // Optimistic local preview
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setIsUploadingAvatar(true);

    try {
      const result = await uploadAgentAvatar(file);
      if (!result.success || !result.data?.url) {
        throw new Error(result.error || 'Upload failed');
      }
      // Replace optimistic preview with the real R2 URL
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(result.data.url);
      setFormData((prev) => ({ ...prev, avatarUrl: result.data!.url }));
      success('Avatar uploaded successfully');
    } catch (err) {
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(formData.avatarUrl ?? null);
      error(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setFormData((prev) => ({ ...prev, avatarUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ============================================
  // Form Handlers
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

  const handleCapabilityToggle = (capabilityId: string) => {
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

  const handleCharacteristicToggle = (characteristicId: string) => {
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

  const handleKnowledgeToggle = (knowledgeId: string) => {
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
    if (!formData.characteristicIds.includes(characteristic.publicId)) {
      setFormData((prev) => ({
        ...prev,
        characteristicIds: [...prev.characteristicIds, characteristic.publicId],
      }));
    }
  };

  const handleKnowledgeCreated = (knowledge: Knowledge) => {
    // Auto-select newly created knowledge
    if (!formData.knowledgeIds.includes(knowledge.publicId)) {
      setFormData((prev) => ({
        ...prev,
        knowledgeIds: [...prev.knowledgeIds, knowledge.publicId],
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
      setAvatarPreview(null);
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isUploadingAvatar && !isLoadingAgent) {
      setFormData(initialFormState);
      setErrors({});
      setAvatarPreview(null);
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
            disabled={isSaving || isUploadingAvatar}
            className="text-gray-600 dark:text-slate-400"
            size="small"
          >
            <X size={20} />
          </IconButton>
        </Box>

        {/* Form Content */}
        <Box className="flex-1 overflow-y-auto px-6 py-6">
          {/* Loading overlay while fetching full agent details */}
          {isLoadingAgent && (
            <Box className="flex min-h-[300px] items-center justify-center">
              <Box className="flex flex-col items-center gap-3">
                <CircularProgress size={36} className="text-indigo-500" />
                <Typography variant="body2" className="text-gray-500 dark:text-slate-400">
                  Loading agent details...
                </Typography>
              </Box>
            </Box>
          )}

          {!isLoadingAgent && (
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
                {/* Avatar Upload */}
                <Box className="flex items-start gap-4">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_AVATAR_TYPES.join(',')}
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    disabled={isSaving || isUploadingAvatar}
                  />

                  {/* Avatar preview / placeholder */}
                  <Box className="relative shrink-0">
                    <Box
                      onClick={handleAvatarClick}
                      className={[
                        'flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2',
                        'border-dashed transition-colors',
                        avatarPreview
                          ? 'border-transparent'
                          : 'border-gray-300 hover:border-indigo-400 dark:border-slate-600 dark:hover:border-indigo-500',
                        isSaving || isUploadingAvatar ? 'cursor-not-allowed opacity-60' : '',
                      ].join(' ')}
                    >
                      {isUploadingAvatar ? (
                        <CircularProgress size={28} className="text-indigo-500" />
                      ) : avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Agent avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle
                          size={36}
                          className="text-gray-400 dark:text-slate-500"
                        />
                      )}
                    </Box>

                    {/* Remove button */}
                    {avatarPreview && !isUploadingAvatar && (
                      <Tooltip title="Remove avatar">
                        <IconButton
                          size="small"
                          onClick={handleRemoveAvatar}
                          disabled={isSaving}
                          className="absolute -right-2 -top-2 bg-white shadow-md dark:bg-slate-700"
                          sx={{ padding: '2px' }}
                        >
                          <Trash2 size={12} className="text-red-500" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {/* Upload instructions */}
                  <Box className="flex flex-col justify-center gap-1 pt-1">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Upload size={14} />}
                      onClick={handleAvatarClick}
                      disabled={isSaving || isUploadingAvatar}
                      className="w-fit border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300"
                    >
                      {avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                    </Button>
                    <Typography variant="caption" className="text-gray-400 dark:text-slate-500">
                      JPG, PNG, SVG, GIF, WebP — max {MAX_AVATAR_SIZE_MB} MB
                    </Typography>
                  </Box>
                </Box>

                {/* Agent Name */}
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

                {/* Description */}
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
          )}
        </Box>

        {/* Footer Actions */}
        <Box className="flex gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <Button
            variant="outlined"
            fullWidth
            onClick={handleClose}
            disabled={isSaving || isUploadingAvatar || isLoadingAgent}
            className="border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={isSaving || isUploadingAvatar || isLoadingAgent}
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
