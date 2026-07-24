import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { ImagePlus, X } from 'lucide-react';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { createFeedback, FeedbackTargetType, FeedbackType } from '../../services/api';

export type FeedbackOpenDetail = {
  type?: FeedbackType;
  title?: string;
  targetType?: FeedbackTargetType;
  conversationId?: string;
  messageId?: string;
  agentId?: string;
  reportedMessageSnapshot?: string;
  previousUserMessageSnapshot?: string;
  sourceContext?: string;
};

declare global {
  interface WindowEventMap {
    'feedback:open': CustomEvent<FeedbackOpenDetail>;
  }
}

const MAX_FILES = 3;
const DEFAULT_CREATE_FEEDBACK_ERROR = 'Failed to submit feedback';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FeedbackDialog: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const { isAnonymous } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('FEEDBACK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactEmailError, setContactEmailError] = useState('');
  const [context, setContext] = useState<FeedbackOpenDetail>({});
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleOpen = (event: WindowEventMap['feedback:open']) => {
      const detail = event.detail || {};
      setContext(detail);
      setType(detail.type || 'FEEDBACK');
      setTitle(detail.title || '');
      setDescription('');
      setContactEmail('');
      setContactEmailError('');
      setFiles([]);
      setOpen(true);
    };

    window.addEventListener('feedback:open', handleOpen);
    return () => window.removeEventListener('feedback:open', handleOpen);
  }, [isAnonymous]);

  const fileNames = useMemo(() => files.map((file) => file.name).join(', '), [files]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setFilePreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleClose = () => {
    if (!isSubmitting) {
      setOpen(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, MAX_FILES);
    setFiles(selectedFiles);
    event.target.value = '';
  };

  const getContactEmailValidationError = (email: string) => {
    const normalizedEmail = email.trim();

    if (isAnonymous && !normalizedEmail) {
      return t('feedback.validation.contactEmailRequired');
    }

    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return t('feedback.validation.contactEmailInvalid');
    }

    return '';
  };

  const validateContactEmail = (email: string) => {
    const message = getContactEmailValidationError(email);
    setContactEmailError(message);
    return !message;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      enqueueSnackbar(t('feedback.validation.detailsRequired'), { variant: 'warning' });
      return;
    }

    const normalizedContactEmail = contactEmail.trim();
    const emailError = getContactEmailValidationError(normalizedContactEmail);
    setContactEmailError(emailError);
    if (emailError) {
      enqueueSnackbar(emailError, { variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    const response = await createFeedback({
      ...context,
      type,
      title: title.trim() || undefined,
      description: description.trim(),
      contactEmail: isAnonymous ? normalizedContactEmail : undefined,
      evidenceImages: files,
      targetType: context.targetType || 'APP',
      currentPageUrl: window.location.href,
      browserInfo: navigator.userAgent,
    });
    setIsSubmitting(false);

    if (!response.success) {
      enqueueSnackbar(
        response.error && response.error !== DEFAULT_CREATE_FEEDBACK_ERROR
          ? response.error
          : t('feedback.errors.submitFailed'),
        { variant: 'error' }
      );
      return;
    }

    enqueueSnackbar(t('feedback.messages.submitted'), { variant: 'success' });
    window.dispatchEvent(new CustomEvent('feedback:created'));
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {context.targetType === 'CHAT_MESSAGE'
          ? t('feedback.dialog.reportResponseTitle')
          : t('feedback.dialog.title')}
      </DialogTitle>
      <DialogContent className="space-y-4 pt-3">
        <FormControl fullWidth size="small">
          <InputLabel id="feedback-type-label">{t('feedback.dialog.type')}</InputLabel>
          <Select
            labelId="feedback-type-label"
            label={t('feedback.dialog.type')}
            value={type}
            onChange={(event) => setType(event.target.value as FeedbackType)}
          >
            <MenuItem value="FEEDBACK">{t('feedback.types.FEEDBACK')}</MenuItem>
            <MenuItem value="BUG_REPORT">{t('feedback.types.BUG_REPORT')}</MenuItem>
            <MenuItem value="ABUSE_REPORT">{t('feedback.types.ABUSE_REPORT')}</MenuItem>
            <MenuItem value="OTHER">{t('feedback.types.OTHER')}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          size="small"
          label={t('feedback.dialog.feedbackTitle')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        {isAnonymous && (
          <TextField
            fullWidth
            required
            size="small"
            type="email"
            label={t('feedback.dialog.contactEmail')}
            value={contactEmail}
            error={Boolean(contactEmailError)}
            helperText={contactEmailError || ' '}
            onBlur={(event) => validateContactEmail(event.target.value)}
            onChange={(event) => {
              setContactEmail(event.target.value);
              if (contactEmailError) {
                setContactEmailError('');
              }
            }}
          />
        )}
        <TextField
          fullWidth
          required
          multiline
          minRows={5}
          label={t('feedback.dialog.details')}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        {context.reportedMessageSnapshot && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <div className="mb-1 font-semibold">{t('feedback.dialog.reportedResponse')}</div>
            <div className="line-clamp-4 whitespace-pre-wrap">
              {context.reportedMessageSnapshot}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button component="label" variant="outlined" startIcon={<ImagePlus size={16} />}>
            {t('feedback.actions.addImages')}
            <input hidden accept="image/*" multiple type="file" onChange={handleFileChange} />
          </Button>
          {files.length > 0 && (
            <button
              type="button"
              onClick={() => setFiles([])}
              className="inline-flex min-w-0 items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
            >
              <X size={14} />
              <span className="truncate">{fileNames}</span>
            </button>
          )}
        </div>
        {filePreviewUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filePreviewUrls.map((url, index) => (
              <div
                key={url}
                className="relative aspect-video overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-slate-700 dark:bg-slate-900"
              >
                <img
                  src={url}
                  alt={files[index]?.name || t('feedback.dialog.evidenceAlt', { index: index + 1 })}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-xs text-white">
                  {files[index]?.name || t('feedback.dialog.evidenceAlt', { index: index + 1 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          {t('feedback.actions.cancel')}
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? t('feedback.actions.submitting') : t('feedback.actions.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
