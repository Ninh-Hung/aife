/**
 * AgentInfoPanel Component
 * Right sidebar showing agent information and details
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Bot, Brain, Database, Trash2, Upload } from 'lucide-react';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Agent } from '../../types';
import { AvatarMedia } from './AvatarMedia';
import { uploadAgentAvatar } from '../../services/api';
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
                <Tooltip title={t('chat.agentInfo.actions.uploadAvatar')}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUpdatingAvatar}
                      className="bg-white shadow-md dark:bg-slate-700"
                      sx={{ padding: '4px' }}
                    >
                      <Upload size={14} className="text-indigo-600 dark:text-indigo-300" />
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
        </div>

        {/* Characteristics Section */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Brain size={18} className="text-purple-500" />
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">
              {t('chat.agentInfo.behaviors')}
            </h4>
          </div>
          <div className="space-y-2">
            {agent.characteristics && agent.characteristics.length > 0 ? (
              agent.characteristics.map((characteristic) => (
                <div
                  key={characteristic.publicId}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/50"
                >
                  <div className="font-medium text-gray-900 dark:text-slate-100">
                    {characteristic.name}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t('chat.agentInfo.noBehaviors')}
              </p>
            )}
          </div>
        </div>

        {/* Knowledge Section */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Database size={18} className="text-green-500" />
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">
              {t('chat.agentInfo.knowledge')}
            </h4>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-600 dark:bg-slate-700/50">
            <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
              {agent.knowledges?.length ?? agent.knowledgeCount ?? 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              {t('chat.agentInfo.knowledgeSources')}
            </div>
          </div>
        </div>

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
