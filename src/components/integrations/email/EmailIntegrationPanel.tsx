import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Inbox,
  Info,
  Mail,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  Agent,
  EmailAccount,
  EmailBlacklistRule,
  EmailDraftApproval,
  EmailMessage,
  EmailProvider,
  EmailSummary,
} from '../../../types';

type RetentionForm = {
  raw: number;
  content: number;
  vector: number;
};

type ListSearchState<T> = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  filteredItems: T[];
  visibleItems: T[];
  pageCount: number;
};

type EmailIntegrationPanelProps = {
  emailAccounts: EmailAccount[];
  emailMessages: EmailMessage[];
  emailDrafts: EmailDraftApproval[];
  emailDigests: EmailSummary[];
  emailRules: EmailBlacklistRule[];
  selectedEmailAccountId: string;
  selectedEmailAccount: EmailAccount | null;
  emailLoading: boolean;
  emailActionLoading: boolean;
  emailAgentOptions: Agent[];
  emailBindingAgentId: string;
  emailAccessLevel: string;
  emailSummaryMode: string;
  emailDigestSchedule: string;
  emailFilterKeywords: string;
  emailFilterSenders: string;
  emailFilterDomains: string;
  emailMessageStatusFilter: string;
  blacklistPatternType: string;
  blacklistPatternValue: string;
  blacklistAction: string;
  latestSummary: string | null;
  retentionForm: RetentionForm;
  onRefreshEmailData: () => void;
  onConnectEmail: (provider: EmailProvider) => void;
  onSelectEmailAccount: (account: EmailAccount) => void;
  onSyncSelectedEmail: (accountPublicId?: string) => void;
  onDisconnectSelectedEmail: (account: EmailAccount) => void;
  onEmailBindingAgentChange: (value: string) => void;
  onEmailAccessLevelChange: (value: string) => void;
  onEmailSummaryModeChange: (value: string) => void;
  onEmailDigestScheduleChange: (value: string) => void;
  onEmailFilterKeywordsChange: (value: string) => void;
  onEmailFilterSendersChange: (value: string) => void;
  onEmailFilterDomainsChange: (value: string) => void;
  onEmailMessageStatusFilterChange: (value: string) => void;
  onBlacklistPatternTypeChange: (value: string) => void;
  onBlacklistPatternValueChange: (value: string) => void;
  onBlacklistActionChange: (value: string) => void;
  onRetentionFormChange: React.Dispatch<React.SetStateAction<RetentionForm>>;
  onSaveEmailBinding: () => void;
  onSaveRetentionSettings: () => void;
  onCreateRule: () => void;
  onToggleEmailBlacklistRule: (rule: EmailBlacklistRule) => void;
  onSummarizeMessage: (message: EmailMessage) => void;
  onRunDigest: () => void;
  onDraftReply: (message: EmailMessage) => void;
  onApproveDraft: (draft: EmailDraftApproval) => void;
  onOpenDraftEditor: (draft: EmailDraftApproval) => void;
  onRejectDraft: (draft: EmailDraftApproval) => void;
  onRetryDraftSend: (draft: EmailDraftApproval) => void;
};

const listStatusColor = (status?: string) => {
  if (status === 'active') return 'success';
  if (status === 'disabled_by_package' || status === 'error') return 'warning';
  if (status === 'revoked' || status === 'failed') return 'error';
  return 'default';
};

const normalizeSearch = (value: string) => value.trim().toLowerCase();

const includesQuery = (parts: Array<string | null | undefined>, query: string) => {
  if (!query) return true;
  return parts.some((part) => (part || '').toLowerCase().includes(query));
};

const useListSearch = <T,>(
  items: T[],
  pageSize: number,
  predicate: (item: T, query: string) => boolean
) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const normalizedQuery = normalizeSearch(query);

  const filteredItems = useMemo(
    () => items.filter((item) => predicate(item, normalizedQuery)),
    [items, normalizedQuery, predicate]
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery, items]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return { query, setQuery, page, setPage, filteredItems, visibleItems, pageCount };
};

const HelpTooltip: React.FC<{ title: string; ariaLabel: string }> = ({ title, ariaLabel }) => (
  <Tooltip arrow title={<span className="text-xs leading-5">{title}</span>}>
    <IconButton size="small" aria-label={ariaLabel} className="text-gray-500 dark:text-slate-400">
      <Info size={16} />
    </IconButton>
  </Tooltip>
);

const PanelTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  tooltip?: string;
  tooltipAriaLabel?: string;
  action?: React.ReactNode;
}> = ({ icon, title, tooltip, tooltipAriaLabel, action }) => (
  <Box className="mb-3 flex items-center justify-between gap-3">
    <Box className="flex min-w-0 items-center gap-2">
      {icon}
      <Typography className="font-semibold text-gray-900 dark:text-slate-100">{title}</Typography>
      {tooltip && tooltipAriaLabel && <HelpTooltip title={tooltip} ariaLabel={tooltipAriaLabel} />}
    </Box>
    {action}
  </Box>
);

const SearchPagination: React.FC<{
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageCount: number;
  total: number;
  placeholder: string;
  onPageChange: (page: number) => void;
}> = ({ search, onSearchChange, page, pageCount, total, placeholder, onPageChange }) => {
  const { t } = useTranslation();

  return (
    <Box className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <TextField
        size="small"
        value={search}
        placeholder={placeholder}
        onChange={(event) => onSearchChange(event.target.value)}
        className="min-w-[220px] flex-1"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} className="text-gray-400" />
            </InputAdornment>
          ),
        }}
      />
      <Box className="flex items-center gap-2">
        <Typography
          variant="caption"
          className="whitespace-nowrap text-gray-500 dark:text-slate-400"
        >
          {t('integrations.email.list.total', { count: total })}
        </Typography>
        {pageCount > 1 && (
          <Pagination
            size="small"
            count={pageCount}
            page={page}
            onChange={(_, value) => onPageChange(value)}
          />
        )}
      </Box>
    </Box>
  );
};

