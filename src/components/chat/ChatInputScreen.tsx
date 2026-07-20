/**
 * ChatInputScreen Component
 * Reusable centered chat interface — used on the landing page (unauthenticated)
 * and as the empty/new-chat state after login.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ArrowUp, X, ImageIcon, FileUp, ChevronDown, Bot } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAgents } from '../../contexts/AgentsContext';
import { AvatarMedia } from './AvatarMedia';
import type { Agent } from '../../types';
import type { ChatExecutionMode } from '../../hooks/useChatAgent';

// ============================================
// Props Interface
// ============================================

export interface ChatInputScreenProps {
  /** Main heading displayed above the input */
  heading?: string;
  /** Textarea placeholder text */
  placeholder?: string;
  /** Called when the user submits a message */
  onSend: (
    message: string,
    image?: File,
    agent?: Agent | null,
    mode?: ChatExecutionMode
  ) => void | Promise<void>;
  /** Disable input while the parent is preparing the chat */
  isSubmitting?: boolean;
  /** Optional suggestion chips shown below the input */
  suggestions?: string[];
  executionMode?: ChatExecutionMode;
  onExecutionModeChange?: (mode: ChatExecutionMode) => void;
}

// ============================================
// Upload validation constants (anonymous users)
// ============================================

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
]);
const MAX_ANON_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ============================================
// ChatInputScreen Component
// ============================================

