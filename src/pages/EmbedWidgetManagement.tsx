import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  ClickAwayListener,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Bot,
  CheckCircle2,
  Code2,
  Copy,
  Eye,
  Globe2,
  Hash,
  Info,
  Link2,
  MapPin,
  MessageCircle,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import {
  createEmbedWidget,
  listChatSessions,
  listEmbedWidgets,
  rotateEmbedWidgetKey,
  updateEmbedWidget,
  uploadAgentAvatar,
} from '../services/api';
import { getThirdPartyUsage } from '../services/third-party-usage.service';
import type {
  ChatSession,
  CreateEmbedWidgetResponse,
  EmbedWidget,
  ThirdPartyUsageRow,
} from '../types';

type FormState = {
  name: string;
  agentPublicId: string;
  allowedOrigins: string;
  widgetPosition: string;
  primaryColor: string;
  accentColor: string;
  launcherIconUrl: string | null;
  greeting: string;
  placeholder: string;
  autoOpen: boolean;
  soundEnabled: boolean;
  maxMessagesPerSession: number;
  maxSessionsPerDay: number;
};

const DEFAULT_PRIMARY_COLOR = '#2563eb';
const DEFAULT_ACCENT_COLOR = '#1d4ed8';

const buildDefaultForm = (placeholder: string): FormState => ({
  name: '',
  agentPublicId: '',
  allowedOrigins: '',
  widgetPosition: 'bottom-right',
  primaryColor: DEFAULT_PRIMARY_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  launcherIconUrl: null,
  greeting: '',
  placeholder,
  autoOpen: false,
  soundEnabled: true,
  maxMessagesPerSession: 50,
  maxSessionsPerDay: 100,
});

const widgetPositionOptions = [
  { value: 'bottom-right', labelKey: 'embedWidgets.positions.bottomRight' },
  { value: 'bottom-left', labelKey: 'embedWidgets.positions.bottomLeft' },
  { value: 'top-right', labelKey: 'embedWidgets.positions.topRight' },
  { value: 'top-left', labelKey: 'embedWidgets.positions.topLeft' },
];

const getFormFromWidget = (widget: EmbedWidget): FormState => ({
  name: widget.name,
  agentPublicId: widget.agent?.public_id || '',
  allowedOrigins: widget.allowed_origins.join('\n'),
  widgetPosition: widget.theme.position,
  primaryColor: widget.theme.primary_color,
  accentColor: widget.theme.accent_color,
  launcherIconUrl: widget.theme.launcher_icon_url ?? null,
  greeting: widget.behavior.greeting || '',
  placeholder: widget.behavior.placeholder,
  autoOpen: widget.behavior.auto_open,
  soundEnabled: widget.behavior.sound_enabled,
  maxMessagesPerSession: widget.limits.max_messages_per_session,
  maxSessionsPerDay: widget.limits.max_sessions_per_day,
});

const isValidHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value.trim());

const getPickerColorValue = (value: string, fallback: string) =>
  isValidHexColor(value) ? value : fallback;

const formatConversationDate = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);

