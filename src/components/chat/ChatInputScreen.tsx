import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ArrowUp,
  X,
  File as FileIcon,
  ChevronDown,
  Bot,
  Mic,
  MicOff,
  Loader2,
  PhoneCall,
  PhoneOff,
  Square,
  StopCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAgents } from '../../contexts/AgentsContext';
import { useNotification } from '../../hooks/useNotification';
import { AvatarMedia } from './AvatarMedia';
import { ImagePreviewModal } from './ImagePreviewModal';
import { getChatInputContent, getRandomChatHeading } from './chatInputContent';
import type { Agent } from '../../types';
import type { ChatExecutionMode } from '../../hooks/useChatAgent';
import type { RealtimeVoiceAgentState } from '../../hooks/useRealtimeVoiceAgent';
import { CHAT_EXECUTION_MODE_OPTIONS } from '../../common/chatExecutionMode';
import { transcribeVoiceAudio } from '../../services/api';

interface FileWithPreview {
  file: File;
  previewUrl?: string;
}

export interface ChatInputScreenProps {
  heading?: string;
  placeholder?: string;
  onSend: (
    message: string,
    files?: File[],
    agent?: Agent | null,
    mode?: ChatExecutionMode
  ) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isGenerating?: boolean;
  suggestions?: string[];
  executionMode?: ChatExecutionMode;
  onExecutionModeChange?: (mode: ChatExecutionMode) => void;
  voiceInputEnabled?: boolean;
  onStartRealtimeVoice?: (agent: Agent | null, mode: ChatExecutionMode) => void | Promise<void>;
  voiceAgent?: RealtimeVoiceAgentState;
  showHeading?: boolean;
  showAgentSelector?: boolean;
  compact?: boolean;
  warningText?: string;
  multipleAttachments?: boolean;
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
]);
const MAX_ANON_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 15 * 1024 * 1024;
const CHAT_HEADING_ROTATION_MS = 4800;
const CHAT_HEADING_TYPE_MS = 64;
const MAX_VOICE_RECORDING_SECONDS = 60;

