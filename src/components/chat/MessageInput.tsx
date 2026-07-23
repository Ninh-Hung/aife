/**
 * MessageInput Component
 * Multiline textarea with send button for chat messages
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, X, File as FileIcon, StopCircle } from 'lucide-react';
import { IconButton } from '@mui/material';
import type { ChatExecutionMode } from '../../hooks/useChatAgent';
import { CHAT_EXECUTION_MODE_OPTIONS } from '../../common/chatExecutionMode';

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
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onCancel,
  disabled = false,
  isGenerating = false,
  placeholder = 'Type your message...',
  mode,
  onModeChange,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxAttachmentCount = 5;
  const maxFileSizeBytes = 2 * 1024 * 1024;
  const maxTotalSizeBytes = 6 * 1024 * 1024;

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Cleanup all preview URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((trimmedMessage || attachments.length > 0) && !disabled && !isGenerating && !isSending) {
      const files = attachments.map((a) => a.file);
      setAttachmentError(null);
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

  const canSend =
    !disabled &&
    !isGenerating &&
    !isSending &&
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

        {/* Plus / Attach Button */}
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isGenerating || isSending}
          size="small"
          className="flex-shrink-0"
          sx={{
            color: 'rgb(107 114 128)',
            '&:hover': {
              bgcolor: 'rgb(243 244 246)',
              color: 'rgb(59 130 246)',
            },
          }}
        >
          <Plus size={20} />
        </IconButton>

        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as ChatExecutionMode)}
          disabled={disabled || isGenerating || isSending}
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
            disabled={disabled || isGenerating || isSending}
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
      {selectedPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedPreview(null)}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPreview(null)}
              title="Close preview"
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X size={18} />
            </button>
            <img
              src={selectedPreview.url}
              alt={selectedPreview.fileName}
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
