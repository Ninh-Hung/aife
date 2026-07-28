import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EmailDraftApproval } from '../../../types';

type EmailDraftEditorDialogProps = {
  open: boolean;
  draft: EmailDraftApproval | null;
  title: string;
  text: string;
  actionLoading: boolean;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onSave: () => void;
  onReject: () => void;
  onApprove: () => void;
};

export const EmailDraftEditorDialog: React.FC<EmailDraftEditorDialogProps> = ({
  open,
  draft,
  title,
  text,
  actionLoading,
  onClose,
  onTitleChange,
  onTextChange,
  onSave,
  onReject,
  onApprove,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('integrations.email.draftEditor.title')}</DialogTitle>
      <DialogContent>
        <Box className="space-y-4 pt-2">
          <TextField
            label={t('integrations.email.draftEditor.fields.title')}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            fullWidth
          />
          <TextField
            label={t('integrations.email.draftEditor.fields.reply')}
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            fullWidth
            multiline
            minRows={10}
          />
          {draft?.error_message && (
            <Typography variant="body2" className="text-red-600 dark:text-red-300">
              {draft.error_message}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={actionLoading}>
          {t('integrations.email.actions.close')}
        </Button>
        <Button onClick={onSave} disabled={!draft || actionLoading}>
          {t('integrations.email.actions.save')}
        </Button>
        <Button
          color="error"
          onClick={onReject}
          disabled={!draft || draft.status !== 'pending_approval' || actionLoading}
        >
          {t('integrations.email.actions.reject')}
        </Button>
        <Button
          variant="contained"
          startIcon={<Send size={16} />}
          onClick={onApprove}
          disabled={!draft || draft.status !== 'pending_approval' || !text.trim() || actionLoading}
        >
          {t('integrations.email.actions.approveSend')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