export const ChatInputScreen: React.FC<ChatInputScreenProps> = ({
  heading,
  placeholder,
  onSend,
  onCancel,
  isSubmitting = false,
  isGenerating = false,
  suggestions,
  executionMode = 'normal',
  onExecutionModeChange,
  voiceInputEnabled = false,
  onStartRealtimeVoice,
  voiceAgent,
  showHeading = true,
  showAgentSelector = true,
  compact = false,
  warningText,
  multipleAttachments = true,
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
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [localExecutionMode, setLocalExecutionMode] = useState<ChatExecutionMode>(executionMode);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRealtimeCallActive, setIsRealtimeCallActive] = useState(false);
  const [hasUserEndedRealtimeCall, setHasUserEndedRealtimeCall] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedPreview, setSelectedPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const agentSelectorRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const voiceAgentRef = useRef<RealtimeVoiceAgentState | undefined>(voiceAgent);
  const displayHeading = heading ?? rotatingHeading;
  const isVoiceBusy = isRecordingVoice || isTranscribingVoice;
  const realtimeVoiceAvailable = Boolean(voiceAgent?.available);
  const realtimeVoiceStatus = voiceAgent?.status ?? 'idle';
  const realtimeVoiceReady = Boolean(realtimeVoiceAvailable && voiceAgent?.connected);
  const isRealtimeVoiceActive = Boolean(
    realtimeVoiceAvailable &&
    voiceAgent &&
    (isRealtimeCallActive || (realtimeVoiceStatus !== 'idle' && !hasUserEndedRealtimeCall))
  );
  const canSendText =
    inputValue.trim().length > 0 &&
    !isSubmitting &&
    !isGenerating &&
    !isVoiceBusy &&
    !isSending &&
    !isRealtimeVoiceActive;
  const canSubmit = canSendText;
  const canUseVoice = !isSubmitting && !isGenerating && !isSending;
  const realtimeVoiceStatusLabel =
    realtimeVoiceStatus === 'listening'
      ? 'Listening'
      : realtimeVoiceStatus === 'thinking'
        ? 'Thinking'
        : realtimeVoiceStatus === 'speaking'
          ? 'Speaking'
          : voiceAgent?.connected
            ? 'Voice connected'
            : 'Voice connecting';

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

  const clearAttachments = useCallback(() => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
    setAttachments([]);
    setSelectedPreview(null);
  }, [attachments]);

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
    }

    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const validateAttachments = (files: File[]): string | null => {
    if (isAnonymous) {
      const invalidFile = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
      if (invalidFile) {
        return 'Only image files are supported (PNG, JPG, GIF, WebP, etc.) in anonymous mode.';
      }

      const oversizedFile = files.find((file) => file.size > MAX_ANON_FILE_SIZE);
      if (oversizedFile) {
        return `Image must be smaller than 5 MB (selected: ${(oversizedFile.size / 1024 / 1024).toFixed(1)} MB).`;
      }
    }

    if (files.length > MAX_ATTACHMENT_COUNT) {
      return `Attach up to ${MAX_ATTACHMENT_COUNT} files per message.`;
    }

    const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      return `"${oversizedFile.name}" is larger than ${formatBytes(MAX_FILE_SIZE_BYTES)}.`;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      return `Attachments exceed ${formatBytes(MAX_TOTAL_SIZE_BYTES)} total.`;
    }

    return null;
  };

  const submitMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      setUploadError(null);
      setIsSending(true);
      try {
        const files = attachments.map((attachment) => attachment.file);
        await onSend(
          trimmed,
          files.length > 0 ? files : undefined,
          selectedAgent,
          localExecutionMode
        );
        setInputValue('');
        clearAttachments();
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } finally {
        if (isMountedRef.current) {
          setIsSending(false);
        }
      }
    },
    [attachments, clearAttachments, localExecutionMode, onSend, selectedAgent]
  );

  const handleTranscribeRecordedAudio = async (audioBlob: Blob) => {
    setIsTranscribingVoice(true);
    setUploadError(null);

    try {
      const mimeType = audioBlob.type || 'audio/webm';
      const extension = mimeType.includes('mp4')
        ? 'm4a'
        : mimeType.includes('mpeg')
          ? 'mp3'
          : 'webm';
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, {
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
      await submitMessage(trimmedCurrent ? `${trimmedCurrent} ${transcript}` : transcript);
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
      // Some browsers throw when requestData races with stop; onstop still handles existing chunks.
    }
    recorder.stop();
  };

  const startVoiceRecording = async () => {
    if (
      !canUseVoice ||
      isRecordingVoice ||
      isTranscribingVoice ||
      isRealtimeVoiceActive ||
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

  const startOrToggleRealtimeVoice = async () => {
    if (voiceAgent) {
      if (!realtimeVoiceAvailable) return;
      if (!isRealtimeVoiceActive && !realtimeVoiceReady) {
        notifyError('Voice connection is not ready.');
        return;
      }

      if (!isRealtimeVoiceActive) {
        try {
          setIsRealtimeCallActive(true);
          setHasUserEndedRealtimeCall(false);
          await voiceAgent.startCall();
        } catch (error) {
          setIsRealtimeCallActive(false);
          setHasUserEndedRealtimeCall(false);
          notifyError(error instanceof Error ? error.message : 'Unable to start voice call');
        }
        return;
      }

      voiceAgent.endCall();
      setIsRealtimeCallActive(false);
      setHasUserEndedRealtimeCall(true);
      return;
    }

    if (onStartRealtimeVoice && canUseVoice && !isVoiceBusy) {
      await onStartRealtimeVoice(selectedAgent, localExecutionMode);
    }
  };

  useEffect(() => {
    setLocalExecutionMode(executionMode);
  }, [executionMode]);

  useEffect(() => {
    voiceAgentRef.current = voiceAgent;
  }, [voiceAgent]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      const activeVoiceAgent = voiceAgentRef.current;
      if (activeVoiceAgent && activeVoiceAgent.status !== 'idle') {
        activeVoiceAgent.endCall();
      }
      stopRecordingTimer();
      releaseRecordingStream();
      mediaRecorderRef.current = null;
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showHeading || heading) {
      return;
    }

    setRotatingHeading((currentHeading) => getRandomChatHeading(currentLanguage, currentHeading));

    const intervalId = window.setInterval(() => {
      setRotatingHeading((currentHeading) => getRandomChatHeading(currentLanguage, currentHeading));
    }, CHAT_HEADING_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [currentLanguage, heading, showHeading]);

  useEffect(() => {
    if (!showHeading) {
      return;
    }

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
  }, [displayHeading, showHeading]);

  useEffect(() => {
    if (!showAgentSelector || compact || isAnonymous || !user || agents.length === 0) {
      setSelectedAgent(null);
      return;
    }

    const selectedAgentStillAvailable = selectedAgent
      ? agents.some((agent) => agent.publicId === selectedAgent.publicId)
      : false;

    if (!selectedAgentStillAvailable) {
      setSelectedAgent(agents.find((a) => a.isDefault) ?? agents[0]);
    }
  }, [agents, compact, isAnonymous, selectedAgent, showAgentSelector, user]);

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, compact ? 120 : 200)}px`;
  }, [compact, inputValue]);

  useEffect(() => {
    if (!realtimeVoiceAvailable || !voiceAgent) {
      setIsRealtimeCallActive(false);
      setHasUserEndedRealtimeCall(false);
      return;
    }

    if (realtimeVoiceStatus === 'idle') {
      setIsRealtimeCallActive(false);
      setHasUserEndedRealtimeCall(false);
      return;
    }

    if (hasUserEndedRealtimeCall) {
      return;
    }

    setIsRealtimeCallActive(true);
  }, [hasUserEndedRealtimeCall, realtimeVoiceAvailable, realtimeVoiceStatus, voiceAgent]);

  useEffect(() => {
    if (voiceAgent?.error) {
      notifyError(voiceAgent.error, { preventDuplicate: true });
    }
  }, [notifyError, voiceAgent?.error]);

  const handleExecutionModeChange = (mode: ChatExecutionMode) => {
    setLocalExecutionMode(mode);
    onExecutionModeChange?.(mode);
  };

  const handleFileButtonClick = () => {
    if (isSubmitting || isGenerating || isVoiceBusy || isRealtimeVoiceActive) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(e.target.files ?? []);
    const selectedFiles = multipleAttachments ? inputFiles : inputFiles.slice(0, 1);
    e.target.value = '';
    if (selectedFiles.length === 0) return;

    const nextFiles = [...attachments.map((attachment) => attachment.file), ...selectedFiles];
    const validationError = validateAttachments(nextFiles);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    const newAttachments = selectedFiles.map((file) => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        if (selectedPreview?.url === item.previewUrl) {
          setSelectedPreview(null);
        }
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
    setUploadError(null);
  };

  const triggerDownload = (url: string, fileName: string) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleSend = useCallback(async () => {
    if (!canSubmit) return;

    try {
      await submitMessage(inputValue);
    } catch (error) {
      if (isMountedRef.current) {
        setUploadError(error instanceof Error ? error.message : 'Failed to send message');
      }
    }
  }, [canSubmit, inputValue, submitMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const rootClassName = compact ? 'p-4' : 'flex w-full flex-col items-center px-4';
  const shellClassName = compact ? 'w-full' : 'w-full max-w-2xl';
  const inputBoxClassName = compact
    ? 'relative rounded-xl border border-gray-200 bg-white shadow-sm transition-colors focus-within:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-slate-500'
    : `relative rounded-2xl border bg-white shadow-lg transition-colors dark:bg-[#0F1F38] ${
        canSendText
          ? 'border-blue-400 dark:border-slate-500'
          : 'border-gray-200 dark:border-slate-700'
      } focus-within:border-blue-400 dark:focus-within:border-slate-500`;
  const textareaClassName = compact
    ? 'w-full resize-none bg-transparent px-4 pb-14 pt-4 text-sm leading-5 text-gray-900 placeholder-gray-500 focus:outline-none disabled:cursor-wait dark:text-slate-100 dark:placeholder-slate-400'
    : 'w-full resize-none bg-transparent px-4 pb-14 pt-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-wait dark:text-white dark:placeholder-slate-500';

  return (
    <div className={rootClassName}>
      {showHeading && (
        <h1
          aria-label={displayHeading}
          className="mb-8 min-h-[2.5rem] overflow-hidden text-center text-3xl font-semibold text-gray-900 dark:text-white sm:min-h-[3rem] sm:text-4xl"
        >
          <span className="chat-typewriter inline-block" aria-hidden="true">
            {typedHeading}
            <span className="chat-typewriter-cursor" />
          </span>
        </h1>
      )}

      <div className={shellClassName}>
        {warningText && (
          <p className="px-4 py-2 text-center text-xs italic text-gray-400 dark:text-slate-500">
            {warningText}
          </p>
        )}

        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={`${attachment.file.name}-${index}`}
                className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1.5 dark:border-slate-600 dark:bg-slate-700"
              >
                {attachment.previewUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPreview({
                        url: attachment.previewUrl as string,
                        fileName: attachment.file.name,
                      })
                    }
                    title={`Preview ${attachment.file.name}`}
                    className="block h-12 w-12 cursor-zoom-in overflow-hidden rounded"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.file.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-50 dark:bg-blue-900/30">
                    <FileIcon size={20} className="text-blue-500" />
                  </div>
                )}
                <div className="max-w-[140px]">
                  <p className="truncate text-xs font-medium text-gray-700 dark:text-slate-300">
                    {attachment.file.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    {(attachment.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-white transition-colors hover:bg-gray-600 dark:bg-slate-500 dark:hover:bg-slate-300"
                  title="Remove attachment"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {uploadError}
          </div>
        )}

        <div className={inputBoxClassName}>
          {showAgentSelector && !compact && !isAnonymous && user && agents.length > 0 && (
            <div ref={agentSelectorRef} className="relative px-3 pt-3">
              <button
                type="button"
                onClick={() => setAgentDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
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
                <span className="font-medium">{selectedAgent?.name ?? 'Select Agent'}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform dark:text-slate-500 ${
                    agentDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

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

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={displayPlaceholder}
            disabled={
              isSubmitting || isGenerating || isVoiceBusy || isSending || isRealtimeVoiceActive
            }
            rows={1}
            className={textareaClassName}
            style={{ minHeight: compact ? '56px' : '56px', maxHeight: compact ? '120px' : '200px' }}
          />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleFileButtonClick}
              disabled={isSubmitting || isGenerating || isVoiceBusy || isRealtimeVoiceActive}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-300 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white dark:disabled:text-slate-600"
              title={isAnonymous ? 'Upload image' : 'Upload image or file'}
              aria-label={isAnonymous ? 'Upload image' : 'Upload image or file'}
            >
              <Plus className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <select
                value={localExecutionMode}
                onChange={(event) =>
                  handleExecutionModeChange(event.target.value as ChatExecutionMode)
                }
                disabled={
                  isSubmitting || isGenerating || isVoiceBusy || isSending || isRealtimeVoiceActive
                }
                aria-label="Model mode"
                className="h-8 max-w-[112px] rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium capitalize text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-400 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-[#0F1F38] dark:text-slate-300 dark:focus:border-slate-500 sm:max-w-none"
              >
                {CHAT_EXECUTION_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {voiceInputEnabled && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  disabled={!canUseVoice || isTranscribingVoice || isRealtimeVoiceActive}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isRecordingVoice
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-600'
                  }`}
                  title={isRecordingVoice ? 'Stop voice recording' : 'Voice message'}
                  aria-label={isRecordingVoice ? 'Stop voice recording' : 'Voice message'}
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

              {(voiceAgent || onStartRealtimeVoice) && (
                <button
                  type="button"
                  onClick={() => void startOrToggleRealtimeVoice()}
                  disabled={
                    !canUseVoice ||
                    isVoiceBusy ||
                    Boolean(
                      voiceAgent &&
                      (!realtimeVoiceAvailable || (!isRealtimeVoiceActive && !realtimeVoiceReady))
                    )
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isRealtimeVoiceActive
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-600'
                  }`}
                  title={
                    isRealtimeVoiceActive ? 'End realtime voice call' : 'Start realtime voice chat'
                  }
                  aria-label={
                    isRealtimeVoiceActive ? 'End realtime voice call' : 'Start realtime voice chat'
                  }
                >
                  {isRealtimeVoiceActive ? (
                    <PhoneOff className="h-4 w-4" />
                  ) : (
                    <PhoneCall className="h-4 w-4" />
                  )}
                </button>
              )}

              {isRealtimeVoiceActive && voiceAgent && (
                <button
                  type="button"
                  onClick={voiceAgent.toggleMute}
                  disabled={isSubmitting || isGenerating}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    voiceAgent.isMuted
                      ? 'bg-gray-800 text-white hover:bg-gray-900'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-white'
                  }`}
                  title={voiceAgent.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-label={voiceAgent.isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {voiceAgent.isMuted ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>
              )}

              {isGenerating && onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  title="Cancel response"
                  aria-label="Cancel response"
                >
                  <StopCircle className="h-4 w-4" />
                </button>
              ) : canSendText ? (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-white transition-colors hover:bg-teal-600"
                  title="Send message"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multipleAttachments}
          accept={isAnonymous ? 'image/*' : '*/*'}
          className="hidden"
          onChange={handleFileChange}
        />

        {isRealtimeVoiceActive && voiceAgent && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
            <span>{realtimeVoiceStatusLabel}</span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
              <span
                className="block h-full rounded-full bg-teal-500 transition-[width]"
                style={{ width: `${Math.round(Math.min(voiceAgent.audioLevel, 1) * 100)}%` }}
              />
            </span>
            {voiceAgent.interimTranscript && (
              <span className="min-w-0 flex-1 truncate italic">{voiceAgent.interimTranscript}</span>
            )}
          </div>
        )}

        {!isRealtimeVoiceActive && isVoiceBusy && (
          <p className="mt-2.5 text-center text-xs text-gray-400 dark:text-slate-500">
            {isRecordingVoice
              ? `Recording voice message${recordingSeconds > 0 ? ` - ${recordingSeconds}s / ${MAX_VOICE_RECORDING_SECONDS}s` : ''}`
              : 'Transcribing voice message...'}
          </p>
        )}

        {!compact && (
          <p className="mt-2.5 text-center text-xs text-gray-400 dark:text-slate-600">
            Press Enter to send &nbsp;·&nbsp; Shift+Enter for new line
          </p>
        )}
      </div>

      {suggestions && suggestions.length > 0 && (
        <div
          key={suggestions.join('|')}
          className="chat-copy-slide mt-6 flex flex-wrap justify-center gap-2"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <ImagePreviewModal
        open={Boolean(selectedPreview)}
        src={selectedPreview?.url || ''}
        alt={selectedPreview?.fileName || 'Image preview'}
        onClose={() => setSelectedPreview(null)}
        onDownload={
          selectedPreview
            ? () => triggerDownload(selectedPreview.url, selectedPreview.fileName)
            : undefined
        }
      />
    </div>
  );
};
