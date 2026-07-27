/**
 * AgentCard Component
 * Displays an individual agent with actions
 * Displays an individual agent with actions
 */

import React from 'react';
import { Bot, Sparkles, Brain, Settings, MessageCircle, Trash2, Rocket } from 'lucide-react';
import { Agent } from '../../types';
import { IconButton, Chip, Switch, FormControlLabel } from '@mui/material';
import { useTranslation } from 'react-i18next';

// ============================================
// Props Interface
// ============================================

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onChat?: (agent: Agent) => void;
  onSetDefault?: (publicId: string) => void;
  onPublish?: (agent: Agent) => void;
  publishDisabled?: boolean;
}

// ============================================
// Avatar type detection
// ============================================

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogg', '.ogv'];

const isVideoUrl = (url: string): boolean => {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    // Fallback for relative URLs
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().split('?')[0].endsWith(ext));
  }
};

// ============================================
// Icon Map
// ============================================

const getAgentIcon = (description?: string) => {
  if (!description) return <Bot className="text-indigo-500" size={32} />;

  const descLower = description.toLowerCase();
  if (descLower.includes('creative') || descLower.includes('artistic')) {
    return <Sparkles className="text-purple-500" size={32} />;
  }
  if (descLower.includes('expert') || descLower.includes('professional')) {
    return <Brain className="text-blue-500" size={32} />;
  }
  return <Bot className="text-indigo-500" size={32} />;
};

// ============================================
// AgentCard Component
// ============================================

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onEdit,
  onDelete,
  onChat,
  onSetDefault,
  onPublish,
  publishDisabled = false,
}) => {
  const { t } = useTranslation();
  const isSystemAgent = agent.ownerType === 'SYSTEM';
  const canManageAgent = !agent.ownerType || agent.ownerType === 'USER';
  const status = agent.status || 'draft';
  const hasUnpublishedChanges =
    status === 'published' &&
    typeof agent.version === 'number' &&
    typeof agent.publishedVersion === 'number' &&
    agent.version > agent.publishedVersion;
  const isPublished = status === 'published' && !hasUnpublishedChanges;
  const canPublish =
    canManageAgent &&
    agent.isActive !== false &&
    Boolean(onPublish) &&
    (status !== 'published' || hasUnpublishedChanges);
  const statusLabelKey = hasUnpublishedChanges ? 'unpublishedChanges' : status;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageAgent) return;
    onEdit(agent);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageAgent) return;
    onDelete(agent.publicId);
  };

  const handleChat = () => {
    if (onChat) {
      onChat(agent);
    }
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPublish || publishDisabled) return;
    onPublish?.(agent);
  };

  const handleDefaultToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (canManageAgent && onSetDefault && e.target.checked) {
      onSetDefault(agent.publicId);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Default Switch */}
      {onSetDefault && (
        <div className="absolute right-4 top-4">
          <FormControlLabel
            control={
              <Switch
                checked={agent.isDefault}
                onChange={handleDefaultToggle}
                disabled={!canManageAgent}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#3B82F6',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#3B82F6',
                  },
                }}
              />
            }
            label={
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                {t('common.default')}
              </span>
            }
            labelPlacement="start"
            sx={{
              margin: 0,
              gap: 0.5,
              '& .MuiFormControlLabel-label': {
                fontSize: '0.75rem',
              },
            }}
          />
        </div>
      )}

      {/* Icon/Avatar */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
        {agent.avatarUrl ? (
          isVideoUrl(agent.avatarUrl) ? (
            <video
              src={agent.avatarUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={{
                width: 64,
                height: 64,
                objectFit: 'cover',
              }}
            />
          ) : (
            <img
              src={agent.avatarUrl}
              alt={t('agents.card.avatarAlt', { name: agent.name })}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          getAgentIcon(agent.description)
        )}
      </div>

      {/* Agent Info */}
      <div className="mb-4 flex-1">
        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
          {agent.name}
        </h3>
        {agent.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-slate-400">
            {agent.description}
          </p>
        )}

        <div className="mb-2 flex flex-wrap gap-1.5">
          <Chip
            label={t(`agents.card.status.${statusLabelKey}`, { defaultValue: statusLabelKey })}
            size="small"
            className={
              isPublished
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }
            sx={{ height: '22px', fontSize: '0.7rem' }}
          />
          {agent.isActive === false && (
            <Chip
              label={t('agents.card.inactive')}
              size="small"
              className="bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              sx={{ height: '22px', fontSize: '0.7rem' }}
            />
          )}
          {isSystemAgent && (
            <Chip
              label={t('agents.card.system')}
              size="small"
              className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              sx={{ height: '22px', fontSize: '0.7rem' }}
            />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-4 border-t border-gray-100 pt-4 dark:border-slate-700">
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-slate-500">{t('agents.card.behaviors')}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {agent.characteristicCount ?? agent.characteristicIds?.length ?? 0}
          </p>
        </div>
        <div className="h-8 w-px bg-gray-200 dark:bg-slate-700"></div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-slate-500">{t('agents.card.knowledge')}</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {agent.knowledgeCount ?? agent.knowledgeIds?.length ?? 0}
          </p>
        </div>
      </div>

      {canPublish && (
        <button
          onClick={handlePublish}
          disabled={publishDisabled}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
        >
          <Rocket size={16} />
          {publishDisabled
            ? t('agents.card.publishing')
            : t(hasUnpublishedChanges ? 'agents.card.republish' : 'agents.card.publish')}
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onChat && (
          <button
            onClick={handleChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]"
          >
            <MessageCircle size={16} />
            {t('agents.card.chatNow')}
          </button>
        )}
        <IconButton
          onClick={handleEdit}
          size="small"
          disabled={!canManageAgent}
          className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          <Settings size={18} />
        </IconButton>
        {canManageAgent && !agent.isDefault && (
          <IconButton
            onClick={handleDelete}
            size="small"
            className="border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 size={18} />
          </IconButton>
        )}
      </div>
    </div>
  );
};
