import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, CircularProgress, Typography } from '@mui/material';
import { MessageCircleWarning, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  FeedbackAttachment,
  FeedbackTicket,
  getFeedbackEvidenceBlob,
  listMyFeedback,
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

export const FeedbackPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [feedback, setFeedback] = useState<FeedbackTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            const firstMessage = ticket.messages[0];
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
                    {firstMessage?.content && (
                      <Typography
                        variant="body2"
                        className="mt-1 line-clamp-2 whitespace-pre-wrap text-gray-600 dark:text-slate-300"
                      >
                        {firstMessage.content}
                      </Typography>
                    )}
                    <EvidencePreviewGrid attachments={attachments} />
                  </div>
                  <div className="shrink-0 text-sm text-gray-500 dark:text-slate-400">
                    {formatDate(ticket.createdAt, i18n.language)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
