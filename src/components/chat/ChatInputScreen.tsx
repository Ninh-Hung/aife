/**
 * ChatInputScreen Component
 * Reusable centered chat interface — used on the landing page (unauthenticated)
 * and as the empty/new-chat state after login.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ArrowUp, X, ImageIcon, FileUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ============================================
// Props Interface
// ============================================

export interface ChatInputScreenProps {
  /** Main heading displayed above the input */
  heading?: string;
  /** Textarea placeholder text */
  placeholder?: string;
  /** Called when the user submits a message */
  onSend: (message: string, image?: File) => void;
  /** Optional suggestion chips shown below the input */
  suggestions?: string[];
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
  suggestions,
}) => {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);

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
      handleSend();
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSend(trimmed, selectedImage ?? undefined);
    setInputValue('');
    setSelectedImage(null);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, selectedImage, onSend]);

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
    if (!isLoggedIn) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setUploadError('Only image files are supported (PNG, JPG, GIF, WebP, etc.).');
        return;
      }
      if (file.size > MAX_ANON_FILE_SIZE) {
        setUploadError(`Image must be smaller than 5 MB (selected: ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
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

  const canSend = inputValue.trim().length > 0;

  return (
    <div className="flex w-full flex-col items-center px-4">
      {/* Heading */}
      <h1 className="mb-8 text-center text-3xl font-semibold text-white sm:text-4xl">{heading}</h1>

      {/* Input box */}
      <div className="w-full max-w-2xl">
        <div
          className={`relative rounded-2xl border bg-[#0F1F38] shadow-lg transition-colors ${
            canSend ? 'border-slate-500' : 'border-slate-700'
          } focus-within:border-slate-500`}
        >
          {/* Image preview pill */}
          {selectedImage && (
            <div className="flex items-center gap-1.5 px-4 pt-3">
              <span className="max-w-[200px] truncate rounded-md border border-slate-600 bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                {selectedImage.name}
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-slate-400 transition-colors hover:text-white"
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

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pb-14 pt-4 text-base text-white placeholder-slate-500 focus:outline-none"
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
                    ? 'bg-slate-700/70 text-white'
                    : 'text-slate-400 hover:bg-slate-700/70 hover:text-white'
                }`}
                title="Attach"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute bottom-full left-0 mb-2 w-52 overflow-hidden rounded-xl border border-slate-700 bg-[#0F1F38] shadow-xl"
                >
                  <button
                    type="button"
                    onClick={handleImageUploadClick}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700/60 hover:text-white"
                  >
                    {isLoggedIn ? (
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
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                canSend
                  ? 'bg-teal-500 text-white hover:bg-teal-600'
                  : 'cursor-not-allowed bg-slate-700 text-slate-500'
              }`}
              title="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={isLoggedIn ? '*/*' : 'image/*'}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hint */}
        <p className="mt-2.5 text-center text-xs text-slate-600">
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
              className="rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
