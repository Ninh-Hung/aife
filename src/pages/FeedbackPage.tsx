import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Eye, MessageCircleWarning, Plus, RefreshCw, Send, X } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import {
  FeedbackAttachment,
  FeedbackMessage,
  FeedbackTicket,
  getFeedbackEvidenceBlob,
  getMyFeedback,
  listMyFeedback,
  replyToMyFeedback,
} from '../services/api';

const getStatusClassName = (status: string) => {
  if (status === 'NEW') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  }
  if (status === 'SPAM') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
};

const DEFAULT_LIST_FEEDBACK_ERROR = 'Failed to load feedback';
const DEFAULT_REPLY_FEEDBACK_ERROR = 'Failed to send reply';

const formatDate = (value: string, locale: string) =>
  new Date(value).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const EvidencePreviewGrid: React.FC<{ attachments: FeedbackAttachment[] }> = ({ attachments }) => {
  const { t } = useTranslation();
  const imageAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.mimeType.startsWith('image/')),
    [attachments]
  );
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (imageAttachments.length === 0) {
      setPreviewUrls({});
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    setPreviewUrls({});

    void (async () => {
      const loadedUrls: Record<string, string> = {};

      for (const attachment of imageAttachments) {
        try {
          const blob = await getFeedbackEvidenceBlob(attachment.url);
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          loadedUrls[attachment.filePublicId] = objectUrl;
        } catch {
          // Keep the rest of the ticket visible if a preview cannot be loaded.
        }
      }

      if (!cancelled) {
        setPreviewUrls(loadedUrls);
      }
    })();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageAttachments]);

  if (imageAttachments.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {imageAttachments.map((attachment) => {
        const previewUrl = previewUrls[attachment.filePublicId];

        return (
          <button
            key={attachment.filePublicId}
            type="button"
            disabled={!previewUrl}
            onClick={() => previewUrl && window.open(previewUrl, '_blank', 'noopener,noreferrer')}
            title={attachment.fileName}
            className="group relative aspect-video overflow-hidden rounded-md border border-gray-200 bg-gray-100 text-left dark:border-slate-700 dark:bg-slate-900"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={attachment.fileName}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-500 dark:text-slate-400">
                {t('app.loading')}
              </div>
            )}
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-xs text-white">
              {attachment.fileName}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const senderLabelKey = (senderType: FeedbackMessage['senderType']) => {
  if (senderType === 'ADMIN') return 'feedback.detail.sender.admin';
  if (senderType === 'AGENT') return 'feedback.detail.sender.agent';
  if (senderType === 'SYSTEM') return 'feedback.detail.sender.system';
  return 'feedback.detail.sender.user';
};

const FeedbackDetailDialog: React.FC<{
  ticket: FeedbackTicket | null;
  open: boolean;
  loading: boolean;
  error: string | null;
  replyError: string | null;
  replyContent: string;
  replying: boolean;
  locale: string;
  onClose: () => void;
  onReplyContentChange: (value: string) => void;
  onSubmitReply: () => void;
}> = ({
  ticket,
  open,
  loading,
  error,
  replyError,
  replyContent,
  replying,
  locale,
  onClose,
  onReplyContentChange,
  onSubmitReply,
}) => {
  const { t } = useTranslation();
  const canSubmitReply = Boolean(replyContent.trim()) && !replying && !loading;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="h6" className="truncate font-semibold">
            {ticket?.title || t('feedback.ticket.untitled')}
          </Typography>
          {ticket && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chip label={t(`feedback.types.${ticket.type}`, { defaultValue: ticket.type })} size="small" />
              <Chip
                label={t(`feedback.status.${ticket.status}`, { defaultValue: ticket.status })}
                size="small"
                className={getStatusClassName(ticket.status)}
              />
              {ticket.priority && (
                <Chip
                  label={t(`feedback.priority.${ticket.priority}`, {
                    defaultValue: ticket.priority,
                  })}
                  size="small"
                />
              )}
            </div>
          )}
        </div>
        <IconButton onClick={onClose} size="small" aria-label={t('feedback.actions.close')}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <CircularProgress size={26} />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : ticket ? (
          <div className="space-y-4">
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {t('feedback.detail.updatedAt', {
                date: formatDate(ticket.updatedAt, locale),
              })}
            </div>

            <div className="space-y-3">
              {ticket.messages.map((message) => {
                const isAdmin = message.senderType === 'ADMIN';

                return (
                  <div
                    key={message.id}
                    className={`rounded-lg border p-3 ${
                      isAdmin
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30'
                        : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {t(senderLabelKey(message.senderType))}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {formatDate(message.createdAt, locale)}
                      </span>
                    </div>
                    <Typography
                      variant="body2"
                      className="whitespace-pre-wrap text-gray-700 dark:text-slate-200"
                    >
                      {message.content}
                    </Typography>
                    <EvidencePreviewGrid attachments={message.attachments} />
                  </div>
                );
              })}
            </div>

            <form
              className="space-y-3 border-t border-gray-200 pt-4 dark:border-slate-700"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSubmitReply) onSubmitReply();
              }}
            >
              {replyError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  {replyError}
                </div>
              )}
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={replyContent}
                onChange={(event) => onReplyContentChange(event.target.value)}
                placeholder={t('feedback.detail.replyPlaceholder')}
                disabled={replying}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Send size={16} />}
                  disabled={!canSubmitReply}
                >
                  {replying ? t('feedback.actions.sendingReply') : t('feedback.actions.sendReply')}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export const FeedbackPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [feedback, setFeedback] = useState<FeedbackTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await listMyFeedback();
    if (response.success) {
      setFeedback(response.data || []);
    } else {
      setError(
        response.error && response.error !== DEFAULT_LIST_FEEDBACK_ERROR
          ? response.error
          : t('feedback.errors.loadFailed')
      );
    }
    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    void loadFeedback();

    const handleCreated = () => void loadFeedback();
    window.addEventListener('feedback:created', handleCreated);
    return () => window.removeEventListener('feedback:created', handleCreated);
  }, [loadFeedback]);

  const handleCreateFeedback = () => {
    window.dispatchEvent(
      new CustomEvent('feedback:open', {
        detail: {
          type: 'FEEDBACK',
          targetType: 'APP',
          sourceContext: 'FEEDBACK_PAGE',
        },
      })
    );
  };

  const handleOpenDetail = async (ticket: FeedbackTicket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailError(null);
    setReplyError(null);
    setReplyContent('');

    const response = await getMyFeedback(ticket.publicId);
    if (response.success && response.data) {
      const nextTicket = response.data;
      setSelectedTicket(nextTicket);
      setFeedback((current) =>
        current.map((item) => (item.publicId === nextTicket.publicId ? nextTicket : item))
      );
    } else {
      setDetailError(
        response.error && response.error !== 'Failed to load feedback details'
          ? response.error
          : t('feedback.errors.detailLoadFailed')
      );
    }

    setIsDetailLoading(false);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailError(null);
    setReplyError(null);
    setReplyContent('');
  };

  const handleSubmitReply = async () => {
    if (!selectedTicket) return;

    const content = replyContent.trim();
    if (!content) return;

    setIsReplying(true);
    setReplyError(null);

    const response = await replyToMyFeedback(selectedTicket.publicId, content);
    if (response.success && response.data) {
      const nextTicket = response.data;
      setSelectedTicket(nextTicket);
      setFeedback((current) =>
        current.map((item) => (item.publicId === nextTicket.publicId ? nextTicket : item))
      );
      setReplyContent('');
      setIsDetailOpen(false);
      setDetailError(null);
      setReplyError(null);
      enqueueSnackbar(t('feedback.messages.replySent'), { variant: 'success' });
    } else {
      setReplyError(
        response.error && response.error !== DEFAULT_REPLY_FEEDBACK_ERROR
          ? response.error
          : t('feedback.errors.replyFailed')
      );
    }

    setIsReplying(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Box className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:mb-8">
        <Box>
          <Typography
            variant="h4"
            className="font-bold text-gray-900 dark:text-white"
            sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
          >
            {t('feedback.title')}
          </Typography>
          <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
            {t('feedback.subtitle')}
          </Typography>
        </Box>
        <Box className="flex gap-2">
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={() => void loadFeedback()}
            disabled={isLoading}
          >
            {t('feedback.actions.refresh')}
          </Button>
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={handleCreateFeedback}>
            {t('feedback.actions.create')}
          </Button>
        </Box>
      </Box>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <CircularProgress size={28} />
        </div>
      ) : feedback.length === 0 ? (
        <Card
          className="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <MessageCircleWarning size={26} className="text-blue-600 dark:text-blue-300" />
          </div>
          <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
            {t('feedback.empty.title')}
          </Typography>
          <Typography variant="body2" className="mt-1 max-w-md text-gray-500 dark:text-slate-400">
            {t('feedback.empty.description')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleCreateFeedback}
            className="mt-5"
          >
            {t('feedback.actions.create')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((ticket) => {
            const latestMessage = ticket.messages[ticket.messages.length - 1];
            const attachmentCount = ticket.messages.reduce(
              (total, message) => total + message.attachments.length,
              0
            );
            const attachments = ticket.messages.flatMap((message) => message.attachments);

            return (
              <Card
                key={ticket.publicId}
                className="border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                elevation={0}
              >
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Chip
                        label={t(`feedback.types.${ticket.type}`, { defaultValue: ticket.type })}
                        size="small"
                      />
                      <Chip
                        label={t(`feedback.status.${ticket.status}`, {
                          defaultValue: ticket.status,
                        })}
                        size="small"
                        className={getStatusClassName(ticket.status)}
                      />
                      {ticket.priority && (
                        <Chip
                          label={t(`feedback.priority.${ticket.priority}`, {
                            defaultValue: ticket.priority,
                          })}
                          size="small"
                        />
                      )}
                      {attachmentCount > 0 && (
                        <Chip
                          label={t('feedback.ticket.imageCount', { count: attachmentCount })}
                          size="small"
                        />
                      )}
                    </div>
                    <Typography
                      variant="subtitle1"
                      className="font-semibold text-gray-900 dark:text-white"
                    >
                      {ticket.title || t('feedback.ticket.untitled')}
                    </Typography>
                    {latestMessage?.content && (
                      <Typography
                        variant="body2"
                        className="mt-1 line-clamp-2 whitespace-pre-wrap text-gray-600 dark:text-slate-300"
                      >
                        <span className="font-medium">
                          {t(senderLabelKey(latestMessage.senderType))}
                          {': '}
                        </span>
                        {latestMessage.content}
                      </Typography>
                    )}
                    <EvidencePreviewGrid attachments={attachments} />
                  </div>
                  <div className="shrink-0 text-sm text-gray-500 dark:text-slate-400">
                    <div className="mb-3 text-right">{formatDate(ticket.updatedAt, i18n.language)}</div>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Eye size={16} />}
                      onClick={() => void handleOpenDetail(ticket)}
                    >
                      {t('feedback.actions.viewDetails')}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <FeedbackDetailDialog
        ticket={selectedTicket}
        open={isDetailOpen}
        loading={isDetailLoading}
        error={detailError}
        replyError={replyError}
        replyContent={replyContent}
        replying={isReplying}
        locale={i18n.language}
        onClose={handleCloseDetail}
        onReplyContentChange={(value) => {
          setReplyContent(value);
          if (replyError) setReplyError(null);
        }}
        onSubmitReply={handleSubmitReply}
      />
    </div>
  );
};
