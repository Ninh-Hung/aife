/**
 * AgentCard Component
 * Displays an individual agent with actions
 * Refactored to show capabilities instead of creativity level
 */

import React from 'react';
import { Bot, Sparkles, Brain, Settings, MessageCircle, Trash2, Zap } from 'lucide-react';
import { Agent } from '../../types';
import { IconButton, Chip } from '@mui/material';

// ============================================
// Props Interface
// ============================================

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  onChat?: (agent: Agent) => void;
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

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onChat }) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(agent);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      onDelete(agent.id);
    }
  };

  const handleChat = () => {
    if (onChat) {
      onChat(agent);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Default Badge */}
      {agent.isDefault && (
        <div className="absolute right-4 top-4">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Default
          </span>
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
              alt={`${agent.name} avatar`}
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

        {/* Capabilities Chips */}
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {agent.capabilities.slice(0, 3).map((capability) => (
              <Chip
                key={capability.publicId}
                icon={<Zap size={12} />}
                label={capability.name}
                size="small"
                className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                sx={{ height: '22px', fontSize: '0.7rem' }}
              />
            ))}
            {agent.capabilities.length > 3 && (
              <Chip
                label={`+${agent.capabilities.length - 3}`}
                size="small"
                className="bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                sx={{ height: '22px', fontSize: '0.7rem' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-4 border-t border-gray-100 pt-4 dark:border-slate-700">
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-slate-500">Capabilities</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {agent.capabilityCount ?? agent.capabilityIds?.length ?? 0}
          </p>
        </div>
        <div className="h-8 w-px bg-gray-200 dark:bg-slate-700"></div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-slate-500">Behaviors</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {agent.characteristicCount ?? agent.characteristicIds?.length ?? 0}
          </p>
        </div>
        <div className="h-8 w-px bg-gray-200 dark:bg-slate-700"></div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-slate-500">Knowledge</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {agent.knowledgeCount ?? agent.knowledgeIds?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onChat && (
          <button
            onClick={handleChat}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]"
          >
            <MessageCircle size={16} />
            Chat Now
          </button>
        )}
        <IconButton
          onClick={handleEdit}
          size="small"
          className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          <Settings size={18} />
        </IconButton>
        {!agent.isDefault && (
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
