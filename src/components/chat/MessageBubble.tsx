/**
 * MessageBubble Component
 * Displays a single chat message with markdown support
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Brain,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  File as FileIcon,
  X,
  UserPlus,
  Flag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../../types';
import { AvatarMedia } from './AvatarMedia';
import { parseAgentResponse } from '../../utils/agentResponse';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { getChatAttachmentBlob, isAuthenticatedChatAttachmentUrl } from '../../services/api';

interface MessageBubbleProps {
  message: ChatMessage;
  agentName?: string;
  agentAvatar?: string;
  agentAvatarType?: 'image' | 'video';
  userAvatar?: string;
  userAvatarType?: 'image' | 'video';
  onReport?: (message: ChatMessage) => void;
}

type MessageAttachment = NonNullable<ChatMessage['attachments']>[number];

const STREAM_PROGRESS_PREFIX = '[progress]';

function splitProgressFromReasoning(reasoning: string | null): {
  progressMessages: string[];
  reasoning: string | null;
} {
  if (!reasoning) {
    return { progressMessages: [], reasoning: null };
  }

  const progressMessages: string[] = [];
  const reasoningLines: string[] = [];

  for (const line of reasoning.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith(STREAM_PROGRESS_PREFIX)) {
      const progress = trimmed.slice(STREAM_PROGRESS_PREFIX.length).trim();
      if (progress) {
        progressMessages.push(progress);
      }
      continue;
    }

    reasoningLines.push(line);
  }

  const cleanedReasoning = reasoningLines.join('\n').trim();
  return {
    progressMessages,
    reasoning: cleanedReasoning || null,
  };
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  agentAvatar,
  agentAvatarType,
  userAvatar,
  userAvatarType,
  onReport,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [attachmentObjectUrls, setAttachmentObjectUrls] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    fileName: string;
  } | null>(null);
  const parsedContent = parseAgentResponse(message.content);
  const parsedReasoning = message.reasoning ? parseAgentResponse(message.reasoning) : null;
  const explicitReasoning =
    parsedReasoning?.reasoning?.trim() || parsedReasoning?.content.trim() || null;
  const parsedMessage = isUser
    ? { content: message.content, reasoning: null }
    : {
        content: parsedContent.content,
        reasoning: [explicitReasoning, parsedContent.reasoning]
          .filter((part): part is string => Boolean(part?.trim()))
          .filter((part, index, parts) => parts.indexOf(part) === index)
          .join('\n\n'),
      };
  const progressAwareReasoning = splitProgressFromReasoning(parsedMessage.reasoning);
  const displayContent = parsedMessage.content;
  const reasoning = progressAwareReasoning.reasoning;
  const latestProgressMessage = !isUser
    ? progressAwareReasoning.progressMessages[progressAwareReasoning.progressMessages.length - 1] ||
      null
    : null;
  const sources = isUser ? [] : message.sources || [];
  const attachments = message.attachments || [];
  const isAnonymousLimitMessage =
    !isUser &&
    (Boolean(message.anonymousLimit) ||
      /^Guest .+ limit reached\.?$/i.test(displayContent.trim()) ||
      displayContent.trim().toLowerCase().includes('guest daily token limit reached'));
  const attachmentLoadKey = useMemo(
    () =>
      attachments
        .map((attachment) => `${attachment.publicId}:${attachment.fileUrl || ''}`)
        .join('|'),
    [attachments]
  );

  useEffect(() => {
    const imageAttachments = attachments.filter(
      (attachment) =>
        attachment.mimeType.startsWith('image/') &&
        isAuthenticatedChatAttachmentUrl(attachment.fileUrl)
    );

    if (imageAttachments.length === 0) {
      setAttachmentObjectUrls({});
      return;
    }

    let cancelled = false;
    const createdObjectUrls: string[] = [];
    setAttachmentObjectUrls({});

    void (async () => {
      const loadedUrls: Record<string, string> = {};
      for (const attachment of imageAttachments) {
        if (!attachment.fileUrl) continue;

        try {
          const blob = await getChatAttachmentBlob(attachment.fileUrl);
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          createdObjectUrls.push(objectUrl);
          loadedUrls[attachment.publicId] = objectUrl;
        } catch {
          // Keep the file tile visible even if preview fetch fails.
        }
      }

      if (!cancelled) {
        setAttachmentObjectUrls(loadedUrls);
      }
    })();

    return () => {
      cancelled = true;
      createdObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentLoadKey]);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent || message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSignUp = () => {
    navigate('/', { state: { authMode: 'signup' } });
  };

  const getDisplayUrl = (attachment: MessageAttachment) => {
    const objectUrl = attachmentObjectUrls[attachment.publicId];
    if (objectUrl) return objectUrl;

    if (
      attachment.mimeType.startsWith('image/') &&
      isAuthenticatedChatAttachmentUrl(attachment.fileUrl)
    ) {
      return undefined;
    }

    return attachment.fileUrl || undefined;
  };

  const openAttachment = async (attachment: MessageAttachment) => {
    const url = getDisplayUrl(attachment);
    if (!url) return;

    if (attachment.mimeType.startsWith('image/')) {
      setSelectedImage({ url, fileName: attachment.fileName });
      return;
    }

    if (!isAuthenticatedChatAttachmentUrl(attachment.fileUrl)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const blob = await getChatAttachmentBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className={`mb-3 flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[70%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${
              isUser
                ? 'bg-blue-500 dark:bg-blue-600'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
            }`}
          >
            {isUser ? (
              <AvatarMedia
                src={userAvatar}
                type={userAvatarType}
                alt="You"
                fallback={<UserIcon size={16} className="text-white" />}
              />
            ) : (
              <AvatarMedia
                src={agentAvatar}
                type={agentAvatarType}
                alt="Agent"
                fallback={<Bot size={16} className="text-white" />}
              />
            )}
          </div>

          {/* Message Content */}
          <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            {/* Message Bubble */}
            <div
              className={`rounded-lg px-3.5 py-2 ${
                isUser
                  ? 'bg-blue-500 text-white dark:bg-blue-600'
                  : 'bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              {reasoning && (
                <div
                  className={
                    displayContent ? 'mb-2 border-b border-gray-100 pb-2 dark:border-slate-700' : ''
                  }
                >
                  <button
                    type="button"
                    onClick={() => setIsReasoningOpen((prev) => !prev)}
                    className="flex w-full items-center gap-1.5 text-left text-xs italic text-gray-400 transition-colors hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {isReasoningOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Brain size={13} />
                    <span>Reasoning</span>
                  </button>
                  {isReasoningOpen && (
                    <div className="mt-2 max-h-64 overflow-auto pr-1">
                      <MarkdownRenderer
                        text={reasoning}
                        className="text-xs italic leading-relaxed text-gray-400 dark:text-slate-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {!displayContent && latestProgressMessage && (
                <div className="text-sm italic leading-relaxed text-gray-500 dark:text-slate-400">
                  {latestProgressMessage}
                </div>
              )}

              {displayContent && (
                <>
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {displayContent}
                    </div>
                  ) : (
                    <MarkdownRenderer
                      text={displayContent}
                      sources={sources}
                      className="text-sm leading-relaxed"
                    />
                  )}
                </>
              )}

              {isAnonymousLimitMessage && (
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={handleSignUp}
                    className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    <UserPlus size={14} />
                    Sign Up Free
                  </button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className={displayContent ? 'mt-3 space-y-2' : 'space-y-2'}>
                  {attachments.map((attachment) => {
                    const isImage = attachment.mimeType.startsWith('image/');
                    const displayUrl = getDisplayUrl(attachment);
                    const content =
                      isImage && displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={attachment.fileName}
                          className="max-h-48 max-w-full rounded-md object-contain transition-opacity hover:opacity-90"
                        />
                      ) : (
                        <div
                          className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${
                            isUser
                              ? 'border-blue-300/60 bg-blue-400/30 text-white'
                              : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                          }`}
                        >
                          <FileIcon size={14} />
                          <span className="max-w-[220px] truncate">{attachment.fileName}</span>
                          <span className={isUser ? 'text-blue-100' : 'text-gray-400'}>
                            {(attachment.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      );

                    return displayUrl ? (
                      <button
                        type="button"
                        key={attachment.publicId}
                        onClick={() => void openAttachment(attachment)}
                        title={
                          isImage ? `Preview ${attachment.fileName}` : `Open ${attachment.fileName}`
                        }
                        className={isImage ? 'block cursor-zoom-in text-left' : 'block text-left'}
                      >
                        {content}
                      </button>
                    ) : (
                      <div key={attachment.publicId}>{content}</div>
                    );
                  })}
                </div>
              )}

              {!isUser && sources.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-2 dark:border-slate-700">
                  <div className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                    Nguồn tham khảo
                  </div>
                  <div className="space-y-1">
                    {sources.map((source) => (
                      <a
                        key={`${source.marker}-${source.url || source.title}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        title={source.title}
                        className={`flex items-start gap-1.5 rounded px-1 py-0.5 text-xs leading-snug transition-colors ${
                          source.url
                            ? 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200'
                            : 'pointer-events-none text-gray-500 dark:text-slate-400'
                        }`}
                      >
                        <span className="mt-px flex-shrink-0 font-medium">{source.marker}</span>
                        <span className="min-w-0 flex-1 break-words">{source.title}</span>
                        {source.url && <ExternalLink size={12} className="mt-0.5 flex-shrink-0" />}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamp + Copy */}
            <div
              className={`mt-1 flex items-center gap-1.5 px-1 text-xs text-gray-500 dark:text-slate-500 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <span>
                {formatTime(message.timestamp)}
                {message.status === 'sending' && <span className="ml-1 italic"> • Sending...</span>}
                {message.status === 'failed' && (
                  <span className="ml-1 text-red-500"> • Failed</span>
                )}
              </span>
              <button
                onClick={handleCopy}
                title="Copy message"
                className="rounded p-0.5 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
              {!isUser && onReport && (
                <button
                  onClick={() => onReport(message)}
                  title={t('feedback.chat.reportResponse')}
                  className="rounded p-0.5 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                >
                  <Flag size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              title="Close preview"
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X size={18} />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.fileName}
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