export const EmbedWidgetManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notification = useNotification();
  const { agents } = useAgents();
  const getDefaultForm = () => buildDefaultForm(t('embedWidgets.defaults.placeholder'));
  const [widgets, setWidgets] = useState<EmbedWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => getDefaultForm());
  const [editingWidget, setEditingWidget] = useState<EmbedWidget | null>(null);
  const [previewWidget, setPreviewWidget] = useState<EmbedWidget | null>(null);
  const [oneTimeKey, setOneTimeKey] = useState<CreateEmbedWidgetResponse | null>(null);
  const [iconUploading, setIconUploading] = useState(false);
  const [conversationWidget, setConversationWidget] = useState<EmbedWidget | null>(null);
  const [conversationOrigin, setConversationOrigin] = useState('');
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [widgetUsageRows, setWidgetUsageRows] = useState<ThirdPartyUsageRow[]>([]);

  const publishedAgents = useMemo(
    () =>
      agents.filter(
        (agent) =>
          agent.status === 'published' &&
          agent.isActive !== false &&
          (!agent.ownerType || agent.ownerType === 'USER')
      ),
    [agents]
  );

  const widgetUsageTotal = useMemo(() => {
    const sessionTotals = conversations.reduce(
      (total, session) => ({
        messages: total.messages + (session.messageCount || 0),
        tokens: total.tokens + (session.tokenCount || 0),
      }),
      { messages: 0, tokens: 0 }
    );
    const credits = widgetUsageRows.reduce((total, row) => total + row.cost_credits, 0);

    return { ...sessionTotals, credits };
  }, [conversations, widgetUsageRows]);

  useEffect(() => {
    void loadWidgets();
  }, []);

  useEffect(() => {
    if (!form.agentPublicId && publishedAgents[0]?.publicId) {
      setForm((current) => ({ ...current, agentPublicId: publishedAgents[0].publicId }));
    }
  }, [form.agentPublicId, publishedAgents]);

  const loadWidgets = async () => {
    setLoading(true);
    try {
      const response = await listEmbedWidgets();
      if (response.success && response.data) {
        setWidgets(response.data);
      } else {
        notification.error(response.error || t('embedWidgets.errors.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingWidget(null);
    setForm({
      ...getDefaultForm(),
      agentPublicId: publishedAgents[0]?.publicId || '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (widget: EmbedWidget) => {
    setEditingWidget(widget);
    setForm(getFormFromWidget(widget));
    setDialogOpen(true);
  };

  const closeFormDialog = () => {
    setDialogOpen(false);
    setEditingWidget(null);
    setForm(getDefaultForm());
  };

  const handleSave = async () => {
    const origins = form.allowedOrigins
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if ((!editingWidget && !form.agentPublicId) || origins.length === 0) {
      notification.error(t('embedWidgets.validation.agentAndOrigin'));
      return;
    }

    if (!isValidHexColor(form.primaryColor) || !isValidHexColor(form.accentColor)) {
      notification.error(t('embedWidgets.validation.colorHex'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name || undefined,
        agent_public_id: form.agentPublicId,
        allowed_origins: origins,
        widget_position: form.widgetPosition,
        primary_color: form.primaryColor,
        accent_color: form.accentColor,
        launcher_icon_url: form.launcherIconUrl,
        custom_welcome_message: form.greeting || undefined,
        custom_placeholder: form.placeholder || undefined,
        auto_open: form.autoOpen,
        sound_enabled: form.soundEnabled,
        max_messages_per_session: form.maxMessagesPerSession,
        max_sessions_per_day: form.maxSessionsPerDay,
      };
      const response = editingWidget
        ? await updateEmbedWidget(editingWidget.public_id, payload)
        : await createEmbedWidget(payload);

      if (response.success && response.data) {
        closeFormDialog();
        if ('widget_key' in response.data) {
          setOneTimeKey(response.data);
        }
        await loadWidgets();
      } else {
        notification.error(response.error || t('embedWidgets.errors.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (file: File | null) => {
    if (!file) return;

    setIconUploading(true);
    try {
      const response = await uploadAgentAvatar(file);
      if (response.success && response.data?.url) {
        setForm((current) => ({ ...current, launcherIconUrl: response.data!.url }));
      } else {
        notification.error(response.error || t('embedWidgets.modal.fields.icon.uploadFailed'));
      }
    } finally {
      setIconUploading(false);
    }
  };

  const handleRotate = async (widget: EmbedWidget) => {
    const response = await rotateEmbedWidgetKey(widget.public_id);
    if (response.success && response.data) {
      setOneTimeKey(response.data);
      await loadWidgets();
    } else {
      notification.error(response.error || t('embedWidgets.errors.rotateFailed'));
    }
  };

  const handleStatus = async (widget: EmbedWidget, status: 'active' | 'disabled') => {
    const response = await updateEmbedWidget(widget.public_id, { status });
    if (response.success && response.data) {
      setWidgets((current) =>
        current.map((item) => (item.public_id === widget.public_id ? response.data! : item))
      );
    } else {
      notification.error(response.error || t('embedWidgets.errors.updateFailed'));
    }
  };

  const loadWidgetConversations = async (widget: EmbedWidget, origin: string) => {
    setConversationsLoading(true);
    try {
      const [conversationResponse, usageResponse] = await Promise.all([
        listChatSessions(undefined, {
          entrypoint: 'public_embed',
          client_id: widget.public_id,
          external_tenant_id: origin || undefined,
        }),
        getThirdPartyUsage({
          groupBy: 'external_tenant',
          clientId: widget.public_id,
          externalTenantId: origin || undefined,
        }).catch(() => null),
      ]);

      if (conversationResponse.success && conversationResponse.data) {
        setConversations(conversationResponse.data);
      } else {
        setConversations([]);
        notification.error(
          conversationResponse.error || t('embedWidgets.errors.conversationsLoadFailed')
        );
      }
      setWidgetUsageRows(usageResponse?.data ?? []);
    } finally {
      setConversationsLoading(false);
    }
  };

  const openConversationsDialog = (widget: EmbedWidget) => {
    setConversationWidget(widget);
    setConversationOrigin('');
    setConversations([]);
    setWidgetUsageRows([]);
    void loadWidgetConversations(widget, '');
  };

  const closeConversationsDialog = () => {
    setConversationWidget(null);
    setConversationOrigin('');
    setConversations([]);
    setWidgetUsageRows([]);
  };

  const handleConversationOriginChange = (origin: string) => {
    setConversationOrigin(origin);
    if (conversationWidget) {
      void loadWidgetConversations(conversationWidget, origin);
    }
  };

  const openConversation = (sessionId: string) => {
    closeConversationsDialog();
    navigate(`/chat/${sessionId}`);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notification.success(t('embedWidgets.messages.copied'));
    } catch {
      notification.error(t('embedWidgets.errors.copyFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-4 md:p-6 lg:p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 md:text-3xl">
            {t('embedWidgets.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            {t('embedWidgets.subtitle')}
          </p>
        </div>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreateDialog}>
          {t('embedWidgets.create')}
        </Button>
      </div>

      <div className="space-y-3">
        {widgets.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
            <Code2 className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-slate-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-slate-100">
              {t('embedWidgets.empty.title')}
            </h3>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={openCreateDialog}>
              {t('embedWidgets.create')}
            </Button>
          </div>
        ) : (
          widgets.map((widget) => (
            <div
              key={widget.public_id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {widget.name}
                    </h3>
                    <Chip
                      size="small"
                      label={t(`embedWidgets.status.${widget.status}`, {
                        defaultValue: widget.status,
                      })}
                      color={widget.status === 'active' ? 'success' : 'default'}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {widget.agent?.name || t('embedWidgets.card.unknownAgent')} ·{' '}
                    {widget.key_prefix || t('embedWidgets.card.noKey')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {widget.allowed_origins.map((origin) => (
                      <Chip key={origin} size="small" icon={<Globe2 size={14} />} label={origin} />
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Tooltip title={t('embedWidgets.actions.preview')}>
                    <IconButton onClick={() => setPreviewWidget(widget)}>
                      <Eye size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('embedWidgets.actions.conversations')}>
                    <IconButton onClick={() => openConversationsDialog(widget)}>
                      <MessageCircle size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('embedWidgets.actions.edit')}>
                    <IconButton onClick={() => openEditDialog(widget)}>
                      <Pencil size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('embedWidgets.actions.rotate')}>
                    <IconButton onClick={() => void handleRotate(widget)}>
                      <RefreshCw size={18} />
                    </IconButton>
                  </Tooltip>
                  {widget.status === 'active' ? (
                    <Tooltip title={t('embedWidgets.actions.disable')}>
                      <IconButton onClick={() => void handleStatus(widget, 'disabled')}>
                        <XCircle size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title={t('embedWidgets.actions.enable')}>
                      <IconButton onClick={() => void handleStatus(widget, 'active')}>
                        <ShieldCheck size={18} />
                      </IconButton>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onClose={closeFormDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingWidget ? t('embedWidgets.modal.editTitle') : t('embedWidgets.modal.createTitle')}
        </DialogTitle>
        <DialogContent className="space-y-4 pt-3">
          <FieldBlock
            icon={Hash}
            title={t('embedWidgets.modal.fields.name.title')}
            description={t('embedWidgets.modal.fields.name.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.name.title'),
            })}
          >
            <TextField
              fullWidth
              label={t('embedWidgets.modal.fields.name.label')}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </FieldBlock>
          <FieldBlock
            icon={Bot}
            title={t('embedWidgets.modal.fields.agent.title')}
            description={t('embedWidgets.modal.fields.agent.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.agent.title'),
            })}
          >
            <TextField
              select
              fullWidth
              label={t('embedWidgets.modal.fields.agent.label')}
              value={form.agentPublicId}
              onChange={(event) => setForm({ ...form, agentPublicId: event.target.value })}
            >
              {publishedAgents.map((agent) => (
                <MenuItem key={agent.publicId} value={agent.publicId}>
                  {agent.name}
                </MenuItem>
              ))}
            </TextField>
          </FieldBlock>
          <FieldBlock
            icon={MapPin}
            title={t('embedWidgets.modal.fields.position.title')}
            description={t('embedWidgets.modal.fields.position.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.position.title'),
            })}
          >
            <TextField
              select
              fullWidth
              label={t('embedWidgets.modal.fields.position.label')}
              value={form.widgetPosition}
              onChange={(event) => setForm({ ...form, widgetPosition: event.target.value })}
            >
              {widgetPositionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </MenuItem>
              ))}
            </TextField>
          </FieldBlock>
          <FieldBlock
            icon={Bot}
            title={t('embedWidgets.modal.fields.icon.title')}
            description={t('embedWidgets.modal.fields.icon.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.icon.title'),
            })}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-md"
                style={{
                  backgroundColor: getPickerColorValue(form.primaryColor, DEFAULT_PRIMARY_COLOR),
                }}
              >
                <LauncherIcon iconUrl={form.launcherIconUrl} />
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={iconUploading ? <CircularProgress size={14} /> : <Upload size={16} />}
                  disabled={iconUploading}
                >
                  {iconUploading
                    ? t('embedWidgets.modal.fields.icon.uploading')
                    : t('embedWidgets.modal.fields.icon.upload')}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/gif,image/webp,image/avif"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = '';
                      void handleIconUpload(file);
                    }}
                  />
                </Button>
                <Button
                  variant={form.launcherIconUrl ? 'outlined' : 'contained'}
                  size="small"
                  startIcon={<Bot size={16} />}
                  onClick={() => setForm({ ...form, launcherIconUrl: null })}
                >
                  {t('embedWidgets.modal.fields.icon.default')}
                </Button>
              </div>
            </div>
          </FieldBlock>
          <FieldBlock
            icon={Link2}
            title={t('embedWidgets.modal.fields.allowedOrigins.title')}
            description={t('embedWidgets.modal.fields.allowedOrigins.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.allowedOrigins.title'),
            })}
          >
            <TextField
              fullWidth
              multiline
              minRows={3}
              label={t('embedWidgets.modal.fields.allowedOrigins.label')}
              placeholder={t('embedWidgets.modal.fields.allowedOrigins.placeholder')}
              value={form.allowedOrigins}
              onChange={(event) => setForm({ ...form, allowedOrigins: event.target.value })}
            />
          </FieldBlock>
          <FieldBlock
            icon={MessageCircle}
            title={t('embedWidgets.modal.fields.greeting.title')}
            description={t('embedWidgets.modal.fields.greeting.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.greeting.title'),
            })}
          >
            <TextField
              fullWidth
              label={t('embedWidgets.modal.fields.greeting.label')}
              value={form.greeting}
              onChange={(event) => setForm({ ...form, greeting: event.target.value })}
            />
          </FieldBlock>
          <FieldBlock
            icon={Palette}
            title={t('embedWidgets.modal.fields.primaryColor.title')}
            description={t('embedWidgets.modal.fields.primaryColor.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.primaryColor.title'),
            })}
          >
            <ColorControl
              textLabel={t('embedWidgets.modal.color.hexInput')}
              separatorLabel={t('embedWidgets.modal.color.or')}
              pickerLabel={t('embedWidgets.modal.color.picker')}
              value={form.primaryColor}
              fallback={DEFAULT_PRIMARY_COLOR}
              onChange={(value) => setForm({ ...form, primaryColor: value })}
            />
          </FieldBlock>
          <FieldBlock
            icon={Sparkles}
            title={t('embedWidgets.modal.fields.accentColor.title')}
            description={t('embedWidgets.modal.fields.accentColor.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.accentColor.title'),
            })}
          >
            <ColorControl
              textLabel={t('embedWidgets.modal.color.hexInput')}
              separatorLabel={t('embedWidgets.modal.color.or')}
              pickerLabel={t('embedWidgets.modal.color.picker')}
              value={form.accentColor}
              fallback={DEFAULT_ACCENT_COLOR}
              onChange={(value) => setForm({ ...form, accentColor: value })}
            />
          </FieldBlock>
          <FieldBlock
            icon={MessageCircle}
            title={t('embedWidgets.modal.fields.placeholder.title')}
            description={t('embedWidgets.modal.fields.placeholder.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.placeholder.title'),
            })}
          >
            <TextField
              fullWidth
              label={t('embedWidgets.modal.fields.placeholder.label')}
              value={form.placeholder}
              onChange={(event) => setForm({ ...form, placeholder: event.target.value })}
            />
          </FieldBlock>
          <div className="grid gap-3 md:grid-cols-2">
            <FieldBlock
              icon={CheckCircle2}
              title={t('embedWidgets.modal.fields.autoOpen.title')}
              description={t('embedWidgets.modal.fields.autoOpen.help')}
              helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
                field: t('embedWidgets.modal.fields.autoOpen.title'),
              })}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={form.autoOpen}
                    onChange={(event) => setForm({ ...form, autoOpen: event.target.checked })}
                  />
                }
                label={t('embedWidgets.modal.fields.autoOpen.label')}
              />
            </FieldBlock>
            <FieldBlock
              icon={Volume2}
              title={t('embedWidgets.modal.fields.sound.title')}
              description={t('embedWidgets.modal.fields.sound.help')}
              helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
                field: t('embedWidgets.modal.fields.sound.title'),
              })}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={form.soundEnabled}
                    onChange={(event) => setForm({ ...form, soundEnabled: event.target.checked })}
                  />
                }
                label={t('embedWidgets.modal.fields.sound.label')}
              />
            </FieldBlock>
          </div>
          <FieldBlock
            icon={SlidersHorizontal}
            title={t('embedWidgets.modal.fields.limits.title')}
            description={t('embedWidgets.modal.fields.limits.help')}
            helpAriaLabel={t('embedWidgets.modal.helpAriaLabel', {
              field: t('embedWidgets.modal.fields.limits.title'),
            })}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                type="number"
                label={t('embedWidgets.modal.fields.limits.messagesPerSession')}
                value={form.maxMessagesPerSession}
                onChange={(event) =>
                  setForm({ ...form, maxMessagesPerSession: Number(event.target.value) })
                }
              />
              <TextField
                type="number"
                label={t('embedWidgets.modal.fields.limits.sessionsPerDay')}
                value={form.maxSessionsPerDay}
                onChange={(event) =>
                  setForm({ ...form, maxSessionsPerDay: Number(event.target.value) })
                }
              />
            </div>
          </FieldBlock>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFormDialog}>{t('embedWidgets.modal.cancel')}</Button>
          <Button variant="contained" disabled={saving} onClick={() => void handleSave()}>
            {saving
              ? t('embedWidgets.modal.saving')
              : editingWidget
                ? t('embedWidgets.modal.save')
                : t('embedWidgets.modal.create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewWidget)}
        onClose={() => setPreviewWidget(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('embedWidgets.preview.title')}</DialogTitle>
        <DialogContent>{previewWidget && <WidgetPreview widget={previewWidget} />}</DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPreviewWidget(null)}>
            {t('embedWidgets.preview.done')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(conversationWidget)}
        onClose={closeConversationsDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('embedWidgets.conversations.title')}</DialogTitle>
        <DialogContent>
          {conversationWidget && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                  {conversationWidget.name}
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                  {conversationWidget.public_id} · {conversationWidget.agent?.name}
                </p>
              </div>

              <TextField
                select
                fullWidth
                size="small"
                label={t('embedWidgets.conversations.originFilter')}
                value={conversationOrigin}
                onChange={(event) => handleConversationOriginChange(event.target.value)}
              >
                <MenuItem value="">{t('embedWidgets.conversations.allOrigins')}</MenuItem>
                {conversationWidget.allowed_origins.map((origin) => (
                  <MenuItem key={origin} value={origin}>
                    {origin}
                  </MenuItem>
                ))}
              </TextField>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <WidgetMetric
                  label={t('embedWidgets.conversations.metricConversations')}
                  value={formatNumber(conversations.length)}
                />
                <WidgetMetric
                  label={t('embedWidgets.conversations.metricMessages')}
                  value={formatNumber(widgetUsageTotal.messages)}
                />
                <WidgetMetric
                  label={t('embedWidgets.conversations.metricTokens')}
                  value={formatNumber(widgetUsageTotal.tokens)}
                />
                <WidgetMetric
                  label={t('embedWidgets.conversations.metricCredits')}
                  value={formatNumber(widgetUsageTotal.credits)}
                />
              </div>

              {conversationsLoading ? (
                <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                  <CircularProgress size={24} />
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600 dark:border-slate-700 dark:text-slate-400">
                  {t('embedWidgets.conversations.empty')}
                </div>
              ) : (
                <div className="max-h-[420px] space-y-2 overflow-auto">
                  {conversations.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">
                            {session.title || t('embedWidgets.conversations.untitled')}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                            {session.externalTenantId ||
                              t('embedWidgets.conversations.unknownOrigin')}
                            {' · '}
                            {formatConversationDate(session.lastMessageAt || session.createdAt)}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-500">
                            {session.externalUserId ||
                              t('embedWidgets.conversations.unknownVisitor')}
                            {' · '}
                            {session.externalSessionId || session.id}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Chip
                            size="small"
                            label={t('embedWidgets.conversations.messages', {
                              count: formatNumber(session.messageCount || 0),
                            })}
                          />
                          <Chip
                            size="small"
                            label={t('embedWidgets.conversations.tokens', {
                              count: formatNumber(session.tokenCount || 0),
                            })}
                          />
                          <Tooltip title={t('embedWidgets.conversations.open')}>
                            <IconButton onClick={() => openConversation(session.id)}>
                              <Link2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeConversationsDialog}>
            {t('embedWidgets.preview.done')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(oneTimeKey)}
        onClose={() => setOneTimeKey(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('embedWidgets.oneTime.title')}</DialogTitle>
        <DialogContent>
          <p className="mb-3 text-sm text-gray-600 dark:text-slate-400">
            {t('embedWidgets.oneTime.warning')}
          </p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-sm text-white">
            {oneTimeKey?.embed_snippet}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => oneTimeKey && void copyText(oneTimeKey.embed_snippet)}
            startIcon={<Copy size={16} />}
          >
            {t('embedWidgets.oneTime.copy')}
          </Button>
          <Button variant="contained" onClick={() => setOneTimeKey(null)}>
            {t('embedWidgets.oneTime.done')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const WidgetMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{value}</p>
  </div>
);

const FieldBlock: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  helpAriaLabel: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, description, helpAriaLabel, children }) => (
  <div className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
    <div className="mb-3 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
        <Icon size={18} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
        <FieldHelpTooltip title={description} ariaLabel={helpAriaLabel} />
      </div>
    </div>
    {children}
  </div>
);

const FieldHelpTooltip: React.FC<{ title: string; ariaLabel: string }> = ({ title, ariaLabel }) => {
  const [open, setOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Tooltip
        arrow
        open={open}
        title={<span className="text-xs leading-5">{title}</span>}
        onClose={() => setOpen(false)}
        disableFocusListener
        disableHoverListener
        disableTouchListener
      >
        <IconButton
          size="small"
          aria-label={ariaLabel}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
          }}
          className="text-gray-500 dark:text-slate-400"
        >
          <Info size={16} />
        </IconButton>
      </Tooltip>
    </ClickAwayListener>
  );
};

const ColorControl: React.FC<{
  textLabel: string;
  separatorLabel: string;
  pickerLabel: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}> = ({ textLabel, separatorLabel, pickerLabel, value, fallback, onChange }) => (
  <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_112px]">
    <TextField
      fullWidth
      label={textLabel}
      value={value}
      placeholder="#2563eb"
      onChange={(event) => onChange(event.target.value)}
    />
    <span className="text-center text-xs font-medium uppercase text-gray-500 dark:text-slate-400">
      {separatorLabel}
    </span>
    <TextField
      type="color"
      label={pickerLabel}
      value={getPickerColorValue(value, fallback)}
      onChange={(event) => onChange(event.target.value)}
      InputLabelProps={{ shrink: true }}
      inputProps={{ 'aria-label': pickerLabel }}
    />
  </div>
);

