/**
 * ChatSessionsList Component
 * Left sidebar showing list of chat sessions
 */

import React, { useState } from 'react';
import { Plus, MessageSquare, MoreVertical, Share2, Pencil, Archive, Trash2 } from 'lucide-react';
import {
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
} from '@mui/material';
import { ChatSession } from '../../types';

interface ChatSessionsListProps {
  sessions: ChatSession[];
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  onShare?: (sessionId: string) => void;
  onRename?: (sessionId: string, newTitle: string) => void;
  onArchive?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  embedded?: boolean;
  isLoading?: boolean;
}

export const ChatSessionsList: React.FC<ChatSessionsListProps> = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  onShare,
  onRename,
  onArchive,
  onDelete,
  embedded = false,
  isLoading = false,
}) => {
  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSessionId, setMenuSessionId] = useState<string | null>(null);

  // Stable session ID kept alive across dialogs (set once when action is triggered)
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Format last message time
  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    }
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    }
    if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>, sessionId: string) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuSessionId(sessionId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuSessionId(null);
  };

  // Share
  const handleShare = () => {
    if (menuSessionId) onShare?.(menuSessionId);
    handleMenuClose();
  };

  // Rename
  const handleRenameOpen = () => {
    const id = menuSessionId;
    const session = sessions.find((s) => s.id === id);
    setTargetSessionId(id);
    setRenameValue(session?.title ?? '');
    setRenameDialogOpen(true);
    handleMenuClose();
  };

  const handleRenameConfirm = () => {
    if (renameValue.trim() && targetSessionId) {
      onRename?.(targetSessionId, renameValue.trim());
    }
    setRenameDialogOpen(false);
    setTargetSessionId(null);
  };

  const handleRenameCancel = () => {
    setRenameDialogOpen(false);
    setTargetSessionId(null);
  };

  // Archive
  const handleArchive = () => {
    if (menuSessionId) onArchive?.(menuSessionId);
    handleMenuClose();
  };

  // Delete
  const handleDeleteOpen = () => {
    setTargetSessionId(menuSessionId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (targetSessionId) onDelete?.(targetSessionId);
    setDeleteDialogOpen(false);
    setTargetSessionId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTargetSessionId(null);
  };

  return (
    <div
      className={`flex flex-col ${
        embedded
          ? 'h-full w-full bg-transparent'
          : 'h-full w-64 border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      {/* Header */}
      {!embedded && (
        <div className="border-b border-gray-200 p-4 dark:border-slate-700">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">
            Chat Sessions
          </h2>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Plus size={18} />}
            onClick={onNewChat}
            className="bg-[#3B82F6] text-white hover:bg-[#2563EB]"
          >
            New Chat
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center px-4 py-6">
            <CircularProgress size={18} />
          </div>
        ) : sessions.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center text-center ${
              embedded ? 'px-4 py-6' : 'p-8'
            }`}
          >
            <MessageSquare
              size={embedded ? 32 : 48}
              className="mb-3 text-gray-300 dark:text-slate-600"
            />
            <p className="text-sm text-gray-500 dark:text-slate-400">No chat sessions yet</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Start a new chat to begin
            </p>
          </div>
        ) : (
          <div className={embedded ? 'pb-2' : 'py-2'}>
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative flex w-full items-center border-l-4 transition-colors ${
                  activeSessionId === session.id
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-slate-700/70'
                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                {/* Clickable session area */}
                <button
                  onClick={() => onSessionSelect(session.id)}
                  className={`min-w-0 flex-1 text-left ${embedded ? 'px-5 py-2.5' : 'px-4 py-3'}`}
                >
                  {/* Session Title */}
                  <div className="mb-1 truncate pr-6 font-medium text-gray-900 dark:text-slate-100">
                    {session.title}
                  </div>

                  {/* Last Message Preview */}
                  {session.lastMessage && (
                    <div className="mb-1 truncate text-sm text-gray-600 dark:text-slate-400">
                      {session.lastMessage}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 dark:text-slate-500">
                    {formatTime(session.lastMessageAt)}
                  </div>
                </button>

                {/* Options button — always visible on active, hover-visible otherwise */}
                <button
                  onClick={(e) => handleMenuOpen(e, session.id)}
                  aria-label="Session options"
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-opacity hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-slate-600 dark:hover:text-slate-200 ${
                    activeSessionId === session.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            },
          },
        }}
      >
        <MenuItem onClick={handleShare} dense>
          <ListItemIcon>
            <Share2 size={16} />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleRenameOpen} dense>
          <ListItemIcon>
            <Pencil size={16} />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleArchive} dense>
          <ListItemIcon>
            <Archive size={16} />
          </ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleDeleteOpen} dense sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <Trash2 size={16} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={handleRenameCancel}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Rename Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Chat name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameConfirm();
              if (e.key === 'Escape') handleRenameCancel();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRenameCancel} size="small">
            Cancel
          </Button>
          <Button
            onClick={handleRenameConfirm}
            variant="contained"
            size="small"
            disabled={!renameValue.trim()}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Chat?</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            This will permanently delete "
            <span className="font-medium text-gray-900 dark:text-slate-100">
              {sessions.find((s) => s.id === targetSessionId)?.title}
            </span>
            ". This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDeleteCancel} size="small">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" size="small">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
