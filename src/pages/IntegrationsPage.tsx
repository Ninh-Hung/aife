import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
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
import {
  Bot,
  Inbox,
  Info,
  Mail,
  Plus,
  Power,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../contexts/AgentsContext';
import { useNotification } from '../hooks/useNotification';
import {
  createTelegramIntegration,
  approveEmailDraft,
  createEmailBlacklistRule,
  disconnectTelegramIntegration,
  disconnectEmailAccount,
  draftEmailReply,
  listAgents,
  listEmailAccounts,
  listEmailBlacklistRules,
  listEmailDigests,
  listEmailDrafts,
  listEmailMessages,
  listTelegramIntegrations,
  rejectEmailDraft,
  retrySendEmailDraft,
  runEmailDigest,
  startEmailOAuth,
  summarizeEmailMessage,
  syncEmailAccountNow,
  updateEmailAccount,
  updateEmailDraft,
  updateTelegramIntegration,
  upsertEmailAgentBinding,
} from '../services/api';
import type {
  Agent,
  ChannelIntegration,
  EmailAccount,
  EmailBlacklistRule,
  EmailDraftApproval,
  EmailMessage,
  EmailProvider,
  EmailSummary,
} from '../types';

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

const isEmailSelectableAgent = (agent: Agent) => {
  const status = String(agent.status || '').toLowerCase();
  const ownerType = String(agent.ownerType || '').toUpperCase();
  return (
    agent.isActive !== false &&
    status !== 'archived' &&
    status !== 'disabled' &&
    ownerType !== 'INTERNAL'
  );
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
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraftApproval[]>([]);
  const [emailDigests, setEmailDigests] = useState<EmailSummary[]>([]);
  const [emailRules, setEmailRules] = useState<EmailBlacklistRule[]>([]);
  const [selectedEmailAccountId, setSelectedEmailAccountId] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [emailBindingAgentId, setEmailBindingAgentId] = useState('');
  const [emailAccessLevel, setEmailAccessLevel] = useState('draft_action');
  const [emailSummaryMode, setEmailSummaryMode] = useState('on_demand');
  const [blacklistPatternType, setBlacklistPatternType] = useState('domain');
  const [blacklistPatternValue, setBlacklistPatternValue] = useState('');
  const [blacklistAction, setBlacklistAction] = useState('skip_only');
  const [latestSummary, setLatestSummary] = useState<string | null>(null);
  const [retentionForm, setRetentionForm] = useState({ raw: 30, content: 180, vector: 180 });
  const [draftEditorOpen, setDraftEditorOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<EmailDraftApproval | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');

  const userAgents = useMemo(
    () => agentOptions.filter((agent) => !agent.ownerType || agent.ownerType === 'USER'),
    [agentOptions]
  );
  const publishedUserAgents = useMemo(
    () => userAgents.filter((agent) => agent.status === 'published'),
    [userAgents]
  );
  const emailAgentOptions = useMemo(
    () => agentOptions.filter(isEmailSelectableAgent),
    [agentOptions]
  );
  const selectedEmailAccount = useMemo(
    () => emailAccounts.find((account) => account.public_id === selectedEmailAccountId) || null,
    [emailAccounts, selectedEmailAccountId]
  );

  const selectEmailAccount = useCallback(
    (account: EmailAccount) => {
      const defaultBinding = account.bindings?.find((binding) => binding.is_default_handler);

      setSelectedEmailAccountId(account.public_id);
      setEmailLoading(true);
      setEmailBindingAgentId(
        defaultBinding?.agent_public_id ||
          emailAgentOptions.find((agent) => agent.isDefault)?.publicId ||
          emailAgentOptions[0]?.publicId ||
          ''
      );
      setEmailAccessLevel(defaultBinding?.access_level || 'draft_action');
      setEmailSummaryMode(defaultBinding?.summary_mode || 'on_demand');
      setEmailMessages([]);
      setEmailDrafts([]);
      setEmailDigests([]);
      setEmailRules([]);
      setLatestSummary(null);
    },
    [emailAgentOptions]
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

  const loadEmailData = useCallback(async () => {
    setEmailLoading(true);
    try {
      const emptyMessagesResponse = { success: true, data: [] as EmailMessage[] };
      const emptyDraftsResponse = { success: true, data: [] as EmailDraftApproval[] };
      const emptyDigestsResponse = { success: true, data: [] as EmailSummary[] };
      const [accountsResponse, messagesResponse, draftsResponse, digestsResponse] =
        await Promise.all([
          listEmailAccounts(),
          selectedEmailAccountId
            ? listEmailMessages({ account_public_id: selectedEmailAccountId })
            : Promise.resolve(emptyMessagesResponse),
          selectedEmailAccountId ? listEmailDrafts() : Promise.resolve(emptyDraftsResponse),
          selectedEmailAccountId
            ? listEmailDigests({ account_public_id: selectedEmailAccountId })
            : Promise.resolve(emptyDigestsResponse),
        ]);

      if (accountsResponse.success && accountsResponse.data) {
        setEmailAccounts(accountsResponse.data);
        if (
          selectedEmailAccountId &&
          !accountsResponse.data.some((account) => account.public_id === selectedEmailAccountId)
        ) {
          setSelectedEmailAccountId('');
          setEmailBindingAgentId('');
          setEmailMessages([]);
          setEmailDrafts([]);
          setEmailDigests([]);
          setEmailRules([]);
          setLatestSummary(null);
        }
      } else {
        notification.error(accountsResponse.error || 'Không tải được danh sách email');
      }
      if (messagesResponse.success && messagesResponse.data) {
        setEmailMessages(messagesResponse.data);
      }
      if (draftsResponse.success && draftsResponse.data) {
        setEmailDrafts(draftsResponse.data);
      }
      if (digestsResponse.success && digestsResponse.data) {
        setEmailDigests(digestsResponse.data);
      }
    } finally {
      setEmailLoading(false);
    }
  }, [notification, selectedEmailAccountId]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => {
    void loadEmailData();
  }, [loadEmailData]);

  useEffect(() => {
    if (!selectedEmailAccountId) {
      setEmailRules([]);
      return;
    }
    listEmailBlacklistRules(selectedEmailAccountId).then((response) => {
      if (response.success && response.data) setEmailRules(response.data);
    });
  }, [selectedEmailAccountId]);

  useEffect(() => {
    if (!selectedEmailAccount) return;
    setRetentionForm({
      raw: selectedEmailAccount.retention?.raw_days ?? 30,
      content: selectedEmailAccount.retention?.content_days ?? 180,
      vector: selectedEmailAccount.retention?.vector_days ?? 180,
    });
  }, [selectedEmailAccount]);

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

  const connectEmail = async (provider: EmailProvider) => {
    setEmailActionLoading(true);
    const loadedAgents = await loadAgentOptions();
    const defaultAgent =
      emailBindingAgentId ||
      loadedAgents.find((agent) => isEmailSelectableAgent(agent) && agent.isDefault)?.publicId ||
      loadedAgents.find(isEmailSelectableAgent)?.publicId;
    if (!defaultAgent) {
      setEmailActionLoading(false);
      notification.error('Cần tạo hoặc bật default agent trước khi kết nối email');
      return;
    }
    const response = await startEmailOAuth({
      provider,
      agent_public_id: defaultAgent,
      redirect_after: window.location.href,
    });
    setEmailActionLoading(false);
    if (response.success && response.data?.authorization_url) {
      window.location.assign(response.data.authorization_url);
      return;
    }
    notification.error(response.error || 'Không bắt đầu được kết nối email');
  };

  const saveEmailBinding = async () => {
    if (!selectedEmailAccountId || !emailBindingAgentId) {
      notification.error('Chọn email account và agent trước');
      return;
    }
    setEmailActionLoading(true);
    const response = await upsertEmailAgentBinding(selectedEmailAccountId, {
      agent_public_id: emailBindingAgentId,
      access_level: emailAccessLevel,
      summary_mode: emailSummaryMode,
      is_default_handler: true,
    });
    setEmailActionLoading(false);
    if (response.success) {
      notification.success('Đã lưu agent binding cho email');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không lưu được agent binding');
  };

  const saveRetentionSettings = async () => {
    if (!selectedEmailAccountId) {
      notification.error('Chọn email account trước');
      return;
    }
    setEmailActionLoading(true);
    const response = await updateEmailAccount(selectedEmailAccountId, {
      raw_retention_days: retentionForm.raw,
      content_retention_days: retentionForm.content,
      vector_retention_days: retentionForm.vector,
    });
    setEmailActionLoading(false);
    if (response.success) {
      notification.success('Đã lưu retention settings');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không lưu được retention settings');
  };

  const syncSelectedEmail = async (accountPublicId = selectedEmailAccountId) => {
    if (!accountPublicId) return;
    setEmailActionLoading(true);
    const response = await syncEmailAccountNow(accountPublicId);
    setEmailActionLoading(false);
    if (response.success) {
      notification.success(`Đã queue ${response.data?.queued_count ?? 0} email`);
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không sync được email');
  };

  const disconnectSelectedEmail = async (account: EmailAccount) => {
    const response = await disconnectEmailAccount(account.public_id);
    if (response.success) {
      notification.success('Đã disconnect email account');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không disconnect được email account');
  };

  const createRule = async () => {
    if (!blacklistPatternValue.trim()) {
      notification.error('Nhập pattern blacklist');
      return;
    }
    if (
      blacklistAction === 'auto_delete' &&
      !window.confirm('Rule này sẽ tự chuyển email match vào Trash/Deleted Items. Tiếp tục?')
    ) {
      return;
    }
    const response = await createEmailBlacklistRule({
      account_public_id: selectedEmailAccountId || undefined,
      pattern_type: blacklistPatternType,
      pattern_value: blacklistPatternValue.trim(),
      action: blacklistAction,
      enabled: true,
    });
    if (response.success) {
      setBlacklistPatternValue('');
      notification.success('Đã tạo blacklist rule');
      const rules = await listEmailBlacklistRules(selectedEmailAccountId || undefined);
      if (rules.success && rules.data) setEmailRules(rules.data);
      return;
    }
    notification.error(response.error || 'Không tạo được blacklist rule');
  };

  const summarizeMessage = async (message: EmailMessage) => {
    const response = await summarizeEmailMessage(message.public_id, {
      agent_public_id: emailBindingAgentId || undefined,
    });
    if (response.success) {
      setLatestSummary(response.data?.summary || '');
      notification.success('Đã tạo summary');
      return;
    }
    notification.error(response.error || 'Không summarize được email');
  };

  const runDigest = async () => {
    setEmailActionLoading(true);
    const response = await runEmailDigest({
      account_public_id: selectedEmailAccountId || undefined,
      agent_public_id: emailBindingAgentId || undefined,
      window_hours: 24,
    });
    setEmailActionLoading(false);
    if (response.success) {
      const digest = Array.isArray(response.data) ? response.data[0] : response.data;
      setLatestSummary(digest?.summary || '');
      notification.success('Đã tạo email digest');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không tạo được email digest');
  };

  const draftReply = async (message: EmailMessage) => {
    const response = await draftEmailReply(message.public_id, {
      agent_public_id: emailBindingAgentId || undefined,
    });
    if (response.success) {
      notification.success('Đã tạo draft chờ duyệt');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không tạo được draft reply');
  };

  const approveDraft = async (draft: EmailDraftApproval) => {
    const response = await approveEmailDraft(draft.public_id, {
      draft_reply: draft.draft_text || '',
      send_now: true,
    });
    if (response.success) {
      notification.success('Đã approve và gửi email');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không gửi được draft');
  };

  const openDraftEditor = (draft: EmailDraftApproval) => {
    setEditingDraft(draft);
    setDraftTitle(draft.title || draft.message?.subject || 'Draft reply');
    setDraftText(draft.draft_text || '');
    setDraftEditorOpen(true);
  };

  const saveDraftEdits = async () => {
    if (!editingDraft) return null;
    setEmailActionLoading(true);
    const response = await updateEmailDraft(editingDraft.public_id, {
      title: draftTitle,
      draft_text: draftText,
    });
    setEmailActionLoading(false);
    if (response.success && response.data) {
      setEditingDraft(response.data);
      notification.success('Đã lưu draft');
      await loadEmailData();
      return response.data;
    }
    notification.error(response.error || 'Không lưu được draft');
    return null;
  };

  const approveEditedDraft = async () => {
    if (!editingDraft) return;
    const saved = await saveDraftEdits();
    if (!saved) return;
    const response = await approveEmailDraft(saved.public_id, {
      draft_reply: saved.draft_text || draftText,
      send_now: true,
    });
    if (response.success) {
      notification.success('Đã approve và gửi email');
      setDraftEditorOpen(false);
      setEditingDraft(null);
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không gửi được draft');
  };

  const rejectEditedDraft = async () => {
    if (!editingDraft) return;
    await rejectDraft(editingDraft);
    setDraftEditorOpen(false);
    setEditingDraft(null);
  };

  const rejectDraft = async (draft: EmailDraftApproval) => {
    const response = await rejectEmailDraft(draft.public_id);
    if (response.success) {
      notification.success('Đã reject draft');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không reject được draft');
  };

  const retryDraftSend = async (draft: EmailDraftApproval) => {
    const response = await retrySendEmailDraft(draft.public_id);
    if (response.success) {
      notification.success('Đã gửi lại draft');
      await loadEmailData();
      return;
    }
    notification.error(response.error || 'Không retry gửi draft được');
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

      <Box className="mt-8 space-y-4">
        <Box className="flex flex-wrap items-center justify-between gap-3">
          <Box className="flex items-center gap-2">
            <Mail size={20} className="text-emerald-600" />
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-slate-100">
              Email
            </Typography>
          </Box>
          <Box className="flex flex-wrap gap-2">
            <Button
              startIcon={<RefreshCw size={16} />}
              onClick={() => void loadEmailData()}
              disabled={emailLoading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Mail size={16} />}
              disabled={emailActionLoading}
              onClick={() => void connectEmail('gmail')}
            >
              Gmail
            </Button>
            <Button
              variant="outlined"
              startIcon={<Mail size={16} />}
              disabled={emailActionLoading}
              onClick={() => void connectEmail('outlook')}
            >
              Outlook
            </Button>
          </Box>
        </Box>

        {emailLoading && emailAccounts.length === 0 ? (
          <Box className="flex h-40 items-center justify-center rounded border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <CircularProgress size={24} />
          </Box>
        ) : emailAccounts.length === 0 ? (
          <Box className="flex min-h-[180px] flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
            <Mail size={36} className="mb-3 text-emerald-600" />
            <Typography className="font-medium text-gray-900 dark:text-slate-100">
              Chưa có email account
            </Typography>
          </Box>
        ) : (
          <Box className="grid grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {emailAccounts.map((account) => {
              const isSelectedEmailAccount = selectedEmailAccountId === account.public_id;

              return (
                <Box key={account.public_id} className="contents">
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-expanded={isSelectedEmailAccount}
                    onClick={() => selectEmailAccount(account)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectEmailAccount(account);
                      }
                    }}
                    className={`cursor-pointer rounded border bg-white p-3 transition hover:border-emerald-400 dark:bg-slate-800 ${
                      isSelectedEmailAccount
                        ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 dark:bg-emerald-950/30'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Box className="flex items-start justify-between gap-3">
                      <Box className="min-w-0">
                        <Box className="mb-2 flex items-center gap-2">
                          <Mail size={18} className="text-emerald-600" />
                          <Typography className="truncate font-semibold text-gray-900 dark:text-slate-100">
                            {account.email_address}
                          </Typography>
                        </Box>
                        <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                          {account.provider} ·{' '}
                          {account.bindings?.find((binding) => binding.is_default_handler)
                            ?.agent_name || 'no default agent'}
                        </Typography>
                      </Box>
                      <Chip
                        label={account.status}
                        color={statusColor(account.status)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-gray-700 dark:text-slate-300">
                      <div>
                        Last sync:{' '}
                        {account.last_synced_at
                          ? new Date(account.last_synced_at).toLocaleString()
                          : '-'}
                      </div>
                      <div>Raw: {account.retention?.raw_days ?? 30} days</div>
                      <div>Content: {account.retention?.content_days ?? 180} days</div>
                      <div>Vector: {account.retention?.vector_days ?? 180} days</div>
                    </Box>
                    {account.last_error && (
                      <Typography
                        variant="body2"
                        className="mt-3 text-amber-700 dark:text-amber-300"
                      >
                        {account.last_error}
                      </Typography>
                    )}
                    <Box className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="small"
                        startIcon={<RefreshCw size={15} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectEmailAccount(account);
                          void syncSelectedEmail(account.public_id);
                        }}
                      >
                        Sync
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Unplug size={15} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          void disconnectSelectedEmail(account);
                        }}
                      >
                        Disconnect
                      </Button>
                    </Box>
                  </Box>
                  {isSelectedEmailAccount && (
                    <Collapse className="col-span-full" in timeout="auto" unmountOnExit>
                      <Box className="rounded border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <Box className="space-y-4">
                          {emailLoading ? (
                            <Box className="flex h-32 items-center justify-center rounded border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                              <CircularProgress size={22} />
                            </Box>
                          ) : (
                            <>
                              <Box className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                                <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                  <Box className="mb-3 flex items-center gap-2">
                                    <Settings size={18} className="text-emerald-600" />
                                    <Typography className="font-semibold text-gray-900 dark:text-slate-100">
                                      Agent binding
                                    </Typography>
                                  </Box>
                                  <Box className="space-y-3">
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Agent</InputLabel>
                                      <Select
                                        label="Agent"
                                        value={emailBindingAgentId}
                                        onChange={(event) =>
                                          setEmailBindingAgentId(event.target.value)
                                        }
                                      >
                                        {emailAgentOptions.map((agent) => (
                                          <MenuItem key={agent.publicId} value={agent.publicId}>
                                            {agent.name}
                                            {agent.isDefault ? ' (default)' : ''}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    {emailAgentOptions.length === 0 && (
                                      <Typography
                                        variant="caption"
                                        className="text-amber-600 dark:text-amber-400"
                                      >
                                        Cần tạo hoặc bật agent trước khi theo dõi email.
                                      </Typography>
                                    )}
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Access</InputLabel>
                                      <Select
                                        label="Access"
                                        value={emailAccessLevel}
                                        onChange={(event) =>
                                          setEmailAccessLevel(event.target.value)
                                        }
                                      >
                                        <MenuItem value="read">read</MenuItem>
                                        <MenuItem value="summarize">summarize</MenuItem>
                                        <MenuItem value="draft_action">draft_action</MenuItem>
                                        <MenuItem value="execute_action">execute_action</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Summary mode</InputLabel>
                                      <Select
                                        label="Summary mode"
                                        value={emailSummaryMode}
                                        onChange={(event) =>
                                          setEmailSummaryMode(event.target.value)
                                        }
                                      >
                                        <MenuItem value="off">off</MenuItem>
                                        <MenuItem value="on_demand">on_demand</MenuItem>
                                        <MenuItem value="proactive_digest">
                                          proactive_digest
                                        </MenuItem>
                                        <MenuItem value="immediate">immediate</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <Button
                                      fullWidth
                                      variant="contained"
                                      disabled={
                                        !selectedEmailAccountId ||
                                        !emailBindingAgentId ||
                                        emailActionLoading
                                      }
                                      onClick={() => void saveEmailBinding()}
                                    >
                                      Save binding
                                    </Button>
                                  </Box>
                                </Box>

                                <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                  <Box className="mb-3 flex items-center gap-2">
                                    <Settings size={18} className="text-emerald-600" />
                                    <Typography className="font-semibold text-gray-900 dark:text-slate-100">
                                      Retention
                                    </Typography>
                                  </Box>
                                  <Box className="space-y-3">
                                    <TextField
                                      size="small"
                                      fullWidth
                                      type="number"
                                      label="Raw days (7-180)"
                                      value={retentionForm.raw}
                                      onChange={(event) =>
                                        setRetentionForm((prev) => ({
                                          ...prev,
                                          raw: Number(event.target.value),
                                        }))
                                      }
                                      inputProps={{ min: 7, max: 180 }}
                                    />
                                    <TextField
                                      size="small"
                                      fullWidth
                                      type="number"
                                      label="Content days (30-365)"
                                      value={retentionForm.content}
                                      onChange={(event) =>
                                        setRetentionForm((prev) => ({
                                          ...prev,
                                          content: Number(event.target.value),
                                        }))
                                      }
                                      inputProps={{ min: 30, max: 365 }}
                                    />
                                    <TextField
                                      size="small"
                                      fullWidth
                                      type="number"
                                      label="Vector days (30-365)"
                                      value={retentionForm.vector}
                                      onChange={(event) =>
                                        setRetentionForm((prev) => ({
                                          ...prev,
                                          vector: Number(event.target.value),
                                        }))
                                      }
                                      inputProps={{ min: 30, max: 365 }}
                                    />
                                    <Button
                                      fullWidth
                                      variant="outlined"
                                      disabled={!selectedEmailAccountId || emailActionLoading}
                                      onClick={() => void saveRetentionSettings()}
                                    >
                                      Save retention
                                    </Button>
                                  </Box>
                                </Box>

                                <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                  <Box className="mb-3 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-emerald-600" />
                                    <Typography className="font-semibold text-gray-900 dark:text-slate-100">
                                      Blacklist
                                    </Typography>
                                  </Box>
                                  <Box className="space-y-3">
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Pattern</InputLabel>
                                      <Select
                                        label="Pattern"
                                        value={blacklistPatternType}
                                        onChange={(event) =>
                                          setBlacklistPatternType(event.target.value)
                                        }
                                      >
                                        <MenuItem value="exact_sender">exact_sender</MenuItem>
                                        <MenuItem value="domain">domain</MenuItem>
                                        <MenuItem value="regex">regex</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      label="Value"
                                      value={blacklistPatternValue}
                                      onChange={(event) =>
                                        setBlacklistPatternValue(event.target.value)
                                      }
                                    />
                                    <FormControl fullWidth size="small">
                                      <InputLabel>Action</InputLabel>
                                      <Select
                                        label="Action"
                                        value={blacklistAction}
                                        onChange={(event) => setBlacklistAction(event.target.value)}
                                      >
                                        <MenuItem value="skip_only">skip_only</MenuItem>
                                        <MenuItem value="auto_delete">auto_delete</MenuItem>
                                      </Select>
                                    </FormControl>
                                    <Button
                                      fullWidth
                                      variant="outlined"
                                      onClick={() => void createRule()}
                                    >
                                      Add rule
                                    </Button>
                                    <Box className="max-h-40 overflow-auto text-sm text-gray-700 dark:text-slate-300">
                                      {emailRules.map((rule) => (
                                        <Box
                                          key={rule.public_id}
                                          className="flex items-center justify-between border-t border-gray-100 py-2 dark:border-slate-700"
                                        >
                                          <span className="truncate">
                                            {rule.pattern_type}: {rule.pattern_value}
                                          </span>
                                          <Chip
                                            size="small"
                                            label={rule.action}
                                            variant="outlined"
                                          />
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                </Box>

                                <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                  <Box className="mb-3 flex items-center gap-2">
                                    <Send size={18} className="text-emerald-600" />
                                    <Typography className="font-semibold text-gray-900 dark:text-slate-100">
                                      Draft approvals
                                    </Typography>
                                  </Box>
                                  <Box className="max-h-80 space-y-3 overflow-auto">
                                    {emailDrafts.length === 0 ? (
                                      <Typography
                                        variant="body2"
                                        className="text-gray-500 dark:text-slate-400"
                                      >
                                        No draft approval
                                      </Typography>
                                    ) : (
                                      emailDrafts.map((draft) => (
                                        <Box
                                          key={draft.public_id}
                                          className="rounded border border-gray-100 p-3 dark:border-slate-700"
                                        >
                                          <Box className="flex items-start justify-between gap-2">
                                            <Typography className="font-medium text-gray-900 dark:text-slate-100">
                                              {draft.title ||
                                                draft.message?.subject ||
                                                'Draft reply'}
                                            </Typography>
                                            <Chip
                                              size="small"
                                              label={draft.status}
                                              color={
                                                draft.status === 'failed' ? 'error' : 'default'
                                              }
                                              variant="outlined"
                                            />
                                          </Box>
                                          <Typography
                                            variant="body2"
                                            className="mt-1 line-clamp-3 whitespace-pre-line text-gray-600 dark:text-slate-300"
                                          >
                                            {draft.draft_text}
                                          </Typography>
                                          {draft.error_message && (
                                            <Typography
                                              variant="body2"
                                              className="mt-2 text-red-600 dark:text-red-300"
                                            >
                                              {draft.error_message}
                                            </Typography>
                                          )}
                                          <Box className="mt-3 flex gap-2">
                                            {draft.status === 'failed' ? (
                                              <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => void retryDraftSend(draft)}
                                              >
                                                Retry send
                                              </Button>
                                            ) : draft.status === 'approved' ? (
                                              <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => void retryDraftSend(draft)}
                                              >
                                                Send
                                              </Button>
                                            ) : draft.status === 'pending_approval' ? (
                                              <>
                                                <Button
                                                  size="small"
                                                  onClick={() => openDraftEditor(draft)}
                                                >
                                                  Edit
                                                </Button>
                                                <Button
                                                  size="small"
                                                  variant="contained"
                                                  onClick={() => void approveDraft(draft)}
                                                >
                                                  Approve/send
                                                </Button>
                                                <Button
                                                  size="small"
                                                  color="error"
                                                  onClick={() => void rejectDraft(draft)}
                                                >
                                                  Reject
                                                </Button>
                                              </>
                                            ) : null}
                                          </Box>
                                        </Box>
                                      ))
                                    )}
                                  </Box>
                                </Box>
                              </Box>

                              <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                <Box className="mb-3 flex items-center justify-between gap-3">
                                  <Box className="flex items-center gap-2">
                                    <Inbox size={18} className="text-emerald-600" />
                                    <Typography className="font-semibold text-gray-900 dark:text-slate-100">
                                      Digest history
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={emailActionLoading}
                                    onClick={() => void runDigest()}
                                  >
                                    Run digest
                                  </Button>
                                </Box>
                                {emailDigests.length === 0 ? (
                                  <Typography
                                    variant="body2"
                                    className="py-4 text-center text-gray-500 dark:text-slate-400"
                                  >
                                    No digest yet
                                  </Typography>
                                ) : (
                                  <Box className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    {emailDigests.slice(0, 6).map((digest) => (
                                      <Box
                                        key={digest.public_id}
                                        className="rounded border border-gray-100 p-3 dark:border-slate-700"
                                      >
                                        <Box className="mb-2 flex items-start justify-between gap-2">
                                          <Typography className="min-w-0 truncate font-medium text-gray-900 dark:text-slate-100">
                                            {digest.title || 'Email digest'}
                                          </Typography>
                                          <Chip
                                            size="small"
                                            label={`${digest.item_count} emails`}
                                            variant="outlined"
                                          />
                                        </Box>
                                        <Typography
                                          variant="body2"
                                          className="line-clamp-3 whitespace-pre-line text-gray-600 dark:text-slate-300"
                                        >
                                          {digest.summary || 'No summary'}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          className="mt-2 block text-gray-500 dark:text-slate-400"
                                        >
                                          {digest.generated_at
                                            ? new Date(digest.generated_at).toLocaleString()
                                            : new Date(digest.created_at).toLocaleString()}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>

                              <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                <Box className="mb-3 flex items-center justify-between gap-3">
                                  <Box className="flex items-center gap-2">
                                    <Inbox size={18} className="text-emerald-600" />
                                    <Typography className="font-semibold text-gray-900 dark:text-slate-100">
                                      Inbox
                                    </Typography>
                                  </Box>
                                  <Button
                                    size="small"
                                    startIcon={<RefreshCw size={15} />}
                                    onClick={() => void syncSelectedEmail()}
                                  >
                                    Sync now
                                  </Button>
                                </Box>
                                {latestSummary && (
                                  <Box className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                                    {latestSummary}
                                  </Box>
                                )}
                                <Box className="divide-y divide-gray-100 dark:divide-slate-700">
                                  {emailMessages.length === 0 ? (
                                    <Typography
                                      variant="body2"
                                      className="py-6 text-center text-gray-500 dark:text-slate-400"
                                    >
                                      No email message
                                    </Typography>
                                  ) : (
                                    emailMessages.map((message) => (
                                      <Box
                                        key={message.public_id}
                                        className="grid grid-cols-1 gap-3 py-3 lg:grid-cols-[1fr_auto]"
                                      >
                                        <Box className="min-w-0">
                                          <Box className="mb-1 flex flex-wrap items-center gap-2">
                                            <Typography className="truncate font-medium text-gray-900 dark:text-slate-100">
                                              {message.subject || '(no subject)'}
                                            </Typography>
                                            <Chip
                                              size="small"
                                              label={message.status}
                                              variant="outlined"
                                            />
                                          </Box>
                                          <Typography
                                            variant="body2"
                                            className="text-gray-600 dark:text-slate-400"
                                          >
                                            {message.from_address} ·{' '}
                                            {message.received_at
                                              ? new Date(message.received_at).toLocaleString()
                                              : '-'}
                                          </Typography>
                                          {message.snippet && (
                                            <Typography
                                              variant="body2"
                                              className="mt-1 line-clamp-2 text-gray-500 dark:text-slate-400"
                                            >
                                              {message.snippet}
                                            </Typography>
                                          )}
                                        </Box>
                                        <Box className="flex flex-wrap items-center gap-2">
                                          <Button
                                            size="small"
                                            onClick={() => void summarizeMessage(message)}
                                          >
                                            Summarize
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => void draftReply(message)}
                                          >
                                            Draft reply
                                          </Button>
                                        </Box>
                                      </Box>
                                    ))
                                  )}
                                </Box>
                              </Box>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Dialog
        open={draftEditorOpen}
        onClose={() => setDraftEditorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit email draft</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <TextField
              label="Title"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              fullWidth
            />
            <TextField
              label="Reply"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              fullWidth
              multiline
              minRows={10}
            />
            {editingDraft?.error_message && (
              <Typography variant="body2" className="text-red-600 dark:text-red-300">
                {editingDraft.error_message}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDraftEditorOpen(false)} disabled={emailActionLoading}>
            Close
          </Button>
          <Button
            onClick={() => void saveDraftEdits()}
            disabled={!editingDraft || emailActionLoading}
          >
            Save
          </Button>
          <Button
            color="error"
            onClick={() => void rejectEditedDraft()}
            disabled={
              !editingDraft || editingDraft.status !== 'pending_approval' || emailActionLoading
            }
          >
            Reject
          </Button>
          <Button
            variant="contained"
            startIcon={<Send size={16} />}
            onClick={() => void approveEditedDraft()}
            disabled={
              !editingDraft ||
              editingDraft.status !== 'pending_approval' ||
              !draftText.trim() ||
              emailActionLoading
            }
          >
            Approve/send
          </Button>
        </DialogActions>
      </Dialog>

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