const LauncherIcon: React.FC<{ iconUrl?: string | null }> = ({ iconUrl }) =>
  iconUrl ? (
    <img src={iconUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <Bot size={28} />
  );

const WidgetPreview: React.FC<{ widget: EmbedWidget }> = ({ widget }) => {
  const { t } = useTranslation();
  const isLeft = widget.theme.position.includes('left');
  const isTop = widget.theme.position.includes('top');

  return (
    <div className="relative min-h-96 overflow-hidden rounded-lg border border-gray-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
      <div className="absolute inset-x-0 top-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-3 w-40 rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-2 w-64 rounded bg-gray-100 dark:bg-slate-700/70" />
      </div>

      <div
        className={`absolute ${isLeft ? 'left-5' : 'right-5'} ${isTop ? 'top-20' : 'bottom-5'} flex flex-col items-end gap-3`}
      >
        <div className="w-80 max-w-[calc(100vw-5rem)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div
            className="px-4 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: widget.theme.primary_color }}
          >
            {widget.agent?.name || widget.name}
          </div>
          <div className="space-y-3 p-4">
            <div className="max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-slate-700 dark:text-slate-100">
              {widget.behavior.greeting || t('embedWidgets.preview.defaultGreeting')}
            </div>
            <div
              className="ml-auto max-w-[80%] rounded-lg px-3 py-2 text-sm text-white"
              style={{ backgroundColor: widget.theme.accent_color }}
            >
              {t('embedWidgets.preview.sampleUserMessage')}
            </div>
          </div>
          <div className="border-t border-gray-200 p-3 dark:border-slate-700">
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400 dark:border-slate-600">
              {widget.behavior.placeholder}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
          style={{ backgroundColor: widget.theme.primary_color }}
          aria-label={t('embedWidgets.preview.launcherLabel')}
        >
          <LauncherIcon iconUrl={widget.theme.launcher_icon_url} />
        </button>
      </div>
    </div>
  );
};
