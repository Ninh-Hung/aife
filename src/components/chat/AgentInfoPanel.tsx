/**
 * AgentInfoPanel Component
 * Right sidebar showing agent information and details
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Bot,
  Brain,
  Database,
  Trash2,
  Upload,
  Copy,
  Check,
  Settings,
} from 'lucide-react';
import {
  CircularProgress,
  IconButton,
  Tooltip,
  Popover,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Agent } from '../../types';
import { AvatarMedia } from './AvatarMedia';
import { uploadAgentAvatar, listDefaultAvatars, getAgent, listCharacteristics, listKnowledge, type DefaultAvatar } from '../../services/api';
import { Characteristic, Knowledge } from '../../types';
import { useAgents } from '../../contexts/AgentsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../hooks/useNotification';

interface AgentInfoPanelProps {
  agent: Agent;
  isVisible: boolean;
  onClose: () => void;
  onAgentChange?: (agent: Agent) => void;
}

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

export const AgentInfoPanel: React.FC<AgentInfoPanelProps> = ({
  agent,
  isVisible,
  onClose,
  onAgentChange,
}) => {
  const { t } = useTranslation();
  const { updateAgentAvatar } = useAgents();
  const { isAnonymous } = useAuth();
  const notification = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(agent.avatarUrl ?? null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [copied, setCopied] = useState(false);

  // Avatar setup menu state
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState<HTMLElement | null>(null);
  const avatarMenuOpen = Boolean(avatarMenuAnchor);

  const showInternalInfo = !isAnonymous && agent.ownerType !== 'SYSTEM';

  const [detailedAgent, setDetailedAgent] = useState<Agent>(agent);
  const [resolvedCharacteristics, setResolvedCharacteristics] = useState<Characteristic[]>([]);
  const [resolvedKnowledges, setResolvedKnowledges] = useState<Knowledge[]>([]);

  useEffect(() => {
    setDetailedAgent(agent);
  }, [agent]);

  useEffect(() => {
    let isMounted = true;

    if (!isVisible || !showInternalInfo) {
      setResolvedCharacteristics([]);
      setResolvedKnowledges([]);
      return () => {
        isMounted = false;
      };
    }

    // Fetch detailed agent to get the characteristicIds and knowledgeIds.
    getAgent(agent.publicId).then(async (res) => {
      if (!isMounted || !res.success || !res.data) return;

      setDetailedAgent((prev) => ({ ...prev, ...res.data }));
      const cIds = res.data.characteristicIds || [];
      const kIds = res.data.knowledgeIds || [];

      const [sysCharsRes, userCharsRes, knRes] = await Promise.all([
        listCharacteristics('system'),
        listCharacteristics('user'),
        listKnowledge('all'),
      ]);

      if (isMounted) {
        const allChars = [
          ...(sysCharsRes.success && sysCharsRes.data ? sysCharsRes.data : []),
          ...(userCharsRes.success && userCharsRes.data ? userCharsRes.data : []),
        ];
        const matchedChars = allChars.filter((c) => cIds.includes(c.publicId));
        setResolvedCharacteristics(matchedChars);

        const allKns = knRes.success && knRes.data ? knRes.data : [];
        const matchedKns = allKns.filter((k) => kIds.includes(k.publicId));
        setResolvedKnowledges(matchedKns);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isVisible, agent.publicId, showInternalInfo]);

  useEffect(() => {
    setAvatarPreview(agent.avatarUrl ?? null);
  }, [agent.avatarUrl]);

  const canUpdateAvatar =
    !isAnonymous &&
    (!agent.ownerType ||
      agent.ownerType === 'USER' ||
      (agent.ownerType === 'SYSTEM' && agent.isDefault));

  

  const applyAvatarChange = async (avatarUrl: string | null) => {
    await updateAgentAvatar(agent.publicId, avatarUrl);
    onAgentChange?.({
      ...agent,
      avatarUrl,
      avatarType: avatarUrl ? 'image' : undefined,
      updatedAt: new Date(),
    });
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      notification.error(t('chat.agentInfo.errors.unsupportedAvatarType'));
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      notification.error(t('chat.agentInfo.errors.avatarTooLarge', { size: MAX_AVATAR_SIZE_MB }));
      return;
    }

    const previousAvatarUrl = agent.avatarUrl ?? null;
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);
    setIsUpdatingAvatar(true);

    try {
      const uploadResult = await uploadAgentAvatar(file);
      if (!uploadResult.success || !uploadResult.data?.url) {
        throw new Error(uploadResult.error || t('chat.agentInfo.errors.uploadFailed'));
      }

      await applyAvatarChange(uploadResult.data.url);
      setAvatarPreview(uploadResult.data.url);
      notification.success(t('chat.agentInfo.messages.avatarUpdated'));
    } catch (error) {
      setAvatarPreview(previousAvatarUrl);
      notification.error(
        error instanceof Error ? error.message : t('chat.agentInfo.errors.updateFailed')
      );
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsUpdatingAvatar(false);
    }
  };

  const handleSelectDefaultAvatar = async (avatar: DefaultAvatar) => {
    const previousAvatarUrl = agent.avatarUrl ?? null;
    const url = avatar.previewUrl;
    setAvatarPreview(url);
    setIsUpdatingAvatar(true);

    try {
      await applyAvatarChange(url);
      notification.success(t('chat.agentInfo.messages.avatarUpdated'));
    } catch (error) {
      setAvatarPreview(previousAvatarUrl);
      notification.error(
        error instanceof Error ? error.message : t('chat.agentInfo.errors.updateFailed')
      );
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const previousAvatarUrl = agent.avatarUrl ?? null;
    setAvatarPreview(null);
    setIsUpdatingAvatar(true);

    try {
      await applyAvatarChange(null);
      notification.success(t('chat.agentInfo.messages.avatarRemoved'));
    } catch (error) {
      setAvatarPreview(previousAvatarUrl);
      notification.error(
        error instanceof Error ? error.message : t('chat.agentInfo.errors.updateFailed')
      );
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(agent.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetupAvatarClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!isUpdatingAvatar) {
      setAvatarMenuAnchor(e.currentTarget);
    }
  };

  const handleAvatarMenuClose = () => {
    setAvatarMenuAnchor(null);
  };

  if (!isVisible) return null;

  return (
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          {t('chat.agentInfo.title')}
        </h2>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={t('common.close')}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X size={20} />
        </IconButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Agent Avatar & Name */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              {isUpdatingAvatar ? (
                <CircularProgress size={28} className="text-white" />
              ) : (
                <AvatarMedia
                  src={avatarPreview}
                  type={agent.avatarType}
                  alt={t('chat.agentInfo.avatarAlt', { name: agent.name })}
                  fallback={<Bot size={40} className="text-white" />}
                />
              )}
            </div>
            {canUpdateAvatar && (
              <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_AVATAR_TYPES.join(',')}
                  className="hidden"
                  onChange={handleAvatarFileChange}
                  disabled={isUpdatingAvatar}
                />
                <Tooltip title={t('agents.drawer.avatar.setup')}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleSetupAvatarClick}
                      disabled={isUpdatingAvatar}
                      className="bg-white shadow-md dark:bg-slate-700"
                      sx={{ padding: '4px' }}
                    >
                      <Settings size={14} className="text-indigo-600 dark:text-indigo-300" />
                    </IconButton>
                  </span>
                </Tooltip>
                {avatarPreview && (
                  <Tooltip title={t('chat.agentInfo.actions.removeAvatar')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => void handleRemoveAvatar()}
                        disabled={isUpdatingAvatar}
                        className="bg-white shadow-md dark:bg-slate-700"
                        sx={{ padding: '4px' }}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-slate-100">{agent.name}</h3>
          {agent.description && (
            <p className="text-sm text-gray-600 dark:text-slate-400">{agent.description}</p>
          )}

          {/* Agent Public ID */}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-slate-700 dark:text-slate-400">
              {agent.publicId}
            </code>
            <Tooltip title={copied ? t('common.copied') : t('common.copy')} placement="top">
              <IconButton onClick={handleCopyId} className="h-5 w-5" size="small">
                {copied ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <Copy size={12} className="text-gray-400" />
                )}
              </IconButton>
            </Tooltip>
          </div>

          {/* Avatar Setup Menu */}
          <AvatarSetupMenu
            anchorEl={avatarMenuAnchor}
            open={avatarMenuOpen}
            onClose={handleAvatarMenuClose}
            onUploadClick={() => fileInputRef.current?.click()}
            onSelectDefault={handleSelectDefaultAvatar}
            disabled={isUpdatingAvatar}
          />
        </div>

        {/* Characteristics Section */}
        {showInternalInfo && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Brain size={18} className="text-purple-500" />
              <h4 className="font-semibold text-gray-900 dark:text-slate-100">
                {t('chat.agentInfo.behaviors')}
              </h4>
            </div>
            <div className="space-y-2">
              {resolvedCharacteristics.length > 0 ? (
                resolvedCharacteristics.map((characteristic) => (
                  <div
                    key={characteristic.publicId}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50"
                  >
                    <div className="font-medium text-gray-900 dark:text-slate-100">
                      {characteristic.name}
                    </div>
                    {characteristic.description && (
                      <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                        {characteristic.description}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {t('chat.agentInfo.noBehaviors')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Knowledge Section */}
        {showInternalInfo && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Database size={18} className="text-green-500" />
              <h4 className="font-semibold text-gray-900 dark:text-slate-100">
                {t('chat.agentInfo.knowledge')}
              </h4>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-600 dark:bg-slate-700/50 mb-3">
              <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
                {detailedAgent.knowledgeIds?.length ?? detailedAgent.knowledgeCount ?? 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">
                {t('chat.agentInfo.knowledgeSources')}
              </div>
            </div>

            {resolvedKnowledges.length > 0 && (
              <div className="space-y-2">
                {resolvedKnowledges.map((knowledge) => (
                  <div
                    key={knowledge.publicId}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-600 dark:bg-slate-800"
                  >
                    <div className="mb-1 text-xs font-semibold uppercase text-indigo-500 dark:text-indigo-400">
                      {knowledge.sourceType}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-slate-300 break-words whitespace-pre-wrap">
                      {knowledge.sourceContent || knowledge.name || t('common.untitled')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
          <div className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
            {t('chat.agentInfo.details')}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-slate-400">
                {t('chat.agentInfo.ownerType')}
              </span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {agent.ownerType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-slate-400">
                {t('chat.agentInfo.defaultAgent')}
              </span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {agent.isDefault ? t('chat.agentInfo.yes') : t('chat.agentInfo.no')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
