/**
 * Agent Management Drawer
 * Agent creation/editing drawer.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Popover,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { X, Sparkles, Save, ChevronDown, Upload, Trash2, UserCircle, Settings } from 'lucide-react';
import { Agent, CreateAgentInput, Characteristic, Knowledge } from '../../types';
import { useNotification } from '../../hooks/useNotification';
import { uploadAgentAvatar, getAgent, listDefaultAvatars, DefaultAvatar } from '../../services/api';
import { CharacteristicsSection } from './CharacteristicsSection';
import { KnowledgeSection } from './KnowledgeSection';
import { useTranslation } from 'react-i18next';

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
  characteristicIds: [],
  knowledgeIds: [],
  ownerType: 'USER',
};

// ============================================
// AvatarSetupMenu Component
// ============================================

interface AvatarSetupMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onUploadClick: () => void;
  onSelectDefault: (avatar: DefaultAvatar) => void;
  disabled: boolean;
}

const AvatarSetupMenu: React.FC<AvatarSetupMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onUploadClick,
  onSelectDefault,
  disabled,
}) => {
  const { t } = useTranslation();
  const [defaultAvatars, setDefaultAvatars] = useState<DefaultAvatar[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoadingAvatars(true);
      listDefaultAvatars()
        .then((result) => {
          if (result.success && result.data) {
            setDefaultAvatars(result.data);
          }
        })
        .catch(() => {
          /* ignore — list is simply empty */
        })
        .finally(() => setIsLoadingAvatars(false));
    }
  }, [open]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{
        className: 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
        sx: { width: 280, mt: 0.5 },
      }}
    >
      {/* Upload row */}
      <List disablePadding>
        <ListItemButton
          onClick={() => {
            onClose();
            onUploadClick();
          }}
          disabled={disabled}
          className="hover:bg-gray-50 dark:hover:bg-slate-700/50"
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Upload size={16} className="text-indigo-500" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" className="font-medium text-gray-800 dark:text-slate-200">
                {t('agents.drawer.avatar.upload')}
              </Typography>
            }
            secondary={
              <Typography variant="caption" className="text-gray-400 dark:text-slate-500">
                {t('agents.drawer.avatar.supportedFormats', { size: MAX_AVATAR_SIZE_MB })}
              </Typography>
            }
          />
        </ListItemButton>
      </List>

      {/* Default avatars section */}
      <Divider className="border-gray-200 dark:border-slate-700" />

      <Box className="px-3 pb-2 pt-2">
        <Typography
          variant="caption"
          className="font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500"
        >
          {t('agents.drawer.avatar.defaultAvatars')}
        </Typography>
      </Box>

      {isLoadingAvatars ? (
        <Box className="flex items-center justify-center py-6">
          <CircularProgress size={20} className="text-indigo-500" />
        </Box>
      ) : defaultAvatars.length === 0 ? (
        <Box className="px-3 pb-3">
          <Typography variant="caption" className="text-gray-400 dark:text-slate-500">
            {t('agents.drawer.avatar.noDefaultAvatars')}
          </Typography>
        </Box>
      ) : (
        <Box className="grid grid-cols-4 gap-2 px-3 pb-3">
          {defaultAvatars.map((avatar) => (
            <Tooltip key={avatar.publicId} title={avatar.name} placement="top">
              <Box
                onClick={() => {
                  onSelectDefault(avatar);
                  onClose();
                }}
                className={[
                  'relative flex h-14 w-14 cursor-pointer items-center justify-center',
                  'overflow-hidden rounded-lg border-2 border-transparent',
                  'transition-all hover:border-indigo-400 hover:shadow-md',
                  disabled ? 'pointer-events-none opacity-50' : '',
                ].join(' ')}
              >
                {avatar.type === 'video' ? (
                  <video
                    src={avatar.previewUrl ?? undefined}
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={avatar.previewUrl ?? undefined}
                    alt={avatar.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}
    </Popover>
  );
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
  const { t } = useTranslation();
  const { success, error } = useNotification();
  const [formData, setFormData] = useState<CreateAgentInput>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateAgentInput, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarType, setAvatarType] = useState<'image' | 'video' | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectAvatarType = (url: string | null): 'image' | 'video' => {
    if (!url) return 'image';
    const lower = url.toLowerCase().split('?')[0];
    if (/\.(mp4|webm|mov|ogg|ogv)$/.test(lower)) return 'video';
    return 'image';
  };

  // Avatar setup menu state
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<HTMLElement | null>(null);
  const avatarMenuOpen = Boolean(avatarMenuAnchor);

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
            characteristicIds: (full as Agent).characteristicIds || [],
            knowledgeIds: (full as Agent).knowledgeIds || [],
            ownerType: 'USER',
            ownerId: (full as Agent).ownerId,
          });
          const loadedUrl = (full.avatarUrl as string | null | undefined) ?? null;
          setAvatarPreview(loadedUrl);
          setAvatarType(detectAvatarType(loadedUrl));
        })
        .catch(() => {
          // Fallback to list-level data (no IDs, but better than nothing)
          setFormData({
            name: agent.name,
            description: agent.description || '',
            avatarUrl: agent.avatarUrl ?? null,
            characteristicIds: agent.characteristicIds || [],
            knowledgeIds: agent.knowledgeIds || [],
            ownerType: 'USER',
            ownerId: agent.ownerId,
          });
          setAvatarPreview(agent.avatarUrl ?? null);
          setAvatarType(detectAvatarType(agent.avatarUrl ?? null));
        })
        .finally(() => setIsLoadingAgent(false));
    } else if (!open) {
      // Reset form when drawer closes
      setFormData(initialFormState);
      setErrors({});
      setAvatarPreview(null);
      setAvatarType(null);
      setIsLoadingAgent(false);
    }
  }, [agent, open]);

  // ============================================
  // Avatar Setup Menu Handlers
  // ============================================

  const handleSetupAvatarClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isSaving && !isUploadingAvatar && !isLoadingAgent) {
      setAvatarMenuAnchor(e.currentTarget);
    }
  };

  const handleAvatarMenuClose = () => {
    setAvatarMenuAnchor(null);
  };

  // ============================================
  // Avatar Upload Handlers
  // ============================================

  const handleFileInputClick = useCallback(() => {
    if (!isSaving && !isUploadingAvatar && !isLoadingAgent) {
      fileInputRef.current?.click();
    }
  }, [isSaving, isUploadingAvatar, isLoadingAgent]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';

    if (!file) return;

    // Client-side validation — mirror backend rules
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      error(t('agents.drawer.errors.unsupportedAvatarType'));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      error(t('agents.drawer.errors.avatarTooLarge', { size: MAX_AVATAR_SIZE_MB }));
      return;
    }

    // Optimistic local preview
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setAvatarType('image');
    setIsUploadingAvatar(true);

    try {
      const result = await uploadAgentAvatar(file);
      if (!result.success || !result.data?.url) {
        throw new Error(result.error || t('agents.drawer.errors.uploadFailed'));
      }
      // Replace optimistic preview with the real R2 URL
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(result.data.url);
      setFormData((prev) => ({ ...prev, avatarUrl: result.data!.url }));
      success(t('agents.drawer.messages.avatarUploaded'));
    } catch (err) {
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(formData.avatarUrl ?? null);
      error(err instanceof Error ? err.message : t('agents.drawer.errors.uploadFailed'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSelectDefaultAvatar = (avatar: DefaultAvatar) => {
    const url = avatar.previewUrl;
    setAvatarPreview(url);
    setAvatarType(avatar.type);
    setFormData((prev) => ({ ...prev, avatarUrl: url }));
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarType(null);
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
      newErrors.name = t('agents.drawer.validation.nameRequired');
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
        await onUpdate(agent.publicId, formData);
        success(t('agents.drawer.messages.updated'));
      } else {
        await onSave(formData);
        success(t('agents.drawer.messages.created'));
      }
      // Reset form and close drawer on success
      setFormData(initialFormState);
      setAvatarPreview(null);
      setAvatarType(null);
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : t('agents.drawer.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isUploadingAvatar && !isLoadingAgent) {
      setFormData(initialFormState);
      setErrors({});
      setAvatarPreview(null);
      setAvatarType(null);
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
              {isEditMode ? t('agents.drawer.editTitle') : t('agents.drawer.createTitle')}
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
                  {t('agents.drawer.loadingDetails')}
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
                  {t('agents.drawer.sections.basic')}
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
                        onClick={handleSetupAvatarClick}
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
                        ) : avatarPreview && avatarType === 'video' ? (
                          <video
                            src={avatarPreview}
                            muted
                            autoPlay
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        ) : avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt={t('agents.drawer.avatar.alt')}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserCircle size={36} className="text-gray-400 dark:text-slate-500" />
                        )}
                      </Box>

                      {/* Remove button */}
                      {avatarPreview && !isUploadingAvatar && (
                        <Tooltip title={t('agents.drawer.avatar.remove')}>
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

                    {/* Setup avatar button */}
                    <Box className="flex flex-col justify-center gap-1 pt-1">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Settings size={14} />}
                        onClick={handleSetupAvatarClick}
                        disabled={isSaving || isUploadingAvatar}
                        className="w-fit border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300"
                      >
                        {t('agents.drawer.avatar.setup')}
                      </Button>
                      <Typography variant="caption" className="text-gray-400 dark:text-slate-500">
                        {t('agents.drawer.avatar.helper')}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Avatar Setup Menu */}
                  <AvatarSetupMenu
                    anchorEl={avatarMenuAnchor}
                    open={avatarMenuOpen}
                    onClose={handleAvatarMenuClose}
                    onUploadClick={handleFileInputClick}
                    onSelectDefault={handleSelectDefaultAvatar}
                    disabled={isSaving || isUploadingAvatar}
                  />

                  {/* Agent Name */}
                  <FormControl fullWidth error={!!errors.name}>
                    <InputLabel htmlFor="agent-name">
                      {t('agents.drawer.fields.nameRequired')}
                    </InputLabel>
                    <OutlinedInput
                      id="agent-name"
                      label={t('agents.drawer.fields.nameRequired')}
                      value={formData.name}
                      onChange={handleChange('name')}
                      placeholder={t('agents.drawer.fields.namePlaceholder')}
                      disabled={isSaving}
                    />
                    {errors.name && <FormHelperText>{errors.name}</FormHelperText>}
                  </FormControl>

                  {/* Description */}
                  <FormControl fullWidth>
                    <TextField
                      label={t('agents.drawer.fields.description')}
                      multiline
                      rows={3}
                      value={formData.description}
                      onChange={handleChange('description')}
                      placeholder={t('agents.drawer.fields.descriptionPlaceholder')}
                      disabled={isSaving}
                      helperText={t('agents.drawer.fields.descriptionHelper')}
                    />
                  </FormControl>
                </Box>
              </Box>

              <Divider />

              {/* 2. Characteristics */}
              <Box>
                <Typography
                  variant="subtitle1"
                  className="mb-3 font-semibold text-gray-900 dark:text-slate-100"
                >
                  {t('agents.drawer.sections.behavior')}
                </Typography>
                <CharacteristicsSection
                  selectedCharacteristicIds={formData.characteristicIds}
                  onCharacteristicToggle={handleCharacteristicToggle}
                  onCharacteristicCreated={handleCharacteristicCreated}
                />
              </Box>

              <Divider />

              {/* 3. Knowledge */}
              <Box>
                <Typography
                  variant="subtitle1"
                  className="mb-3 font-semibold text-gray-900 dark:text-slate-100"
                >
                  {t('agents.drawer.sections.knowledge')}
                </Typography>
                <KnowledgeSection
                  selectedKnowledgeIds={formData.knowledgeIds}
                  onKnowledgeToggle={handleKnowledgeToggle}
                  onKnowledgeCreated={handleKnowledgeCreated}
                />
              </Box>

              <Divider />

              {/* 4. Advanced (Placeholder) */}
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
                    {t('agents.drawer.sections.advanced')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails className="bg-gray-50 dark:bg-slate-800/50">
                  <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                    {t('agents.drawer.advancedDescription')}
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
            {t('agents.drawer.cancel')}
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={isSaving || isUploadingAvatar || isLoadingAgent}
            startIcon={<Save size={18} />}
            className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-700"
          >
            {isSaving
              ? t('agents.drawer.saving')
              : isEditMode
                ? t('agents.drawer.update')
                : t('agents.drawer.save')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};