export const EmailIntegrationPanel: React.FC<EmailIntegrationPanelProps> = ({
  emailAccounts,
  emailMessages,
  emailDrafts,
  emailDigests,
  emailRules,
  selectedEmailAccountId,
  selectedEmailAccount,
  emailLoading,
  emailActionLoading,
  emailAgentOptions,
  emailBindingAgentId,
  emailAccessLevel,
  emailSummaryMode,
  emailDigestSchedule,
  emailFilterKeywords,
  emailFilterSenders,
  emailFilterDomains,
  emailMessageStatusFilter,
  blacklistPatternType,
  blacklistPatternValue,
  blacklistAction,
  latestSummary,
  retentionForm,
  onRefreshEmailData,
  onConnectEmail,
  onSelectEmailAccount,
  onSyncSelectedEmail,
  onDisconnectSelectedEmail,
  onEmailBindingAgentChange,
  onEmailAccessLevelChange,
  onEmailSummaryModeChange,
  onEmailDigestScheduleChange,
  onEmailFilterKeywordsChange,
  onEmailFilterSendersChange,
  onEmailFilterDomainsChange,
  onEmailMessageStatusFilterChange,
  onBlacklistPatternTypeChange,
  onBlacklistPatternValueChange,
  onBlacklistActionChange,
  onRetentionFormChange,
  onSaveEmailBinding,
  onSaveRetentionSettings,
  onCreateRule,
  onToggleEmailBlacklistRule,
  onSummarizeMessage,
  onRunDigest,
  onDraftReply,
  onApproveDraft,
  onOpenDraftEditor,
  onRejectDraft,
  onRetryDraftSend,
}) => {
  const { t } = useTranslation();

  const draftList = useListSearch(emailDrafts, 5, (draft, query) =>
    includesQuery(
      [
        draft.title,
        draft.draft_text,
        draft.status,
        draft.error_message,
        draft.message?.subject,
        draft.message?.from_address,
      ],
      query
    )
  );
  const inboxList = useListSearch(emailMessages, 8, (message, query) =>
    includesQuery(
      [message.subject, message.from_address, message.from_domain, message.snippet, message.status],
      query
    )
  );
  const ruleList = useListSearch(emailRules, 5, (rule, query) =>
    includesQuery(
      [rule.pattern_type, rule.pattern_value, rule.normalized_value, rule.action],
      query
    )
  );

  return (
    <Box className="mt-8 space-y-4">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box className="flex items-center gap-2">
          <Mail size={20} className="text-emerald-600" />
          <Typography variant="h6" className="font-semibold text-gray-900 dark:text-slate-100">
            {t('integrations.email.title')}
          </Typography>
        </Box>
        <Box className="flex flex-wrap gap-2">
          <Button
            startIcon={<RefreshCw size={16} />}
            onClick={onRefreshEmailData}
            disabled={emailLoading}
          >
            {t('integrations.email.actions.refresh')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Mail size={16} />}
            disabled={emailActionLoading}
            onClick={() => onConnectEmail('gmail')}
          >
            Gmail
          </Button>
          <Button
            variant="outlined"
            startIcon={<Mail size={16} />}
            disabled={emailActionLoading}
            onClick={() => onConnectEmail('outlook')}
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
            {t('integrations.email.emptyAccounts')}
          </Typography>
        </Box>
      ) : (
        <Box className="grid grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {emailAccounts.map((account) => {
            const isSelectedEmailAccount = selectedEmailAccountId === account.public_id;
            const defaultBinding = account.bindings?.find((binding) => binding.is_default_handler);

            return (
              <Box key={account.public_id} className="contents">
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={isSelectedEmailAccount}
                  onClick={() => onSelectEmailAccount(account)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectEmailAccount(account);
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
                        {defaultBinding?.agent_name ||
                          t('integrations.email.common.noDefaultAgent')}
                      </Typography>
                    </Box>
                    <Chip
                      label={t(`integrations.email.status.${account.status}`, {
                        defaultValue: account.status,
                      })}
                      color={listStatusColor(account.status)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Box className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-gray-700 dark:text-slate-300">
                    <div>
                      {t('integrations.email.account.autoSync')}:{' '}
                      {account.status === 'active'
                        ? t('integrations.email.account.autoSyncActive', {
                            mode: account.sync_mode || 'push',
                          })
                        : t('integrations.email.account.paused')}
                    </div>
                    <div>
                      {t('integrations.email.account.lastSync')}:{' '}
                      {account.last_synced_at
                        ? new Date(account.last_synced_at).toLocaleString()
                        : '-'}
                    </div>
                    <div>
                      {t('integrations.email.account.watchExpires')}:{' '}
                      {account.watch_expiration
                        ? new Date(account.watch_expiration).toLocaleString()
                        : t('integrations.email.common.pending')}
                    </div>
                    <div>
                      {t('integrations.email.account.reconcile')}:{' '}
                      {t('integrations.email.account.staleAfter', {
                        minutes: account.reconciliation?.stale_after_minutes ?? 60,
                      })}
                    </div>
                    <div>
                      {t('integrations.email.retention.rawShort', {
                        days: account.retention?.raw_days ?? 30,
                      })}
                    </div>
                    <div>
                      {t('integrations.email.retention.contentShort', {
                        days: account.retention?.content_days ?? 180,
                      })}
                    </div>
                    <div>
                      {t('integrations.email.retention.vectorShort', {
                        days: account.retention?.vector_days ?? 180,
                      })}
                    </div>
                  </Box>
                  {account.last_error && (
                    <Typography variant="body2" className="mt-3 text-amber-700 dark:text-amber-300">
                      {account.last_error}
                    </Typography>
                  )}
                  <Box className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="small"
                      startIcon={<RefreshCw size={15} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectEmailAccount(account);
                        onSyncSelectedEmail(account.public_id);
                      }}
                    >
                      {t('integrations.email.actions.manualSync')}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Unplug size={15} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDisconnectSelectedEmail(account);
                      }}
                    >
                      {t('integrations.email.actions.disconnect')}
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
                              <AgentBindingCard
                                emailAgentOptions={emailAgentOptions}
                                emailBindingAgentId={emailBindingAgentId}
                                emailAccessLevel={emailAccessLevel}
                                emailSummaryMode={emailSummaryMode}
                                emailDigestSchedule={emailDigestSchedule}
                                emailFilterKeywords={emailFilterKeywords}
                                emailFilterSenders={emailFilterSenders}
                                emailFilterDomains={emailFilterDomains}
                                selectedEmailAccountId={selectedEmailAccountId}
                                emailActionLoading={emailActionLoading}
                                onEmailBindingAgentChange={onEmailBindingAgentChange}
                                onEmailAccessLevelChange={onEmailAccessLevelChange}
                                onEmailSummaryModeChange={onEmailSummaryModeChange}
                                onEmailDigestScheduleChange={onEmailDigestScheduleChange}
                                onEmailFilterKeywordsChange={onEmailFilterKeywordsChange}
                                onEmailFilterSendersChange={onEmailFilterSendersChange}
                                onEmailFilterDomainsChange={onEmailFilterDomainsChange}
                                onSaveEmailBinding={onSaveEmailBinding}
                              />
                              <RetentionCard
                                retentionForm={retentionForm}
                                selectedEmailAccountId={selectedEmailAccountId}
                                emailActionLoading={emailActionLoading}
                                onRetentionFormChange={onRetentionFormChange}
                                onSaveRetentionSettings={onSaveRetentionSettings}
                              />
                              <BlacklistCard
                                blacklistPatternType={blacklistPatternType}
                                blacklistPatternValue={blacklistPatternValue}
                                blacklistAction={blacklistAction}
                                ruleList={ruleList}
                                onBlacklistPatternTypeChange={onBlacklistPatternTypeChange}
                                onBlacklistPatternValueChange={onBlacklistPatternValueChange}
                                onBlacklistActionChange={onBlacklistActionChange}
                                onCreateRule={onCreateRule}
                                onToggleEmailBlacklistRule={onToggleEmailBlacklistRule}
                              />
                              <DraftApprovalsCard
                                draftList={draftList}
                                onRetryDraftSend={onRetryDraftSend}
                                onOpenDraftEditor={onOpenDraftEditor}
                                onApproveDraft={onApproveDraft}
                                onRejectDraft={onRejectDraft}
                              />
                            </Box>

                            <DigestHistoryPanel
                              emailDigests={emailDigests}
                              emailActionLoading={emailActionLoading}
                              onRunDigest={onRunDigest}
                            />

                            <InboxPanel
                              selectedEmailAccount={selectedEmailAccount}
                              latestSummary={latestSummary}
                              inboxList={inboxList}
                              emailMessageStatusFilter={emailMessageStatusFilter}
                              onEmailMessageStatusFilterChange={onEmailMessageStatusFilterChange}
                              onSyncSelectedEmail={onSyncSelectedEmail}
                              onSummarizeMessage={onSummarizeMessage}
                              onDraftReply={onDraftReply}
                            />
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
  );
};

