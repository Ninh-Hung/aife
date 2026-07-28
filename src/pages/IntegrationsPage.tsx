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
import { EmailDraftEditorDialog } from '../components/integrations/email/EmailDraftEditorDialog';
import { EmailIntegrationPanel } from '../components/integrations/email/EmailIntegrationPanel';
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
  updateEmailBlacklistRule,
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

const listFromEmailFilter = (
  filters: Record<string, unknown> | null | undefined,
  keys: string[]
) => {
  for (const key of keys) {
    const value = filters?.[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string').join(', ');
    }
  }
  return '';
};

const csvToList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

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
  const [emailDigestSchedule, setEmailDigestSchedule] = useState('daily');
  const [emailFilterKeywords, setEmailFilterKeywords] = useState('');
  const [emailFilterSenders, setEmailFilterSenders] = useState('');
  const [emailFilterDomains, setEmailFilterDomains] = useState('');
  const [emailMessageStatusFilter, setEmailMessageStatusFilter] = useState('');
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
      setEmailDigestSchedule(defaultBinding?.digest_schedule || 'daily');
      setEmailFilterKeywords(
        listFromEmailFilter(defaultBinding?.filters, [
          'keywords',
          'subject_keywords',
          'include_keywords',
        ])
      );
      setEmailFilterSenders(
        listFromEmailFilter(defaultBinding?.filters, [
          'allowed_senders',
          'senders',
          'from_addresses',
        ])
      );
      setEmailFilterDomains(
        listFromEmailFilter(defaultBinding?.filters, ['allowed_domains', 'domains', 'from_domains'])
      );
      setEmailMessageStatusFilter('');
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
            ? listEmailMessages({
                account_public_id: selectedEmailAccountId,
                status: emailMessageStatusFilter || undefined,
              })
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
        notification.error(
          accountsResponse.error || t('integrations.email.errors.loadAccountsFailed')
        );
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
  }, [emailMessageStatusFilter, notification, selectedEmailAccountId]);

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
      notification.error(t('integrations.email.errors.defaultAgentRequired'));
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
    notification.error(response.error || t('integrations.email.errors.startOAuthFailed'));
  };

  const saveEmailBinding = async () => {
    if (!selectedEmailAccountId || !emailBindingAgentId) {
      notification.error(t('integrations.email.errors.selectAccountAndAgent'));
      return;
    }
    setEmailActionLoading(true);
    const filters = {
      keywords: csvToList(emailFilterKeywords),
      allowed_senders: csvToList(emailFilterSenders),
      allowed_domains: csvToList(emailFilterDomains),
    };
    const response = await upsertEmailAgentBinding(selectedEmailAccountId, {
      agent_public_id: emailBindingAgentId,
      access_level: emailAccessLevel,
      summary_mode: emailSummaryMode,
      is_default_handler: true,
      digest_schedule: emailSummaryMode === 'proactive_digest' ? emailDigestSchedule : null,
      filters_json: filters,
    });
    setEmailActionLoading(false);
    if (response.success) {
      notification.success(t('integrations.email.messages.bindingSaved'));
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.bindingSaveFailed'));
  };

  const saveRetentionSettings = async () => {
    if (!selectedEmailAccountId) {
      notification.error(t('integrations.email.errors.selectAccount'));
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
      notification.success(t('integrations.email.messages.retentionSaved'));
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.retentionSaveFailed'));
  };

  const syncSelectedEmail = async (accountPublicId = selectedEmailAccountId) => {
    if (!accountPublicId) return;
    setEmailActionLoading(true);
    const response = await syncEmailAccountNow(accountPublicId);
    setEmailActionLoading(false);
    if (response.success) {
      notification.success(
        response.data?.sync_queued
          ? t('integrations.email.messages.syncBackgroundQueued')
          : t('integrations.email.messages.syncQueued', {
              count: response.data?.queued_count ?? 0,
            })
      );
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.syncFailed'));
  };

  const disconnectSelectedEmail = async (account: EmailAccount) => {
    const response = await disconnectEmailAccount(account.public_id);
    if (response.success) {
      notification.success(t('integrations.email.messages.disconnected'));
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.disconnectFailed'));
  };

  const createRule = async () => {
    if (!blacklistPatternValue.trim()) {
      notification.error(t('integrations.email.errors.blacklistPatternRequired'));
      return;
    }
    if (
      blacklistAction === 'auto_delete' &&
      !window.confirm(t('integrations.email.confirm.autoDeleteBlacklist'))
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
      notification.success(t('integrations.email.messages.ruleCreated'));
      const rules = await listEmailBlacklistRules(selectedEmailAccountId || undefined);
      if (rules.success && rules.data) setEmailRules(rules.data);
      return;
    }
    notification.error(response.error || t('integrations.email.errors.ruleCreateFailed'));
  };

  const toggleEmailBlacklistRule = async (rule: EmailBlacklistRule) => {
    const response = await updateEmailBlacklistRule(rule.public_id, { enabled: !rule.enabled });
    if (response.success) {
      const rules = await listEmailBlacklistRules(selectedEmailAccountId || undefined);
      if (rules.success && rules.data) setEmailRules(rules.data);
      return;
    }
    notification.error(response.error || t('integrations.email.errors.ruleUpdateFailed'));
  };

  const summarizeMessage = async (message: EmailMessage) => {
    const response = await summarizeEmailMessage(message.public_id, {
      agent_public_id: emailBindingAgentId || undefined,
    });
    if (response.success) {
      setLatestSummary(response.data?.summary || '');
      notification.success(t('integrations.email.messages.summaryCreated'));
      return;
    }
    notification.error(response.error || t('integrations.email.errors.summaryFailed'));
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
      notification.success(t('integrations.email.messages.digestCreated'));
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.digestFailed'));
  };

  const draftReply = async (message: EmailMessage) => {
    const response = await draftEmailReply(message.public_id, {
      agent_public_id: emailBindingAgentId || undefined,
    });
    if (response.success) {
      notification.success(t('integrations.email.messages.draftCreated'));
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.draftCreateFailed'));
  };

  const notifyDraftSendResult = (draft?: EmailDraftApproval | null) => {
    if (draft?.status === 'executed') {
      notification.success(t('integrations.email.messages.draftSent'));
      return true;
    }
    if (draft?.status === 'failed') {
      notification.error(draft.error_message || t('integrations.email.errors.draftSendFailed'));
      return false;
    }
    notification.warning(
      t('integrations.email.messages.draftNotSent', { status: draft?.status || 'unknown' })
    );
    return false;
  };

  const approveDraft = async (draft: EmailDraftApproval) => {
    const response = await approveEmailDraft(draft.public_id, {
      draft_reply: draft.draft_text || '',
      send_now: true,
    });
    if (response.success) {
      notifyDraftSendResult(response.data);
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.draftSendFailed'));
  };

  const openDraftEditor = (draft: EmailDraftApproval) => {
    setEditingDraft(draft);
    setDraftTitle(
      draft.title || draft.message?.subject || t('integrations.email.drafts.defaultTitle')
    );
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
      notification.success(t('integrations.email.messages.draftSaved'));
      await loadEmailData();
      return response.data;
    }
    notification.error(response.error || t('integrations.email.errors.draftSaveFailed'));
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
      if (notifyDraftSendResult(response.data)) {
        setDraftEditorOpen(false);
        setEditingDraft(null);
      }
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.draftSendFailed'));
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
      notification.success(t('integrations.email.messages.draftRejected'));
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.draftRejectFailed'));
  };

  const retryDraftSend = async (draft: EmailDraftApproval) => {
    const response = await retrySendEmailDraft(draft.public_id);
    if (response.success) {
      notifyDraftSendResult(response.data);
      await loadEmailData();
      return;
    }
    notification.error(response.error || t('integrations.email.errors.draftRetryFailed'));
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

      <EmailIntegrationPanel
        emailAccounts={emailAccounts}
        emailMessages={emailMessages}
        emailDrafts={emailDrafts}
        emailDigests={emailDigests}
        emailRules={emailRules}
        selectedEmailAccountId={selectedEmailAccountId}
        selectedEmailAccount={selectedEmailAccount}
        emailLoading={emailLoading}
        emailActionLoading={emailActionLoading}
        emailAgentOptions={emailAgentOptions}
        emailBindingAgentId={emailBindingAgentId}
        emailAccessLevel={emailAccessLevel}
        emailSummaryMode={emailSummaryMode}
        emailDigestSchedule={emailDigestSchedule}
        emailFilterKeywords={emailFilterKeywords}
        emailFilterSenders={emailFilterSenders}
        emailFilterDomains={emailFilterDomains}
        emailMessageStatusFilter={emailMessageStatusFilter}
        blacklistPatternType={blacklistPatternType}
        blacklistPatternValue={blacklistPatternValue}
        blacklistAction={blacklistAction}
        latestSummary={latestSummary}
        retentionForm={retentionForm}
        onRefreshEmailData={() => void loadEmailData()}
        onConnectEmail={(provider) => void connectEmail(provider)}
        onSelectEmailAccount={selectEmailAccount}
        onSyncSelectedEmail={(accountPublicId) => void syncSelectedEmail(accountPublicId)}
        onDisconnectSelectedEmail={(account) => void disconnectSelectedEmail(account)}
        onEmailBindingAgentChange={setEmailBindingAgentId}
        onEmailAccessLevelChange={setEmailAccessLevel}
        onEmailSummaryModeChange={setEmailSummaryMode}
        onEmailDigestScheduleChange={setEmailDigestSchedule}
        onEmailFilterKeywordsChange={setEmailFilterKeywords}
        onEmailFilterSendersChange={setEmailFilterSenders}
        onEmailFilterDomainsChange={setEmailFilterDomains}
        onEmailMessageStatusFilterChange={setEmailMessageStatusFilter}
        onBlacklistPatternTypeChange={setBlacklistPatternType}
        onBlacklistPatternValueChange={setBlacklistPatternValue}
        onBlacklistActionChange={setBlacklistAction}
        onRetentionFormChange={setRetentionForm}
        onSaveEmailBinding={() => void saveEmailBinding()}
        onSaveRetentionSettings={() => void saveRetentionSettings()}
        onCreateRule={() => void createRule()}
        onToggleEmailBlacklistRule={(rule) => void toggleEmailBlacklistRule(rule)}
        onSummarizeMessage={(message) => void summarizeMessage(message)}
        onRunDigest={() => void runDigest()}
        onDraftReply={(message) => void draftReply(message)}
        onApproveDraft={(draft) => void approveDraft(draft)}
        onOpenDraftEditor={openDraftEditor}
        onRejectDraft={(draft) => void rejectDraft(draft)}
        onRetryDraftSend={(draft) => void retryDraftSend(draft)}
      />

      <EmailDraftEditorDialog
        open={draftEditorOpen}
        draft={editingDraft}
        title={draftTitle}
        text={draftText}
        actionLoading={emailActionLoading}
        onClose={() => setDraftEditorOpen(false)}
        onTitleChange={setDraftTitle}
        onTextChange={setDraftText}
        onSave={() => void saveDraftEdits()}
        onReject={() => void rejectEditedDraft()}
        onApprove={() => void approveEditedDraft()}
      />

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
