import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Copy, ExternalLink, Link as LinkIcon, RefreshCw, ShieldOff } from 'lucide-react';
import type { ChatShare } from '../../types';
import {
  createChatShare,
  getChatShare,
  refreshChatShare,
  revokeChatShare,
} from '../../services/api';
import { useNotification } from '../../hooks/useNotification';

interface ShareConversationDialogProps {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
}

export const ShareConversationDialog: React.FC<ShareConversationDialogProps> = ({
  open,
  sessionId,
  onClose,
}) => {
  const { success, error: showError } = useNotification();
  const [share, setShare] = useState<ChatShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeShareUrl = useMemo(
    () => (share?.status === 'ACTIVE' ? share.shareUrl || '' : ''),
    [share]
  );

  useEffect(() => {
    if (!open || !sessionId) {
      setShare(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void getChatShare(sessionId)
      .then((response) => {
        if (cancelled) return;
        if (response.success) {
          setShare(response.data || null);
          return;
        }
        showError(response.error || 'Failed to load share');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sessionId, showError]);

  const handleCreate = async () => {
    if (!sessionId) return;

    setIsSaving(true);
    try {
      const response = await createChatShare(sessionId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create share');
      }

      setShare(response.data);
      success('Share link ready');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create share');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (!share) return;

    setIsSaving(true);
    try {
      const response = await refreshChatShare(share.publicId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update shared snapshot');
      }

      setShare(response.data);
      success('Shared snapshot updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update shared snapshot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!share) return;

    setIsSaving(true);
    try {
      const response = await revokeChatShare(share.publicId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to revoke share');
      }

      setShare(response.data);
      success('Share link revoked');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to revoke share');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!activeShareUrl) return;

    try {
      await navigator.clipboard.writeText(activeShareUrl);
      success('Share link copied');
    } catch {
      showError('Failed to copy share link');
    }
  };

  const handleOpen = () => {
    if (activeShareUrl) {
      window.open(activeShareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '10px' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <LinkIcon size={20} />
        Share conversation
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <CircularProgress size={24} />
          </div>
        ) : (
          <Stack spacing={2}>
            <Alert severity="info">
              The link opens a read-only snapshot. Viewers cannot write to your original
              conversation or use your private agent.
            </Alert>

            {share?.status === 'REVOKED' && (
              <Alert severity="warning">This share link has been revoked.</Alert>
            )}

            {activeShareUrl ? (
              <>
                <TextField
                  label="Share link"
                  value={activeShareUrl}
                  fullWidth
                  size="small"
                  InputProps={{ readOnly: true }}
                />
                <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                  Snapshot version {share?.snapshotVersion}; {share?.messageCount ?? 0} messages.
                  {share?.expiresAt
                    ? ` Expires ${new Date(share.expiresAt).toLocaleString()}.`
                    : ''}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                Create a public read-only snapshot for this conversation.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSaving}>
          Close
        </Button>
        {activeShareUrl && (
          <>
            <Button startIcon={<ExternalLink size={16} />} onClick={handleOpen} disabled={isSaving}>
              Open
            </Button>
            <Button
              startIcon={<Copy size={16} />}
              onClick={() => void handleCopy()}
              disabled={isSaving}
            >
              Copy
            </Button>
            <Button
              startIcon={<RefreshCw size={16} />}
              onClick={() => void handleRefresh()}
              disabled={isSaving}
            >
              Refresh
            </Button>
            <Button
              color="error"
              startIcon={<ShieldOff size={16} />}
              onClick={() => void handleRevoke()}
              disabled={isSaving}
            >
              Revoke
            </Button>
          </>
        )}
        {!activeShareUrl && (
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={16} /> : <LinkIcon size={16} />}
            onClick={() => void handleCreate()}
            disabled={isSaving || isLoading}
          >
            Create link
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
