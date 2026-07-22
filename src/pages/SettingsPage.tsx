import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Eye, EyeOff, Languages, LockKeyhole, Save, Trash2, Upload, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '../components/layout/LanguageSwitch';
import { UserMemorySettings } from '../components/settings/UserMemorySettings';
import { useAuth } from '../contexts/AuthContext';
import { changeMyPassword, uploadMyAvatar } from '../services/api';
import { useNotification } from '../hooks/useNotification';

const MAX_AVATAR_SIZE_MB = 5;
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/svg+xml,image/gif,image/webp,image/avif';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAnonymous, updateProfile } = useAuth();
  const { success, error } = useNotification();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const initialFullName = user?.fullName ?? '';
  const initialAvatarUrl = user?.avatar ?? null;
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [visiblePasswordFields, setVisiblePasswordFields] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setAvatarUrl(user?.avatar ?? null);
    setAvatarPreviewUrl(user?.avatar ?? null);
  }, [user?.avatar, user?.fullName]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const displayName = useMemo(
    () => user?.fullName || user?.userName || user?.email || '',
    [user?.email, user?.fullName, user?.userName]
  );
  const avatarLetter = (displayName || user?.email || 'U').charAt(0).toUpperCase();
  const hasChanges =
    fullName.trim() !== (user?.fullName ?? '') || (avatarUrl ?? null) !== (user?.avatar ?? null);
  const canChangePassword =
    Boolean(user) && !isAnonymous && (!user?.authProvider || user.authProvider === 'NORMAL');
  const passwordValidationError = useMemo(() => {
    if (!newPassword) return '';
    if (newPassword.length < 8) return t('settings.password.validation.minLength');
    if (newPassword.length > 128) return t('settings.password.validation.maxLength');
    if (!/\d/.test(newPassword)) return t('settings.password.validation.requiresNumber');
    if (!/[a-zA-Z]/.test(newPassword)) return t('settings.password.validation.requiresLetter');
    if (currentPassword && newPassword === currentPassword) {
      return t('settings.password.validation.sameAsCurrent');
    }
    return '';
  }, [currentPassword, newPassword, t]);
  const confirmPasswordError =
    confirmPassword && newPassword !== confirmPassword
      ? t('settings.password.validation.confirmMismatch')
      : '';
  const canSubmitPassword =
    Boolean(currentPassword && newPassword && confirmPassword) &&
    !passwordValidationError &&
    !confirmPasswordError;

  const clearObjectPreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const handleChooseAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error(t('settings.profile.errors.invalidAvatarType'));
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      error(t('settings.profile.errors.avatarTooLarge', { size: MAX_AVATAR_SIZE_MB }));
      return;
    }

    clearObjectPreview();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setAvatarPreviewUrl(objectUrl);
    setIsUploadingAvatar(true);

    const result = await uploadMyAvatar(file);
    setIsUploadingAvatar(false);

    if (!result.success || !result.data?.url) {
      clearObjectPreview();
      setAvatarPreviewUrl(avatarUrl);
      error(result.error || t('settings.profile.errors.uploadFailed'));
      return;
    }

    clearObjectPreview();
    setAvatarUrl(result.data.url);
    setAvatarPreviewUrl(result.data.url);
    success(t('settings.profile.messages.avatarUploaded'));
  };

  const handleRemoveAvatar = () => {
    clearObjectPreview();
    setAvatarUrl(null);
    setAvatarPreviewUrl(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim() || null,
        avatarUrl,
      });
      success(t('settings.profile.messages.updated'));
    } catch (err) {
      error(err instanceof Error ? err.message : t('settings.profile.errors.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof visiblePasswordFields) => {
    setVisiblePasswordFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const renderPasswordVisibilityButton = (
    field: keyof typeof visiblePasswordFields,
    label: string
  ) => (
    <InputAdornment position="end">
      <Tooltip title={label}>
        <IconButton
          type="button"
          edge="end"
          onClick={() => togglePasswordVisibility(field)}
          aria-label={label}
          disabled={isChangingPassword}
        >
          {visiblePasswordFields[field] ? <EyeOff size={18} /> : <Eye size={18} />}
        </IconButton>
      </Tooltip>
    </InputAdornment>
  );

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmitPassword) {
      error(
        passwordValidationError ||
          confirmPasswordError ||
          t('settings.password.validation.required')
      );
      return;
    }

    setIsChangingPassword(true);
    const result = await changeMyPassword({
      currentPassword,
      newPassword,
    });
    setIsChangingPassword(false);

    if (!result.success) {
      error(result.error || t('settings.password.errors.changeFailed'));
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    success(t('settings.password.messages.changed'));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Box className="mb-6 md:mb-8">
        <Typography
          variant="h4"
          className="font-bold text-gray-900 dark:text-white"
          sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          {t('settings.title')}
        </Typography>
        <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
          {t('settings.subtitle')}
        </Typography>
      </Box>

      <Card
        className="mb-4 max-w-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        elevation={0}
      >
        <Box className="mb-5 flex min-w-0 items-start gap-3">
          <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <UserRound className="text-emerald-600 dark:text-emerald-400" size={20} />
          </Box>
          <Box className="min-w-0">
            <Typography variant="subtitle1" className="font-semibold text-gray-900 dark:text-white">
              {t('settings.profile.title')}
            </Typography>
            <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
              {t('settings.profile.description')}
            </Typography>
          </Box>
        </Box>

        <Box className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Box className="flex shrink-0 flex-col items-center gap-3 sm:w-40">
            <Avatar
              src={avatarPreviewUrl ?? undefined}
              alt={displayName}
              className="bg-gradient-to-br from-indigo-500 to-pink-500"
              sx={{ width: 96, height: 96, fontSize: 36, fontWeight: 700 }}
            >
              {avatarLetter}
            </Avatar>
            <Box className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <Button
                type="button"
                variant="outlined"
                size="small"
                startIcon={<Upload size={16} />}
                onClick={handleChooseAvatar}
                disabled={isUploadingAvatar || isSaving}
              >
                {isUploadingAvatar
                  ? t('settings.profile.actions.uploading')
                  : t('settings.profile.actions.upload')}
              </Button>
              {avatarPreviewUrl && (
                <Tooltip title={t('settings.profile.actions.removeAvatar')}>
                  <span>
                    <IconButton
                      type="button"
                      size="small"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar || isSaving}
                      aria-label={t('settings.profile.actions.removeAvatar')}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>

          <Box className="min-w-0 flex-1">
            <TextField
              fullWidth
              label={t('settings.profile.fields.fullName')}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              inputProps={{ maxLength: 100 }}
              disabled={isSaving}
            />
            <Typography variant="body2" className="mt-2 text-gray-500 dark:text-slate-400">
              {user?.email}
            </Typography>
            <Box className="mt-5 flex justify-end">
              <Button
                type="button"
                variant="contained"
                startIcon={<Save size={16} />}
                onClick={handleSave}
                disabled={!hasChanges || isUploadingAvatar || isSaving}
              >
                {isSaving
                  ? t('settings.profile.actions.saving')
                  : t('settings.profile.actions.save')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>

      {canChangePassword && (
        <Card
          className="mb-4 max-w-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Box className="mb-5 flex min-w-0 items-start gap-3">
            <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <LockKeyhole className="text-amber-600 dark:text-amber-400" size={20} />
            </Box>
            <Box className="min-w-0">
              <Typography
                variant="subtitle1"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {t('settings.password.title')}
              </Typography>
              <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
                {t('settings.password.description')}
              </Typography>
            </Box>
          </Box>

          <Box component="form" onSubmit={handlePasswordSubmit} className="space-y-4">
            <TextField
              fullWidth
              label={t('settings.password.fields.current')}
              type={visiblePasswordFields.current ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={isChangingPassword}
              autoComplete="current-password"
              InputProps={{
                endAdornment: renderPasswordVisibilityButton(
                  'current',
                  visiblePasswordFields.current
                    ? t('settings.password.actions.hideCurrent')
                    : t('settings.password.actions.showCurrent')
                ),
              }}
            />
            <TextField
              fullWidth
              label={t('settings.password.fields.new')}
              type={visiblePasswordFields.next ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isChangingPassword}
              autoComplete="new-password"
              error={Boolean(passwordValidationError)}
              helperText={passwordValidationError || t('settings.password.fields.newHelp')}
              InputProps={{
                endAdornment: renderPasswordVisibilityButton(
                  'next',
                  visiblePasswordFields.next
                    ? t('settings.password.actions.hideNew')
                    : t('settings.password.actions.showNew')
                ),
              }}
            />
            <TextField
              fullWidth
              label={t('settings.password.fields.confirm')}
              type={visiblePasswordFields.confirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isChangingPassword}
              autoComplete="new-password"
              error={Boolean(confirmPasswordError)}
              helperText={confirmPasswordError || ' '}
              InputProps={{
                endAdornment: renderPasswordVisibilityButton(
                  'confirm',
                  visiblePasswordFields.confirm
                    ? t('settings.password.actions.hideConfirm')
                    : t('settings.password.actions.showConfirm')
                ),
              }}
            />
            <Box className="flex justify-end">
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save size={16} />}
                disabled={!canSubmitPassword || isChangingPassword}
              >
                {isChangingPassword
                  ? t('settings.password.actions.saving')
                  : t('settings.password.actions.save')}
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      <Card
        className="mb-4 max-w-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        elevation={0}
      >
        <Box className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Box className="flex min-w-0 items-start gap-3">
            <Box className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Languages className="text-blue-600 dark:text-blue-400" size={20} />
            </Box>
            <Box className="min-w-0">
              <Typography
                variant="subtitle1"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {t('settings.language.title')}
              </Typography>
              <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
                {t('settings.language.description')}
              </Typography>
            </Box>
          </Box>
          <LanguageSwitch />
        </Box>
      </Card>

      <UserMemorySettings />
    </div>
  );
};
