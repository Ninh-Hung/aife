/**
 * AgentInfoPanel Component
 * Right sidebar showing agent information and details
 */

import React from 'react';
import { X, Bot, Zap, Brain, Database } from 'lucide-react';
import { IconButton } from '@mui/material';
import { Agent } from '../../types';

interface AgentInfoPanelProps {
  agent: Agent;
  isVisible: boolean;
  onClose: () => void;
}

export const AgentInfoPanel: React.FC<AgentInfoPanelProps> = ({
  agent,
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Agent Info
        </h2>
        <IconButton
          onClick={onClose}
          size="small"
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X size={20} />
        </IconButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Agent Avatar & Name */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
            <Bot size={40} className="text-white" />
          </div>
          <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-slate-100">
            {agent.name}
          </h3>
          {agent.description && (
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {agent.description}
            </p>
          )}
        </div>

        {/* Capabilities Section */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={18} className="text-blue-500" />
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">
              Capabilities
            </h4>
          </div>
          <div className="space-y-2">
            {agent.capabilities && agent.capabilities.length > 0 ? (
              agent.capabilities.map((capability) => (
                <div
                  key={capability.publicId}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-700/50"
                >
                  <div className="mb-1 font-medium text-gray-900 dark:text-slate-100">
                    {capability.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">
                    {capability.description}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                No capabilities configured
              </p>
            )}
          </div>
        </div>

        {/* Characteristics Section */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Brain size={18} className="text-purple-500" />
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">
              Behaviors
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
                No behaviors configured
              </p>
            )}
          </div>
        </div>

        {/* Knowledge Section */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Database size={18} className="text-green-500" />
            <h4 className="font-semibold text-gray-900 dark:text-slate-100">
              Knowledge
            </h4>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-slate-600 dark:bg-slate-700/50">
            <div className="mb-1 text-2xl font-bold text-gray-900 dark:text-slate-100">
              {agent.knowledges?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Knowledge sources
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
          <div className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
            Details
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-slate-400">Owner Type:</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {agent.ownerType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-slate-400">Default Agent:</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {agent.isDefault ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