export const ChatInputScreen: React.FC<ChatInputScreenProps> = ({
  heading = 'What can I help you with?',
  placeholder = 'Ask me anything...',
  onSend,
  isSubmitting = false,
  suggestions,
  executionMode = 'normal',
  onExecutionModeChange,
}) => {
  const { user, isAnonymous } = useAuth();
  const { agents } = useAgents();

  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [localExecutionMode, setLocalExecutionMode] = useState<ChatExecutionMode>(executionMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const agentSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalExecutionMode(executionMode);
  }, [executionMode]);

  // Keep selectedAgent scoped to the current user's agent list.
  useEffect(() => {
    if (agents.length === 0) {
      setSelectedAgent(null);
      return;
    }

    const selectedAgentStillAvailable = selectedAgent
      ? agents.some((agent) => agent.publicId === selectedAgent.publicId)
      : false;

    if (!selectedAgentStillAvailable) {
      setSelectedAgent(agents.find((a) => a.isDefault) ?? agents[0]);
    }
  }, [agents, selectedAgent, user?.publicId]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        plusButtonRef.current &&
        !plusButtonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close agent dropdown when clicking outside
  useEffect(() => {
    if (!agentDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (agentSelectorRef.current && !agentSelectorRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [agentDropdownOpen]);

  // Auto-resize textarea whenever content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [inputValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSubmitting) return;

    await onSend(trimmed, selectedImage ?? undefined, selectedAgent, localExecutionMode);
    setInputValue('');
    setSelectedImage(null);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, isSubmitting, localExecutionMode, selectedAgent, selectedImage, onSend]);

  const handleExecutionModeChange = (mode: ChatExecutionMode) => {
    setLocalExecutionMode(mode);
    onExecutionModeChange?.(mode);
  };

  const handleImageUploadClick = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-selected
    e.target.value = '';

    if (!file) return;

    // For anonymous users, enforce image-only + 5 MB limit
    if (isAnonymous) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setUploadError('Only image files are supported (PNG, JPG, GIF, WebP, etc.) in anonymous mode.');
        return;
      }
      if (file.size > MAX_ANON_FILE_SIZE) {
        setUploadError(
          `Image must be smaller than 5 MB (selected: ${(file.size / 1024 / 1024).toFixed(1)} MB).`
        );
        return;
      }
    }

    setUploadError(null);
    setSelectedImage(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setUploadError(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const canSend = inputValue.trim().length > 0 && !isSubmitting;

  return (
    <div className="flex w-full flex-col items-center px-4">
      {/* Heading */}
      <h1 className="mb-8 text-center text-3xl font-semibold text-gray-900 dark:text-white sm:text-4xl">
        {heading}
      </h1>

      {/* Input box */}
      <div className="w-full max-w-2xl">
        <div
          className={`relative rounded-2xl border bg-white shadow-lg transition-colors dark:bg-[#0F1F38] ${
            canSend
              ? 'border-blue-400 dark:border-slate-500'
              : 'border-gray-200 dark:border-slate-700'
          } focus-within:border-blue-400 dark:focus-within:border-slate-500`}
        >
          {/* Image preview pill */}
          {selectedImage && (
            <div className="flex items-center gap-1.5 px-4 pt-3">
              <span className="max-w-[200px] truncate rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {selectedImage.name}
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-gray-400 transition-colors hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="flex items-center gap-1.5 px-4 pt-3">
              <span className="text-xs text-red-400">{uploadError}</span>
            </div>
          )}

          {/* Agent Selector — only shown for registered users with at least one agent */}
          {!isAnonymous && user && agents.length > 0 && (
            <div ref={agentSelectorRef} className="relative px-3 pt-3">
              <button
                type="button"
                onClick={() => setAgentDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
                {/* Avatar */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                  {selectedAgent ? (
                    <AvatarMedia
                      src={selectedAgent.avatarUrl}
                      type={selectedAgent.avatarType}
                      alt={selectedAgent.name}
                      mediaClassName="h-full w-full rounded-full object-cover"
                      fallback={<Bot className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />}
                    />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
                  )}
                </div>

                {/* Agent name */}
                <span className="font-medium">{selectedAgent?.name ?? 'Select Agent'}</span>

                {/* Chevron */}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform dark:text-slate-500 ${
                    agentDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown list */}
              {agentDropdownOpen && (
                <div className="absolute left-3 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#0F1F38]">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => {
                        setSelectedAgent(agent);
                        setAgentDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                        selectedAgent?.id === agent.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white'
                      }`}
                    >
                      {/* Agent avatar */}
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                        <AvatarMedia
                          src={agent.avatarUrl}
                          type={agent.avatarType}
                          alt={agent.name}
                          mediaClassName="h-full w-full rounded-full object-cover"
                          fallback={
                            <Bot className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
                          }
                        />
                      </div>

                      <span className="truncate font-medium">{agent.name}</span>

                      {agent.isDefault && (
                        <span className="ml-auto shrink-0 text-[10px] text-gray-400 dark:text-slate-500">
                          Default
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pb-14 pt-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-wait dark:text-white dark:placeholder-slate-500"
            style={{ minHeight: '56px', maxHeight: '200px' }}
          />

          {/* Bottom toolbar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            {/* Plus / upload button + dropdown menu */}
            <div className="relative">
              <button
                ref={plusButtonRef}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  menuOpen
                    ? 'bg-gray-200 text-gray-900 dark:bg-slate-700/70 dark:text-white'
                    : 'text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white'
                }`}
                title="Attach"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute bottom-full left-0 mb-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#0F1F38]"
                >
                  <button
                    type="button"
                    onClick={handleImageUploadClick}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
                  >
                    {!isAnonymous ? (
                      <>
                        <FileUp className="h-4 w-4 shrink-0 text-teal-400" />
                        Upload image or file
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 shrink-0 text-teal-400" />
                        Upload image
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Send button */}
            <div className="flex items-center gap-2">
              <select
                value={localExecutionMode}
                onChange={(event) =>
                  handleExecutionModeChange(event.target.value as ChatExecutionMode)
                }
                disabled={isSubmitting}
                aria-label="Model mode"
                className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium capitalize text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-400 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-[#0F1F38] dark:text-slate-300 dark:focus:border-slate-500"
              >
                <option value="cheap">cheap</option>
                <option value="normal">normal</option>
                <option value="expensive">expensive</option>
              </select>

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  canSend
                    ? 'bg-teal-500 text-white hover:bg-teal-600'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-slate-500'
                }`}
                title="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={isAnonymous ? 'image/*' : '*/*'}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hint */}
        <p className="mt-2.5 text-center text-xs text-gray-400 dark:text-slate-600">
          Press Enter to send &nbsp;·&nbsp; Shift+Enter for new line
        </p>
      </div>

      {/* Suggestion chips */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