const AgentBindingCard: React.FC<{
  emailAgentOptions: Agent[];
  emailBindingAgentId: string;
  emailAccessLevel: string;
  emailSummaryMode: string;
  emailDigestSchedule: string;
  emailFilterKeywords: string;
  emailFilterSenders: string;
  emailFilterDomains: string;
  selectedEmailAccountId: string;
  emailActionLoading: boolean;
  onEmailBindingAgentChange: (value: string) => void;
  onEmailAccessLevelChange: (value: string) => void;
  onEmailSummaryModeChange: (value: string) => void;
  onEmailDigestScheduleChange: (value: string) => void;
  onEmailFilterKeywordsChange: (value: string) => void;
  onEmailFilterSendersChange: (value: string) => void;
  onEmailFilterDomainsChange: (value: string) => void;
  onSaveEmailBinding: () => void;
}> = ({
  emailAgentOptions,
  emailBindingAgentId,
  emailAccessLevel,
  emailSummaryMode,
  emailDigestSchedule,
  emailFilterKeywords,
  emailFilterSenders,
  emailFilterDomains,
  selectedEmailAccountId,
  emailActionLoading,
  onEmailBindingAgentChange,
  onEmailAccessLevelChange,
  onEmailSummaryModeChange,
  onEmailDigestScheduleChange,
  onEmailFilterKeywordsChange,
  onEmailFilterSendersChange,
  onEmailFilterDomainsChange,
  onSaveEmailBinding,
}) => {
  const { t } = useTranslation();

  return (
    <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <PanelTitle
        icon={<Settings size={18} className="text-emerald-600" />}
        title={t('integrations.email.binding.title')}
        tooltip={t('integrations.email.tooltips.agentBinding')}
        tooltipAriaLabel={t('integrations.email.tooltips.agentBindingAria')}
      />
      <Box className="space-y-3">
        <FormControl fullWidth size="small">
          <InputLabel>{t('integrations.email.binding.agent')}</InputLabel>
          <Select
            label={t('integrations.email.binding.agent')}
            value={emailBindingAgentId}
            onChange={(event) => onEmailBindingAgentChange(event.target.value)}
          >
            {emailAgentOptions.map((agent) => (
              <MenuItem key={agent.publicId} value={agent.publicId}>
                {agent.name}
                {agent.isDefault ? ` (${t('integrations.email.common.default')})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {emailAgentOptions.length === 0 && (
          <Typography variant="caption" className="text-amber-600 dark:text-amber-400">
            {t('integrations.email.binding.noAgents')}
          </Typography>
        )}
        <FormControl fullWidth size="small">
          <InputLabel>{t('integrations.email.binding.access')}</InputLabel>
          <Select
            label={t('integrations.email.binding.access')}
            value={emailAccessLevel}
            onChange={(event) => onEmailAccessLevelChange(event.target.value)}
          >
            <MenuItem value="read">{t('integrations.email.access.read')}</MenuItem>
            <MenuItem value="summarize">{t('integrations.email.access.summarize')}</MenuItem>
            <MenuItem value="draft_action">{t('integrations.email.access.draftAction')}</MenuItem>
            <MenuItem value="execute_action">
              {t('integrations.email.access.executeAction')}
            </MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>{t('integrations.email.binding.summaryMode')}</InputLabel>
          <Select
            label={t('integrations.email.binding.summaryMode')}
            value={emailSummaryMode}
            onChange={(event) => onEmailSummaryModeChange(event.target.value)}
          >
            <MenuItem value="off">{t('integrations.email.summaryMode.off')}</MenuItem>
            <MenuItem value="on_demand">{t('integrations.email.summaryMode.onDemand')}</MenuItem>
            <MenuItem value="proactive_digest">
              {t('integrations.email.summaryMode.proactiveDigest')}
            </MenuItem>
            <MenuItem value="immediate">{t('integrations.email.summaryMode.immediate')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>{t('integrations.email.binding.digestSchedule')}</InputLabel>
          <Select
            label={t('integrations.email.binding.digestSchedule')}
            value={emailDigestSchedule}
            disabled={emailSummaryMode !== 'proactive_digest'}
            onChange={(event) => onEmailDigestScheduleChange(event.target.value)}
          >
            <MenuItem value="hourly">{t('integrations.email.digestSchedule.hourly')}</MenuItem>
            <MenuItem value="daily">{t('integrations.email.digestSchedule.daily')}</MenuItem>
            <MenuItem value="weekly">{t('integrations.email.digestSchedule.weekly')}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          fullWidth
          label={t('integrations.email.binding.filterKeywords')}
          value={emailFilterKeywords}
          onChange={(event) => onEmailFilterKeywordsChange(event.target.value)}
          helperText={t('integrations.email.binding.commaSeparated')}
        />
        <TextField
          size="small"
          fullWidth
          label={t('integrations.email.binding.allowedSenders')}
          value={emailFilterSenders}
          onChange={(event) => onEmailFilterSendersChange(event.target.value)}
          helperText={t('integrations.email.binding.commaSeparated')}
        />
        <TextField
          size="small"
          fullWidth
          label={t('integrations.email.binding.allowedDomains')}
          value={emailFilterDomains}
          onChange={(event) => onEmailFilterDomainsChange(event.target.value)}
          helperText={t('integrations.email.binding.commaSeparated')}
        />
        <Button
          fullWidth
          variant="contained"
          disabled={!selectedEmailAccountId || !emailBindingAgentId || emailActionLoading}
          onClick={onSaveEmailBinding}
        >
          {t('integrations.email.actions.saveBinding')}
        </Button>
      </Box>
    </Box>
  );
};

const RetentionCard: React.FC<{
  retentionForm: RetentionForm;
  selectedEmailAccountId: string;
  emailActionLoading: boolean;
  onRetentionFormChange: React.Dispatch<React.SetStateAction<RetentionForm>>;
  onSaveRetentionSettings: () => void;
}> = ({
  retentionForm,
  selectedEmailAccountId,
  emailActionLoading,
  onRetentionFormChange,
  onSaveRetentionSettings,
}) => {
  const { t } = useTranslation();

  return (
    <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <PanelTitle
        icon={<Settings size={18} className="text-emerald-600" />}
        title={t('integrations.email.retention.title')}
        tooltip={t('integrations.email.tooltips.retention')}
        tooltipAriaLabel={t('integrations.email.tooltips.retentionAria')}
      />
      <Box className="space-y-3">
        <TextField
          size="small"
          fullWidth
          type="number"
          label={t('integrations.email.retention.rawDays')}
          value={retentionForm.raw}
          onChange={(event) =>
            onRetentionFormChange((prev) => ({ ...prev, raw: Number(event.target.value) }))
          }
          inputProps={{ min: 7, max: 180 }}
        />
        <TextField
          size="small"
          fullWidth
          type="number"
          label={t('integrations.email.retention.contentDays')}
          value={retentionForm.content}
          onChange={(event) =>
            onRetentionFormChange((prev) => ({ ...prev, content: Number(event.target.value) }))
          }
          inputProps={{ min: 30, max: 365 }}
        />
        <TextField
          size="small"
          fullWidth
          type="number"
          label={t('integrations.email.retention.vectorDays')}
          value={retentionForm.vector}
          onChange={(event) =>
            onRetentionFormChange((prev) => ({ ...prev, vector: Number(event.target.value) }))
          }
          inputProps={{ min: 30, max: 365 }}
        />
        <Button
          fullWidth
          variant="outlined"
          disabled={!selectedEmailAccountId || emailActionLoading}
          onClick={onSaveRetentionSettings}
        >
          {t('integrations.email.actions.saveRetention')}
        </Button>
      </Box>
    </Box>
  );
};

const BlacklistCard: React.FC<{
  blacklistPatternType: string;
  blacklistPatternValue: string;
  blacklistAction: string;
  ruleList: ListSearchState<EmailBlacklistRule>;
  onBlacklistPatternTypeChange: (value: string) => void;
  onBlacklistPatternValueChange: (value: string) => void;
  onBlacklistActionChange: (value: string) => void;
  onCreateRule: () => void;
  onToggleEmailBlacklistRule: (rule: EmailBlacklistRule) => void;
}> = ({
  blacklistPatternType,
  blacklistPatternValue,
  blacklistAction,
  ruleList,
  onBlacklistPatternTypeChange,
  onBlacklistPatternValueChange,
  onBlacklistActionChange,
  onCreateRule,
  onToggleEmailBlacklistRule,
}) => {
  const { t } = useTranslation();

  return (
    <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <PanelTitle
        icon={<ShieldCheck size={18} className="text-emerald-600" />}
        title={t('integrations.email.blacklist.title')}
        tooltip={t('integrations.email.tooltips.blacklist')}
        tooltipAriaLabel={t('integrations.email.tooltips.blacklistAria')}
      />
      <Box className="space-y-3">
        <FormControl fullWidth size="small">
          <InputLabel>{t('integrations.email.blacklist.pattern')}</InputLabel>
          <Select
            label={t('integrations.email.blacklist.pattern')}
            value={blacklistPatternType}
            onChange={(event) => onBlacklistPatternTypeChange(event.target.value)}
          >
            <MenuItem value="exact_sender">
              {t('integrations.email.blacklist.patternTypes.exactSender')}
            </MenuItem>
            <MenuItem value="domain">
              {t('integrations.email.blacklist.patternTypes.domain')}
            </MenuItem>
            <MenuItem value="regex">
              {t('integrations.email.blacklist.patternTypes.regex')}
            </MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          fullWidth
          label={t('integrations.email.blacklist.value')}
          value={blacklistPatternValue}
          onChange={(event) => onBlacklistPatternValueChange(event.target.value)}
        />
        <FormControl fullWidth size="small">
          <InputLabel>{t('integrations.email.blacklist.action')}</InputLabel>
          <Select
            label={t('integrations.email.blacklist.action')}
            value={blacklistAction}
            onChange={(event) => onBlacklistActionChange(event.target.value)}
          >
            <MenuItem value="skip_only">
              {t('integrations.email.blacklist.actions.skipOnly')}
            </MenuItem>
            <MenuItem value="auto_delete">
              {t('integrations.email.blacklist.actions.autoDelete')}
            </MenuItem>
          </Select>
        </FormControl>
        <Button fullWidth variant="outlined" onClick={onCreateRule}>
          {t('integrations.email.actions.addRule')}
        </Button>
        <SearchPagination
          search={ruleList.query}
          onSearchChange={ruleList.setQuery}
          page={ruleList.page}
          pageCount={ruleList.pageCount}
          total={ruleList.filteredItems.length}
          placeholder={t('integrations.email.blacklist.searchPlaceholder')}
          onPageChange={ruleList.setPage}
        />
        <Box className="max-h-56 overflow-auto text-sm text-gray-700 dark:text-slate-300">
          {ruleList.visibleItems.length === 0 ? (
            <Typography
              variant="body2"
              className="py-4 text-center text-gray-500 dark:text-slate-400"
            >
              {t('integrations.email.blacklist.empty')}
            </Typography>
          ) : (
            ruleList.visibleItems.map((rule) => (
              <Box
                key={rule.public_id}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-gray-100 py-2 dark:border-slate-700"
              >
                <Box className="min-w-0">
                  <Typography variant="body2" className="truncate">
                    {rule.pattern_type}: {rule.pattern_value}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                    {t('integrations.email.blacklist.matched', {
                      count: rule.last_matched_count ?? 0,
                      action: rule.action,
                    })}
                  </Typography>
                </Box>
                <Box className="flex items-center gap-1">
                  <Chip
                    size="small"
                    label={
                      rule.enabled
                        ? t('integrations.email.common.enabled')
                        : t('integrations.email.common.disabled')
                    }
                    color={rule.enabled ? 'success' : 'default'}
                    variant="outlined"
                  />
                  <Switch
                    size="small"
                    checked={rule.enabled}
                    onChange={() => onToggleEmailBlacklistRule(rule)}
                  />
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};

const DraftApprovalsCard: React.FC<{
  draftList: ListSearchState<EmailDraftApproval>;
  onRetryDraftSend: (draft: EmailDraftApproval) => void;
  onOpenDraftEditor: (draft: EmailDraftApproval) => void;
  onApproveDraft: (draft: EmailDraftApproval) => void;
  onRejectDraft: (draft: EmailDraftApproval) => void;
}> = ({ draftList, onRetryDraftSend, onOpenDraftEditor, onApproveDraft, onRejectDraft }) => {
  const { t } = useTranslation();

  return (
    <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <PanelTitle
        icon={<Send size={18} className="text-emerald-600" />}
        title={t('integrations.email.drafts.title')}
        tooltip={t('integrations.email.tooltips.draftApprovals')}
        tooltipAriaLabel={t('integrations.email.tooltips.draftApprovalsAria')}
      />
      <SearchPagination
        search={draftList.query}
        onSearchChange={draftList.setQuery}
        page={draftList.page}
        pageCount={draftList.pageCount}
        total={draftList.filteredItems.length}
        placeholder={t('integrations.email.drafts.searchPlaceholder')}
        onPageChange={draftList.setPage}
      />
      <Box className="max-h-96 space-y-3 overflow-auto">
        {draftList.visibleItems.length === 0 ? (
          <Typography
            variant="body2"
            className="py-4 text-center text-gray-500 dark:text-slate-400"
          >
            {t('integrations.email.drafts.empty')}
          </Typography>
        ) : (
          draftList.visibleItems.map((draft) => (
            <Box
              key={draft.public_id}
              className="rounded border border-gray-100 p-3 dark:border-slate-700"
            >
              <Box className="flex items-start justify-between gap-2">
                <Typography className="font-medium text-gray-900 dark:text-slate-100">
                  {draft.title ||
                    draft.message?.subject ||
                    t('integrations.email.drafts.defaultTitle')}
                </Typography>
                <Chip
                  size="small"
                  label={t(`integrations.email.draftStatus.${draft.status}`, {
                    defaultValue: draft.status,
                  })}
                  color={draft.status === 'failed' ? 'error' : 'default'}
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
                <Typography variant="body2" className="mt-2 text-red-600 dark:text-red-300">
                  {draft.error_message}
                </Typography>
              )}
              <Box className="mt-3 flex gap-2">
                {draft.status === 'failed' ? (
                  <Button size="small" variant="contained" onClick={() => onRetryDraftSend(draft)}>
                    {t('integrations.email.actions.retrySend')}
                  </Button>
                ) : draft.status === 'approved' ? (
                  <Button size="small" variant="contained" onClick={() => onRetryDraftSend(draft)}>
                    {t('integrations.email.actions.send')}
                  </Button>
                ) : draft.status === 'pending_approval' ? (
                  <>
                    <Button size="small" onClick={() => onOpenDraftEditor(draft)}>
                      {t('integrations.email.actions.edit')}
                    </Button>
                    <Button size="small" variant="contained" onClick={() => onApproveDraft(draft)}>
                      {t('integrations.email.actions.approveSend')}
                    </Button>
                    <Button size="small" color="error" onClick={() => onRejectDraft(draft)}>
                      {t('integrations.email.actions.reject')}
                    </Button>
                  </>
                ) : null}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

const DigestHistoryPanel: React.FC<{
  emailDigests: EmailSummary[];
  emailActionLoading: boolean;
  onRunDigest: () => void;
}> = ({ emailDigests, emailActionLoading, onRunDigest }) => {
  const { t } = useTranslation();

  return (
    <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <PanelTitle
        icon={<Inbox size={18} className="text-emerald-600" />}
        title={t('integrations.email.digest.title')}
        tooltip={t('integrations.email.tooltips.digestHistory')}
        tooltipAriaLabel={t('integrations.email.tooltips.digestHistoryAria')}
        action={
          <Button
            size="small"
            variant="outlined"
            disabled={emailActionLoading}
            onClick={onRunDigest}
          >
            {t('integrations.email.actions.runDigest')}
          </Button>
        }
      />
      {emailDigests.length === 0 ? (
        <Typography variant="body2" className="py-4 text-center text-gray-500 dark:text-slate-400">
          {t('integrations.email.digest.empty')}
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
                  {digest.title || t('integrations.email.digest.defaultTitle')}
                </Typography>
                <Chip
                  size="small"
                  label={t('integrations.email.digest.itemCount', { count: digest.item_count })}
                  variant="outlined"
                />
              </Box>
              <Typography
                variant="body2"
                className="line-clamp-3 whitespace-pre-line text-gray-600 dark:text-slate-300"
              >
                {digest.summary || t('integrations.email.digest.noSummary')}
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
  );
};

const InboxPanel: React.FC<{
  selectedEmailAccount: EmailAccount | null;
  latestSummary: string | null;
  inboxList: ListSearchState<EmailMessage>;
  emailMessageStatusFilter: string;
  onEmailMessageStatusFilterChange: (value: string) => void;
  onSyncSelectedEmail: (accountPublicId?: string) => void;
  onSummarizeMessage: (message: EmailMessage) => void;
  onDraftReply: (message: EmailMessage) => void;
}> = ({
  selectedEmailAccount,
  latestSummary,
  inboxList,
  emailMessageStatusFilter,
  onEmailMessageStatusFilterChange,
  onSyncSelectedEmail,
  onSummarizeMessage,
  onDraftReply,
}) => {
  const { t } = useTranslation();

  return (
    <Box className="rounded border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <Box className="mb-3 flex items-center justify-between gap-3">
        <Box className="flex items-center gap-2">
          <Inbox size={18} className="text-emerald-600" />
          <Typography className="font-semibold text-gray-900 dark:text-slate-100">
            {t('integrations.email.inbox.title')}
          </Typography>
          <HelpTooltip
            title={t('integrations.email.tooltips.inbox')}
            ariaLabel={t('integrations.email.tooltips.inboxAria')}
          />
        </Box>
        <Box className="flex flex-wrap items-center gap-2">
          <FormControl size="small" className="min-w-[140px]">
            <InputLabel>{t('integrations.email.inbox.status')}</InputLabel>
            <Select
              label={t('integrations.email.inbox.status')}
              value={emailMessageStatusFilter}
              onChange={(event) => onEmailMessageStatusFilterChange(event.target.value)}
            >
              <MenuItem value="">{t('integrations.email.statusFilter.all')}</MenuItem>
              <MenuItem value="queued">{t('integrations.email.statusFilter.queued')}</MenuItem>
              <MenuItem value="ingesting">
                {t('integrations.email.statusFilter.ingesting')}
              </MenuItem>
              <MenuItem value="ingested">{t('integrations.email.statusFilter.ingested')}</MenuItem>
              <MenuItem value="blacklisted">
                {t('integrations.email.statusFilter.blacklisted')}
              </MenuItem>
              <MenuItem value="failed">{t('integrations.email.statusFilter.failed')}</MenuItem>
            </Select>
          </FormControl>
          <Button
            size="small"
            startIcon={<RefreshCw size={15} />}
            onClick={() => onSyncSelectedEmail()}
          >
            {t('integrations.email.actions.manualSync')}
          </Button>
        </Box>
      </Box>
      {selectedEmailAccount?.last_error && (
        <Typography variant="body2" className="mb-3 text-amber-700 dark:text-amber-300">
          {selectedEmailAccount.last_error}
        </Typography>
      )}
      {latestSummary && (
        <Box className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {latestSummary}
        </Box>
      )}
      <SearchPagination
        search={inboxList.query}
        onSearchChange={inboxList.setQuery}
        page={inboxList.page}
        pageCount={inboxList.pageCount}
        total={inboxList.filteredItems.length}
        placeholder={t('integrations.email.inbox.searchPlaceholder')}
        onPageChange={inboxList.setPage}
      />
      <Box className="divide-y divide-gray-100 dark:divide-slate-700">
        {inboxList.visibleItems.length === 0 ? (
          <Typography
            variant="body2"
            className="py-6 text-center text-gray-500 dark:text-slate-400"
          >
            {t('integrations.email.inbox.empty')}
          </Typography>
        ) : (
          inboxList.visibleItems.map((message) => (
            <Box
              key={message.public_id}
              className="grid grid-cols-1 gap-3 py-3 lg:grid-cols-[1fr_auto]"
            >
              <Box className="min-w-0">
                <Box className="mb-1 flex flex-wrap items-center gap-2">
                  <Typography className="truncate font-medium text-gray-900 dark:text-slate-100">
                    {message.subject || t('integrations.email.inbox.noSubject')}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(`integrations.email.messageStatus.${message.status}`, {
                      defaultValue: message.status,
                    })}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
                  {message.from_address} ·{' '}
                  {message.received_at ? new Date(message.received_at).toLocaleString() : '-'}
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
                <Button size="small" onClick={() => onSummarizeMessage(message)}>
                  {t('integrations.email.actions.summarize')}
                </Button>
                <Button size="small" variant="outlined" onClick={() => onDraftReply(message)}>
                  {t('integrations.email.actions.draftReply')}
                </Button>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
