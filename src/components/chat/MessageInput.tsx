/**
 * MessageInput Component
 * Multiline textarea with send button for chat messages
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, X, File as FileIcon } from 'lucide-react';
import { IconButton } from '@mui/material';

interface FileWithPreview {
  file: File;
  previewUrl?: string;
}

interface MessageInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if ((trimmedMessage || attachments.length > 0) && !disabled) {
      const files = attachments.map((a) => a.file);
      onSend(trimmedMessage, files.length > 0 ? files : undefined);

      // Revoke preview URLs to free memory
      attachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });

      setMessage('');
      setAttachments([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
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
      const newAttachments: FileWithPreview[] = Array.from(e.target.files).map((file) => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => {
      const item = prev[index];
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const canSend = !disabled && (message.trim().length > 0 || attachments.length > 0);

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
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="h-12 w-12 rounded object-cover"
                />
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
                onClick={() => handleRemoveFile(index)}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-white transition-colors hover:bg-gray-600 dark:bg-slate-500 dark:hover:bg-slate-300"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
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
          disabled={disabled}
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

        {/* Textarea Container */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-blue-500"
            style={{
              maxHeight: '120px',
              minHeight: '42px',
            }}
          />
        </div>

        {/* Send Button */}
        <IconButton
          onClick={handleSend}
          disabled={!canSend}
          className="h-10 w-10 flex-shrink-0"
          sx={{
            bgcolor: 'rgb(59 130 246)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgb(37 99 235)',
            },
            '&:disabled': {
              bgcolor: 'rgb(203 213 225)',
              color: 'rgb(148 163 184)',
            },
          }}
        >
          <Send size={18} />
        </IconButton>
      </div>

    </div>
  );
};
