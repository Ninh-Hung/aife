import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Bot, Info, Plus, Power, RefreshCw, Settings, Unplug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import {
  createTelegramIntegration,
  disconnectTelegramIntegration,
  listAgents,
  listTelegramIntegrations,
  updateTelegramIntegration,
} from '../services/api';
import type { Agent, ChannelIntegration } from '../types';

type TelegramFormState = {
  name: string;
  agentPublicId: string;
  botToken: string;
  maxMessagesPerSession: number;
  maxTokensPerSession: number;
  maxSessionAgeDays: number;
  warningThresholdPercent: number;
  hardLimitBehavior: 'auto_rollover' | 'ask_before_rollover' | 'block_until_new';
  notifyChannelUser: boolean;
};

const defaultForm: TelegramFormState = {
  name: '',
  agentPublicId: '',
  botToken: '',
  maxMessagesPerSession: 100,
  maxTokensPerSession: 50000,
  maxSessionAgeDays: 30,
  warningThresholdPercent: 80,
  hardLimitBehavior: 'auto_rollover',
  notifyChannelUser: true,
};

const statusColor = (status?: string) => {
  if (status === 'active') return 'success';
  if (status === 'disabled_by_package' || status === 'error') return 'warning';
  if (status === 'revoked') return 'error';
  return 'default';
};

