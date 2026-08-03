/**
 * MessageInput Component
 * Multiline textarea with send button for chat messages
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Plus,
  X,
  File as FileIcon,
  FileUp,
  StopCircle,
  Mic,
  MicOff,
  Loader2,
  PhoneCall,
  PhoneOff,
  Square,
} from 'lucide-react';
import { IconButton } from '@mui/material';
import type { ChatExecutionMode } from '../../hooks/useChatAgent';
import type { RealtimeVoiceAgentState } from '../../hooks/useRealtimeVoiceAgent';
import { useNotification } from '../../hooks/useNotification';
import { CHAT_EXECUTION_MODE_OPTIONS } from '../../common/chatExecutionMode';
import { ImagePreviewModal } from './ImagePreviewModal';
import { transcribeVoiceAudio } from '../../services/api';

interface FileWithPreview {
  file: File;
  previewUrl?: string;
}

interface MessageInputProps {
  onSend: (message: string, files?: File[]) => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
  mode: ChatExecutionMode;
  onModeChange: (mode: ChatExecutionMode) => void;
  voiceAgent?: RealtimeVoiceAgentState;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onCancel,
  disabled = false,
  isGenerating = false,
  placeholder = 'Type your message...',
  mode,
  onModeChange,
  voiceAgent,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRealtimeCallActive, setIsRealtimeCallActive] = useState(false);
  const [hasUserEndedRealtimeCall, setHasUserEndedRealtimeCall] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const lastVisibleVoiceErrorRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const voiceAgentRef = useRef<RealtimeVoiceAgentState | undefined>(voiceAgent);
  const { error: notifyError } = useNotification();

  const maxAttachmentCount = 5;
  const maxFileSizeBytes = 5 * 1024 * 1024;
  const maxTotalSizeBytes = 15 * 1024 * 1024;
  const maxRecordingSeconds = 60;
  const realtimeVoiceAvailable = Boolean(voiceAgent?.available);
  const realtimeVoiceStatus = voiceAgent?.status ?? 'idle';
  const realtimeVoiceConnected = Boolean(voiceAgent?.connected);
  const realtimeVoiceReady = Boolean(realtimeVoiceAvailable && voiceAgent?.connected);
  const isRealtimeVoiceActive = Boolean(
    realtimeVoiceAvailable &&
      voiceAgent &&
      (isRealtimeCallActive || (realtimeVoiceStatus !== 'idle' && !hasUserEndedRealtimeCall))
  );
  const realtimeVoiceStatusLabel =
    realtimeVoiceStatus === 'listening'
      ? 'Listening'
      : realtimeVoiceStatus === 'thinking'
        ? 'Thinking'
        : realtimeVoiceStatus === 'speaking'
          ? 'Speaking'
          : realtimeVoiceConnected
            ? 'Voice connected'
            : 'Voice connecting';
  const visibleVoiceError = voiceError || voiceAgent?.error || null;
  const actionMenuDisabled =
    disabled || isGenerating || isSending || isRecording || isTranscribing || isRealtimeVoiceActive;

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Cleanup all preview URLs on unmount
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
      attachments.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [
    hasUserEndedRealtimeCall,
    realtimeVoiceAvailable,
    realtimeVoiceConnected,
    realtimeVoiceStatus,
    voiceAgent,
  ]);

  useEffect(() => {
    if (voiceAgent?.error && realtimeVoiceStatus === 'idle') {
      setIsRealtimeCallActive(false);
      setHasUserEndedRealtimeCall(true);
    }
  }, [realtimeVoiceStatus, voiceAgent?.error]);

  useEffect(() => {
    if (!visibleVoiceError) {
      lastVisibleVoiceErrorRef.current = null;
      return;
    }

    if (lastVisibleVoiceErrorRef.current === visibleVoiceError) {
      return;
    }

    lastVisibleVoiceErrorRef.current = visibleVoiceError;
    notifyError(visibleVoiceError, { preventDuplicate: true });
  }, [notifyError, visibleVoiceError]);

  useEffect(() => {
    if (!actionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        actionMenuRef.current?.contains(target) ||
        actionButtonRef.current?.contains(target)
      ) {
        return;
      }

      setActionMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [actionMenuOpen]);

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
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleTranscribeRecordedAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setVoiceError(null);

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

      const trimmedCurrent = message.trim();
      const messageToSend = trimmedCurrent ? `${trimmedCurrent} ${transcript}` : transcript;
      const files = attachments.map((attachment) => attachment.file);

      setAttachmentError(null);
      setIsSending(true);

      try {
        await onSend(messageToSend, files.length > 0 ? files : undefined);

        attachments.forEach((attachment) => {
          if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
        });

        setMessage('');
        setAttachments([]);
        setSelectedPreview(null);

        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } finally {
        if (isMountedRef.current) {
          setIsSending(false);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setVoiceError(error instanceof Error ? error.message : 'Failed to transcribe audio');
    } finally {
      if (isMountedRef.current) {
        setIsTranscribing(false);
      }
    }
  };

  const stopRecording = () => {
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

  const startRecording = async () => {
    if (
      disabled ||
      isGenerating ||
      isSending ||
      isRecording ||
      isTranscribing ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    setVoiceError(null);

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
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => {
          const next = current + 1;
          if (next >= maxRecordingSeconds) {
            window.setTimeout(() => stopRecording(), 0);
          }
          return Math.min(next, maxRecordingSeconds);
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
          setVoiceError('Failed to record audio.');
          setIsTranscribing(false);
        }
      };

      recorder.onstop = async () => {
        const recordedChunks = recordingChunksRef.current;
        const recordedMimeType = recorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(recordedChunks, { type: recordedMimeType });

        clearRecordingState();

        if (audioBlob.size === 0) {
          if (isMountedRef.current) {
            setVoiceError('No audio was captured.');
          }
          return;
        }

        await handleTranscribeRecordedAudio(audioBlob);
      };

      recorder.start(250);
    } catch (error) {
      clearRecordingState();
      setVoiceError(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : error instanceof Error
            ? error.message
            : 'Unable to start voice recording'
      );
    }
  };

  const toggleRealtimeVoiceCall = async () => {
    if (!voiceAgent || !realtimeVoiceAvailable) {
      return;
    }

    setVoiceError(null);
    if (!isRealtimeVoiceActive) {
      if (!realtimeVoiceReady) {
        setVoiceError('Voice connection is not ready.');
        return;
      }

      try {
        setIsRealtimeCallActive(true);
        setHasUserEndedRealtimeCall(false);
        await voiceAgent.startCall();
      } catch (error) {
        setIsRealtimeCallActive(false);
        setHasUserEndedRealtimeCall(false);
        setVoiceError(error instanceof Error ? error.message : 'Unable to start voice call');
      }
      return;
    }

    voiceAgent.endCall();
    setIsRealtimeCallActive(false);
    setHasUserEndedRealtimeCall(true);
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    void startRecording();
  };

  const handleUploadAction = () => {
    setActionMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleVoiceMessageAction = () => {
    setActionMenuOpen(false);
    toggleVoiceRecording();
  };

  const handleRealtimeCallAction = () => {
    setActionMenuOpen(false);
    void toggleRealtimeVoiceCall();
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (
      (trimmedMessage || attachments.length > 0) &&
      !disabled &&
      !isGenerating &&
      !isSending &&
      !isRecording &&
      !isTranscribing
    ) {
      const files = attachments.map((a) => a.file);
      setAttachmentError(null);
      setVoiceError(null);
      setIsSending(true);

      try {
        await onSend(trimmedMessage, files.length > 0 ? files : undefined);

        // Revoke preview URLs to free memory
        attachments.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        });

        setMessage('');
        setAttachments([]);
        setSelectedPreview(null);

        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (error) {
        setAttachmentError(error instanceof Error ? error.message : 'Failed to send message');
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    // Guard against IME composition (e.g. predictive text confirming a candidate)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validationError = validateAttachments([
        ...attachments.map((attachment) => attachment.file),
        ...selectedFiles,
      ]);

      if (validationError) {
        setAttachmentError(validationError);
      } else {
        setAttachmentError(null);
        const newAttachments: FileWithPreview[] = selectedFiles.map((file) => ({
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
      }

      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  };

  const validateAttachments = (files: File[]): string | null => {
    if (files.length > maxAttachmentCount) {
      return `Attach up to ${maxAttachmentCount} files per message.`;
    }

    const oversizedFile = files.find((file) => file.size > maxFileSizeBytes);
    if (oversizedFile) {
      return `"${oversizedFile.name}" is larger than ${formatBytes(maxFileSizeBytes)}.`;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > maxTotalSizeBytes) {
      return `Attachments exceed ${formatBytes(maxTotalSizeBytes)} total.`;
    }

    return null;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
    }

    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => {
      const item = prev[index];
      if (item.previewUrl) {
        if (selectedPreview?.url === item.previewUrl) {
          setSelectedPreview(null);
        }
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
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

  const canSend =
    !disabled &&
    !isGenerating &&
    !isSending &&
    !isRecording &&
    !isTranscribing &&
    (message.trim().length > 0 || attachments.length > 0);

  return (
    <div className="border-t border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      {/* File / Image Previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
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
              <div className="max-w-[100px]">
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
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachmentError && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {attachmentError}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Message actions */}
        <div className="relative flex-shrink-0">
          <IconButton
            ref={actionButtonRef}
            onClick={() => setActionMenuOpen((current) => !current)}
            disabled={actionMenuDisabled}
            size="small"
            title="Message actions"
            aria-label="Message actions"
            aria-expanded={actionMenuOpen}
            sx={{
              width: 42,
              height: 42,
              p: 0,
              color: actionMenuOpen ? 'rgb(17 24 39)' : 'rgb(107 114 128)',
              bgcolor: actionMenuOpen ? 'rgb(229 231 235)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgb(243 244 246)',
                color: 'rgb(59 130 246)',
              },
              '&:disabled': {
                color: 'rgb(148 163 184)',
              },
            }}
          >
            <Plus size={20} />
          </IconButton>

          {actionMenuOpen && (
            <div
              ref={actionMenuRef}
              className="absolute bottom-full left-0 z-30 mb-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={handleUploadAction}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white"
              >
                <FileUp className="h-4 w-4 shrink-0 text-teal-500" />
                <span>Upload file or image</span>
              </button>
              <button
                type="button"
                onClick={handleVoiceMessageAction}
                disabled={isRealtimeVoiceActive}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white dark:disabled:text-slate-600"
              >
                <Mic className="h-4 w-4 shrink-0 text-blue-500" />
                <span>Voice message</span>
              </button>
              {voiceAgent && (
                <button
                  type="button"
                  onClick={handleRealtimeCallAction}
                  disabled={!realtimeVoiceAvailable || !realtimeVoiceReady}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-slate-300 dark:hover:bg-slate-700/60 dark:hover:text-white dark:disabled:text-slate-600"
                >
                  <PhoneCall className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Call realtime</span>
                </button>
              )}
            </div>
          )}
        </div>

        {(isRecording || isTranscribing) && (
          <IconButton
            onClick={toggleVoiceRecording}
            disabled={disabled || isGenerating || isSending || isTranscribing}
            size="small"
            title={isRecording ? 'Stop voice recording' : 'Transcribing voice message'}
            aria-label={isRecording ? 'Stop voice recording' : 'Transcribing voice message'}
            className="flex-shrink-0"
            sx={{
              width: 42,
              height: 42,
              p: 0,
              bgcolor: isRecording ? 'rgb(239 68 68)' : 'rgb(248 250 252)',
              color: isRecording ? 'white' : 'rgb(75 85 99)',
              border: '1px solid rgb(209 213 219)',
              '&:hover': {
                bgcolor: isRecording ? 'rgb(220 38 38)' : 'rgb(243 244 246)',
                color: isRecording ? 'white' : 'rgb(59 130 246)',
              },
              '&:disabled': {
                bgcolor: 'rgb(226 232 240)',
                color: 'rgb(148 163 184)',
              },
            }}
          >
            {isTranscribing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Square size={16} />
            )}
          </IconButton>
        )}

        {isRealtimeVoiceActive && voiceAgent && (
          <IconButton
            onClick={toggleRealtimeVoiceCall}
            disabled={disabled || isGenerating || isSending}
            size="small"
            title="End realtime voice call"
            aria-label="End realtime voice call"
            className="flex-shrink-0"
            sx={{
              width: 42,
              height: 42,
              p: 0,
              bgcolor: 'rgb(239 68 68)',
              color: 'white',
              border: '1px solid rgb(209 213 219)',
              '&:hover': {
                bgcolor: 'rgb(220 38 38)',
                color: 'white',
              },
              '&:disabled': {
                bgcolor: 'rgb(226 232 240)',
                color: 'rgb(148 163 184)',
              },
            }}
          >
            <PhoneOff size={16} />
          </IconButton>
        )}

        {isRealtimeVoiceActive && voiceAgent && (
          <IconButton
            onClick={voiceAgent.toggleMute}
            disabled={disabled}
            size="small"
            title={voiceAgent.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={voiceAgent.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className="flex-shrink-0"
            sx={{
              width: 42,
              height: 42,
              p: 0,
              bgcolor: voiceAgent.isMuted ? 'rgb(31 41 55)' : 'rgb(248 250 252)',
              color: voiceAgent.isMuted ? 'white' : 'rgb(75 85 99)',
              border: '1px solid rgb(209 213 219)',
              '&:hover': {
                bgcolor: voiceAgent.isMuted ? 'rgb(17 24 39)' : 'rgb(243 244 246)',
                color: voiceAgent.isMuted ? 'white' : 'rgb(59 130 246)',
              },
            }}
          >
            {voiceAgent.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </IconButton>
        )}

        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as ChatExecutionMode)}
          disabled={disabled || isGenerating || isSending || isRecording || isTranscribing}
          aria-label="Model mode"
          className="h-[42px] flex-shrink-0 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium capitalize text-gray-700 outline-none transition-colors hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:focus:border-blue-500"
        >
          {CHAT_EXECUTION_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Textarea Container */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isGenerating || isSending || isRecording || isTranscribing}
            rows={1}
            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm leading-5 text-gray-900 placeholder-gray-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-blue-500"
            style={{
              maxHeight: '120px',
              minHeight: '42px',
            }}
          />
        </div>

        {/* Send / Cancel Button */}
        <IconButton
          onClick={isGenerating ? onCancel : handleSend}
          disabled={isGenerating ? disabled || !onCancel : !canSend}
          title={isGenerating ? 'Cancel response' : 'Send message'}
          className="h-10 w-10 flex-shrink-0"
          sx={{
            bgcolor: isGenerating ? 'rgb(239 68 68)' : 'rgb(59 130 246)',
            color: 'white',
            '&:hover': {
              bgcolor: isGenerating ? 'rgb(220 38 38)' : 'rgb(37 99 235)',
            },
            '&:disabled': {
              bgcolor: 'rgb(203 213 225)',
              color: 'rgb(148 163 184)',
            },
          }}
        >
          {isGenerating ? <StopCircle size={18} /> : <Send size={18} />}
        </IconButton>
      </div>
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
      {!isRealtimeVoiceActive && (isRecording || isTranscribing) && (
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          {isRecording
            ? `Recording voice message${recordingSeconds > 0 ? ` - ${recordingSeconds}s / ${maxRecordingSeconds}s` : ''}`
            : 'Transcribing voice message...'}
        </p>
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
