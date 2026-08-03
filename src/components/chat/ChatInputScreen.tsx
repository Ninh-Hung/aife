/**
 * ChatInputScreen Component
 * Reusable centered chat interface — used on the landing page (unauthenticated)
 * and as the empty/new-chat state after login.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ArrowUp,
  X,
  ImageIcon,
  FileUp,
  ChevronDown,
  Bot,
  Mic,
  Loader2,
  PhoneCall,
  Square,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAgents } from '../../contexts/AgentsContext';
import { useNotification } from '../../hooks/useNotification';
import { AvatarMedia } from './AvatarMedia';
import { getChatInputContent, getRandomChatHeading } from './chatInputContent';
import type { Agent } from '../../types';
import type { ChatExecutionMode } from '../../hooks/useChatAgent';
import { CHAT_EXECUTION_MODE_OPTIONS } from '../../common/chatExecutionMode';
import { transcribeVoiceAudio } from '../../services/api';

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
  voiceInputEnabled?: boolean;
  onStartRealtimeVoice?: (agent: Agent | null, mode: ChatExecutionMode) => void | Promise<void>;
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
const CHAT_HEADING_ROTATION_MS = 4800;
const CHAT_HEADING_TYPE_MS = 64;
const MAX_VOICE_RECORDING_SECONDS = 60;

// ============================================
// ChatInputScreen Component
// ============================================

export const ChatInputScreen: React.FC<ChatInputScreenProps> = ({
  heading,
  placeholder,
  onSend,
  isSubmitting = false,
  suggestions,
  executionMode = 'normal',
  onExecutionModeChange,
  voiceInputEnabled = false,
  onStartRealtimeVoice,
}) => {
  const { i18n } = useTranslation();
  const { user, isAnonymous } = useAuth();
  const { agents } = useAgents();
  const { error: notifyError } = useNotification();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const chatInputContent = useMemo(() => getChatInputContent(currentLanguage), [currentLanguage]);
  const displayPlaceholder = placeholder ?? chatInputContent.placeholder;

  const [rotatingHeading, setRotatingHeading] = useState(() =>
    getRandomChatHeading(currentLanguage)
  );
  const [typedHeading, setTypedHeading] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [localExecutionMode, setLocalExecutionMode] = useState<ChatExecutionMode>(executionMode);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const agentSelectorRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const displayHeading = heading ?? rotatingHeading;
  const isVoiceBusy = isRecordingVoice || isTranscribingVoice;

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const releaseRecordingStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const getRecordingMimeType = () => {
    if (typeof MediaRecorder === 'undefined') {
      return null;
    }

    const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];

    return preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
  };

  const clearRecordingState = () => {
    stopRecordingTimer();
    releaseRecordingStream();
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleTranscribeRecordedAudio = async (audioBlob: Blob) => {
    setIsTranscribingVoice(true);

    try {
      const mimeType = audioBlob.type || 'audio/webm';
      const extension = mimeType.includes('mp4')
        ? 'm4a'
        : mimeType.includes('mpeg')
          ? 'mp3'
          : 'webm';
      const audioFile = new File([audioBlob], `new-chat-voice-${Date.now()}.${extension}`, {
        type: mimeType,
      });
      const response = await transcribeVoiceAudio({ audio: audioFile });

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to transcribe audio');
      }

      const transcript = response.data?.transcript?.trim();
      if (!transcript) {
        throw new Error('No transcript was returned');
      }

      if (!isMountedRef.current) {
        return;
      }

      const trimmedCurrent = inputValue.trim();
      const messageToSend = trimmedCurrent ? `${trimmedCurrent} ${transcript}` : transcript;

      setUploadError(null);
      await onSend(messageToSend, selectedImage ?? undefined, selectedAgent, localExecutionMode);

      setInputValue('');
      setSelectedImage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      if (isMountedRef.current) {
        notifyError(error instanceof Error ? error.message : 'Failed to transcribe audio');
      }
    } finally {
      if (isMountedRef.current) {
        setIsTranscribingVoice(false);
      }
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      clearRecordingState();
      return;
    }

    try {
      recorder.requestData();
    } catch {
      // requestData can race with stop in some browsers.
    }
    recorder.stop();
  };

  const startVoiceRecording = async () => {
    if (
      isSubmitting ||
      isRecordingVoice ||
      isTranscribingVoice ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      notifyError('Voice input is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingSeconds(0);
      setIsRecordingVoice(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_VOICE_RECORDING_SECONDS) {
            window.setTimeout(() => stopVoiceRecording(), 0);
          }
          return Math.min(next, MAX_VOICE_RECORDING_SECONDS);
        });
      }, 1000);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (isMountedRef.current) {
          clearRecordingState();
          setIsTranscribingVoice(false);
          notifyError('Failed to record audio.');
        }
      };

      recorder.onstop = async () => {
        const recordedChunks = recordingChunksRef.current;
        const recordedMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(recordedChunks, { type: recordedMimeType });

        clearRecordingState();

        if (audioBlob.size === 0) {
          if (isMountedRef.current) {
            notifyError('No audio was captured.');
          }
          return;
        }

        await handleTranscribeRecordedAudio(audioBlob);
      };

      recorder.start(250);
    } catch (error) {
      clearRecordingState();
      notifyError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : error instanceof Error
            ? error.message
            : 'Unable to start voice recording'
      );
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
      return;
    }

    void startVoiceRecording();
  };

  useEffect(() => {
    setLocalExecutionMode(executionMode);
  }, [executionMode]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopRecordingTimer();
      releaseRecordingStream();
      mediaRecorderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (heading) {
      return;
    }

    setRotatingHeading((currentHeading) => getRandomChatHeading(currentLanguage, currentHeading));

    const intervalId = window.setInterval(() => {
      setRotatingHeading((currentHeading) => getRandomChatHeading(currentLanguage, currentHeading));
    }, CHAT_HEADING_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [currentLanguage, heading]);

  useEffect(() => {
    const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (shouldReduceMotion) {
      setTypedHeading(displayHeading);
      return;
    }

    let nextCharacterIndex = 0;
    setTypedHeading('');

    const timeoutId = window.setInterval(() => {
      nextCharacterIndex += 1;
      setTypedHeading(displayHeading.slice(0, nextCharacterIndex));

      if (nextCharacterIndex >= displayHeading.length) {
        window.clearInterval(timeoutId);
      }
    }, CHAT_HEADING_TYPE_MS);

    return () => window.clearInterval(timeoutId);
  }, [displayHeading]);

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
    if (!trimmed || isSubmitting || isVoiceBusy) return;

    await onSend(trimmed, selectedImage ?? undefined, selectedAgent, localExecutionMode);
    setInputValue('');
    setSelectedImage(null);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [
    inputValue,
    isSubmitting,
    isVoiceBusy,
    localExecutionMode,
    selectedAgent,
    selectedImage,
    onSend,
  ]);

  const handleExecutionModeChange = (mode: ChatExecutionMode) => {
    setLocalExecutionMode(mode);
    onExecutionModeChange?.(mode);
  };

  const handleStartRealtimeVoice = async () => {
    if (!onStartRealtimeVoice || isSubmitting || isVoiceBusy) {
      return;
    }

    await onStartRealtimeVoice(selectedAgent, localExecutionMode);
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
        setUploadError(
          'Only image files are supported (PNG, JPG, GIF, WebP, etc.) in anonymous mode.'
        );
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

  const canSend = inputValue.trim().length > 0 && !isSubmitting && !isVoiceBusy;

  return (
    <div className="flex w-full flex-col items-center px-4">
      {/* Heading */}
      <h1
        aria-label={displayHeading}
        className="mb-8 min-h-[2.5rem] overflow-hidden text-center text-3xl font-semibold text-gray-900 dark:text-white sm:min-h-[3rem] sm:text-4xl"
      >
        <span className="chat-typewriter inline-block" aria-hidden="true">
          {typedHeading}
          <span className="chat-typewriter-cursor" />
        </span>
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
            placeholder={displayPlaceholder}
            disabled={isSubmitting || isVoiceBusy}
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
                disabled={isSubmitting || isVoiceBusy}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  menuOpen
                    ? 'bg-gray-200 text-gray-900 dark:bg-slate-700/70 dark:text-white'
                    : 'text-gray-400 hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-300 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white dark:disabled:text-slate-600'
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
              {voiceInputEnabled && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={isSubmitting || isTranscribingVoice}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    isRecordingVoice
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-600'
                  }`}
                  title={isRecordingVoice ? 'Stop REST voice recording' : 'REST voice to text'}
                  aria-label={
                    isRecordingVoice ? 'Stop REST voice recording' : 'REST voice to text'
                  }
                >
                  {isTranscribingVoice ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecordingVoice ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}

              {onStartRealtimeVoice && (
                <button
                  type="button"
                  onClick={() => void handleStartRealtimeVoice()}
                  disabled={isSubmitting || isVoiceBusy}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                  title="Start realtime voice chat"
                  aria-label="Start realtime voice chat"
                >
                  <PhoneCall className="h-4 w-4" />
                </button>
              )}

              <select
                value={localExecutionMode}
                onChange={(event) =>
                  handleExecutionModeChange(event.target.value as ChatExecutionMode)
                }
                disabled={isSubmitting || isVoiceBusy}
                aria-label="Model mode"
                className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium capitalize text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-400 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-[#0F1F38] dark:text-slate-300 dark:focus:border-slate-500"
              >
                {CHAT_EXECUTION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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

        {isVoiceBusy && (
          <p className="mt-2.5 text-center text-xs text-gray-400 dark:text-slate-500">
            {isRecordingVoice
              ? `Recording voice message${recordingSeconds > 0 ? ` - ${recordingSeconds}s / ${MAX_VOICE_RECORDING_SECONDS}s` : ''}`
              : 'Transcribing voice message...'}
          </p>
        )}

        {/* Hint */}
        <p className="mt-2.5 text-center text-xs text-gray-400 dark:text-slate-600">
          Press Enter to send &nbsp;·&nbsp; Shift+Enter for new line
        </p>
      </div>

      {/* Suggestion chips */}
      {suggestions && suggestions.length > 0 && (
        <div
          key={suggestions.join('|')}
          className="chat-copy-slide mt-6 flex flex-wrap justify-center gap-2"
        >
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