const numberFromSettings = (
  settings: Record<string, unknown> | null | undefined,
  key: string,
  fallback: number
) => {
  const value = settings?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const IntegrationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { agents, loading: agentsLoading } = useAgents();
  const notification = useNotification();
  const [integrations, setIntegrations] = useState<ChannelIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelIntegration | null>(null);
  const [form, setForm] = useState<TelegramFormState>(defaultForm);
  const [agentOptions, setAgentOptions] = useState<Agent[]>([]);
  const [agentOptionsLoading, setAgentOptionsLoading] = useState(false);
  const [botTokenHelpAnchor, setBotTokenHelpAnchor] = useState<HTMLElement | null>(null);

  const userAgents = useMemo(
    () => agentOptions.filter((agent) => !agent.ownerType || agent.ownerType === 'USER'),
    [agentOptions]
  );
  const publishedUserAgents = useMemo(
    () => userAgents.filter((agent) => agent.status === 'published'),
    [userAgents]
  );

  useEffect(() => {
    setAgentOptions(agents);
  }, [agents]);

  const loadAgentOptions = async () => {
    if (agents.length > 0) {
      setAgentOptions(agents);
      return agents;
    }

    setAgentOptionsLoading(true);
    try {
      const response = await listAgents();
      if (response.success && response.data) {
        setAgentOptions(response.data);
        return response.data;
      }
      notification.error(response.error || t('integrations.telegram.errors.loadAgentsFailed'));
    } finally {
      setAgentOptionsLoading(false);
    }

    return [];
  };

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listTelegramIntegrations();
      if (response.success && response.data) {
        setIntegrations(response.data);
      } else {
        notification.error(response.error || t('integrations.telegram.errors.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [notification, t]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const openCreateDialog = async () => {
    const loadedAgents = await loadAgentOptions();
    const published = loadedAgents.filter(
      (agent) => (!agent.ownerType || agent.ownerType === 'USER') && agent.status === 'published'
    );

    setEditing(null);
    setForm({
      ...defaultForm,
      agentPublicId: published[0]?.publicId || '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = async (integration: ChannelIntegration) => {
    const loadedAgents = await loadAgentOptions();
    const published = loadedAgents.filter(
      (agent) => (!agent.ownerType || agent.ownerType === 'USER') && agent.status === 'published'
    );

    setEditing(integration);
    setForm({
      name: integration.name,
      agentPublicId: integration.agent_public_id || published[0]?.publicId || '',
      botToken: '',
      maxMessagesPerSession: numberFromSettings(
        integration.settings,
        'max_messages_per_session',
        defaultForm.maxMessagesPerSession
      ),
      maxTokensPerSession: numberFromSettings(
        integration.settings,
        'max_tokens_per_session',
        defaultForm.maxTokensPerSession
      ),
      maxSessionAgeDays: numberFromSettings(
        integration.settings,
        'max_session_age_days',
        defaultForm.maxSessionAgeDays
      ),
      warningThresholdPercent: numberFromSettings(
        integration.settings,
        'warning_threshold_percent',
        defaultForm.warningThresholdPercent
      ),
      hardLimitBehavior:
        integration.settings?.hard_limit_behavior === 'ask_before_rollover' ||
        integration.settings?.hard_limit_behavior === 'block_until_new'
          ? integration.settings.hard_limit_behavior
          : 'auto_rollover',
      notifyChannelUser:
        typeof integration.settings?.notify_channel_user === 'boolean'
          ? integration.settings.notify_channel_user
          : true,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.agentPublicId) {
      notification.error(t('integrations.telegram.errors.selectAgent'));
      return;
    }
    const selectedAgent = userAgents.find((agent) => agent.publicId === form.agentPublicId);
    if (selectedAgent?.status !== 'published') {
      notification.error(t('integrations.telegram.errors.publishAgent'));
      return;
    }
    if (!editing && !form.botToken.trim()) {
      notification.error(t('integrations.telegram.errors.botTokenRequired'));
      return;
    }

    setSaving(true);
    const settings = {
      max_messages_per_session: form.maxMessagesPerSession,
      max_tokens_per_session: form.maxTokensPerSession,
      max_session_age_days: form.maxSessionAgeDays,
      warning_threshold_percent: form.warningThresholdPercent,
      hard_limit_behavior: form.hardLimitBehavior,
      auto_rollover: form.hardLimitBehavior === 'auto_rollover',
      notify_channel_user: form.notifyChannelUser,
    };

    const response = editing
      ? await updateTelegramIntegration(editing.public_id, {
          name: form.name.trim() || undefined,
          agent_public_id: form.agentPublicId,
          settings,
        })
      : await createTelegramIntegration({
          name: form.name.trim() || undefined,
          agent_public_id: form.agentPublicId,
          bot_token: form.botToken.trim(),
          settings,
        });

    setSaving(false);
    if (response.success) {
      notification.success(
        editing
          ? t('integrations.telegram.messages.updated')
          : t('integrations.telegram.messages.connected')
      );
      setDialogOpen(false);
      await loadIntegrations();
      return;
    }

    notification.error(response.error || t('integrations.telegram.errors.requestFailed'));
  };

  const toggleStatus = async (integration: ChannelIntegration) => {
    const nextStatus = integration.status === 'active' ? 'disabled' : 'active';
    const response = await updateTelegramIntegration(integration.public_id, { status: nextStatus });
    if (response.success) {
      notification.success(
        nextStatus === 'active'
          ? t('integrations.telegram.messages.enabled')
          : t('integrations.telegram.messages.disabled')
      );
      await loadIntegrations();
      return;
    }
    notification.error(response.error || t('integrations.telegram.errors.updateFailed'));
  };

  const disconnect = async (integration: ChannelIntegration) => {
    const response = await disconnectTelegramIntegration(integration.public_id);
    if (response.success) {
      notification.success(t('integrations.telegram.messages.disconnected'));
      await loadIntegrations();
      return;
    }
    notification.error(response.error || t('integrations.telegram.errors.disconnectFailed'));
  };

  return (
    <Box className="h-full bg-slate-50 p-6 dark:bg-slate-900">
      <Box className="mb-5 flex items-center justify-between">
        <Typography variant="h5" className="font-semibold text-gray-900 dark:text-slate-100">
          {t('integrations.title')}
        </Typography>
        <Box className="flex gap-2">
          <Button startIcon={<RefreshCw size={16} />} onClick={loadIntegrations}>
            {t('integrations.telegram.actions.refresh')}
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => void openCreateDialog()}
          >
            Telegram
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box className="flex h-64 items-center justify-center">
          <CircularProgress size={28} />
        </Box>
      ) : integrations.length === 0 ? (
        <Box className="flex min-h-[280px] flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
          <Bot size={40} className="mb-3 text-sky-500" />
          <Typography className="font-medium text-gray-900 dark:text-slate-100">
            {t('integrations.telegram.empty')}
          </Typography>
          <Button
            className="mt-4"
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => void openCreateDialog()}
          >
            {t('integrations.telegram.connect')}
          </Button>
        </Box>
      ) : (
        <Box className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {integrations.map((integration) => (
            <Box
              key={integration.public_id}
              className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <Box className="flex items-start justify-between gap-3">
                <Box className="min-w-0">
                  <Box className="mb-2 flex items-center gap-2">
                    <Bot size={18} className="text-sky-500" />
                    <Typography className="truncate font-semibold text-gray-900 dark:text-slate-100">
                      {integration.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                    @{integration.bot_username || t('integrations.telegram.common.unknown')} ·{' '}
                    {integration.agent_name || t('integrations.telegram.common.noAgent')}
                  </Typography>
                </Box>
                <Chip
                  label={t(`integrations.telegram.status.${integration.status}`, {
                    defaultValue: integration.status,
                  })}
                  color={statusColor(integration.status)}
                  size="small"
                  variant="outlined"
                />
              </Box>

              <Divider className="my-3" />

              <Box className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-slate-300">
                <div>
                  {t('integrations.telegram.card.webhook')}:{' '}
                  {integration.webhook_status
                    ? t(`integrations.telegram.webhookStatus.${integration.webhook_status}`, {
                        defaultValue: integration.webhook_status,
                      })
                    : t('integrations.telegram.common.unknown')}
                </div>
                <div>
                  {t('integrations.telegram.card.conversations')}:{' '}
                  {integration.conversation_count ?? 0}
                </div>
                <div>
                  {t('integrations.telegram.card.token')}:{' '}
                  {integration.bot_token_prefix || t('integrations.telegram.common.stored')}
                </div>
                <div>
                  {t('integrations.telegram.card.limit')}:{' '}
                  {numberFromSettings(integration.settings, 'max_messages_per_session', 100)}{' '}
                  {t('integrations.telegram.card.messagesUnit')}
                </div>
              </Box>

              {integration.last_error && (
                <Typography variant="body2" className="mt-3 text-amber-700 dark:text-amber-300">
                  {integration.last_error}
                </Typography>
              )}

              <Box className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="small"
                  startIcon={<Settings size={15} />}
                  onClick={() => void openEditDialog(integration)}
                >
                  {t('integrations.telegram.actions.settings')}
                </Button>
                <Button
                  size="small"
                  startIcon={<Power size={15} />}
                  onClick={() => toggleStatus(integration)}
                >
                  {integration.status === 'active'
                    ? t('integrations.telegram.actions.disable')
                    : t('integrations.telegram.actions.enable')}
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<Unplug size={15} />}
                  onClick={() => disconnect(integration)}
                >
                  {t('integrations.telegram.actions.disconnect')}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editing ? t('integrations.telegram.settingsTitle') : t('integrations.telegram.connect')}
        </DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <TextField
              label={t('integrations.telegram.fields.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>{t('integrations.telegram.fields.agent')}</InputLabel>
              <Select
                label={t('integrations.telegram.fields.agent')}
                value={form.agentPublicId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, agentPublicId: event.target.value }))
                }
                disabled={agentsLoading || agentOptionsLoading}
              >
                {userAgents.map((agent) => (
                  <MenuItem
                    key={agent.publicId}
                    value={agent.publicId}
                    disabled={agent.status !== 'published'}
                  >
                    {agent.name}
                    {agent.status !== 'published'
                      ? ` (${t(`integrations.telegram.agentStatus.${agent.status || 'draft'}`, {
                          defaultValue: agent.status || 'draft',
                        })})`
                      : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {!agentsLoading && !agentOptionsLoading && userAgents.length === 0 && (
              <Typography variant="caption" className="text-amber-600 dark:text-amber-400">
                {t('integrations.telegram.help.noUserAgents')}
              </Typography>
            )}
            {!agentsLoading &&
              !agentOptionsLoading &&
              userAgents.length > 0 &&
              publishedUserAgents.length === 0 && (
                <Typography variant="caption" className="text-amber-600 dark:text-amber-400">
                  {t('integrations.telegram.help.noPublishedAgents')}
                </Typography>
              )}
            {!editing && (
              <TextField
                label={t('integrations.telegram.fields.botToken')}
                value={form.botToken}
                onChange={(event) => setForm((prev) => ({ ...prev, botToken: event.target.value }))}
                type="password"
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={t('integrations.telegram.botTokenHelp.ariaLabel')}
                        edge="end"
                        size="small"
                        onClick={(event) => setBotTokenHelpAnchor(event.currentTarget)}
                      >
                        <Info size={18} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
            <Popover
              open={Boolean(botTokenHelpAnchor)}
              anchorEl={botTokenHelpAnchor}
              onClose={() => setBotTokenHelpAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  className: 'max-w-sm rounded-lg p-4 shadow-lg',
                },
              }}
            >
              <Typography className="mb-2 font-semibold text-gray-900 dark:text-slate-100">
                {t('integrations.telegram.botTokenHelp.title')}
              </Typography>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-slate-300">
                <li>{t('integrations.telegram.botTokenHelp.steps.openBotFather')}</li>
                <li>{t('integrations.telegram.botTokenHelp.steps.newBot')}</li>
                <li>{t('integrations.telegram.botTokenHelp.steps.copyToken')}</li>
                <li>{t('integrations.telegram.botTokenHelp.steps.keepSecret')}</li>
              </ol>
            </Popover>
            <Box className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                label={t('integrations.telegram.fields.maxMessages')}
                type="number"
                value={form.maxMessagesPerSession}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maxMessagesPerSession: Number(event.target.value),
                  }))
                }
              />
              <TextField
                label={t('integrations.telegram.fields.maxTokens')}
                type="number"
                value={form.maxTokensPerSession}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maxTokensPerSession: Number(event.target.value),
                  }))
                }
              />
              <TextField
                label={t('integrations.telegram.fields.maxAgeDays')}
                type="number"
                value={form.maxSessionAgeDays}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    maxSessionAgeDays: Number(event.target.value),
                  }))
                }
              />
              <TextField
                label={t('integrations.telegram.fields.warningPercent')}
                type="number"
                value={form.warningThresholdPercent}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    warningThresholdPercent: Number(event.target.value),
                  }))
                }
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>{t('integrations.telegram.fields.limitBehavior')}</InputLabel>
              <Select
                label={t('integrations.telegram.fields.limitBehavior')}
                value={form.hardLimitBehavior}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    hardLimitBehavior: event.target.value as TelegramFormState['hardLimitBehavior'],
                  }))
                }
              >
                <MenuItem value="auto_rollover">
                  {t('integrations.telegram.limitBehavior.autoRollover')}
                </MenuItem>
                <MenuItem value="ask_before_rollover">
                  {t('integrations.telegram.limitBehavior.askBeforeRollover')}
                </MenuItem>
                <MenuItem value="block_until_new">
                  {t('integrations.telegram.limitBehavior.blockUntilNew')}
                </MenuItem>
              </Select>
            </FormControl>
            <Box className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-slate-700">
              <Typography className="text-gray-900 dark:text-slate-100">
                {t('integrations.telegram.fields.notifyChannelUser')}
              </Typography>
              <Switch
                checked={form.notifyChannelUser}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notifyChannelUser: event.target.checked }))
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {t('integrations.telegram.actions.cancel')}
          </Button>
          <Button variant="contained" disabled={saving} onClick={submit}>
            {saving
              ? t('integrations.telegram.actions.saving')
              : editing
                ? t('integrations.telegram.actions.save')
                : t('integrations.telegram.actions.connect')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
