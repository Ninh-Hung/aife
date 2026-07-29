/**
 * Dashboard Page Component
 * Features: Stats Overview with Total Agents, Subscription Plan, Usage Quota, Token Usage Charts
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  LinearProgress,
  Chip,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Activity, Coins, CreditCard, LineChart, Network, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAgents } from '../contexts/AgentsContext';
import { getQuota, getSubscription, getTokenUsageSeries } from '../services/quota.service';
import { getThirdPartyUsage } from '../services/third-party-usage.service';
import type {
  SubscriptionInfo,
  ThirdPartyUsageRow,
  TokenUsagePeriod,
  TokenUsagePoint,
  UserQuota,
} from '../types';

const TOKEN_USAGE_PERIODS: TokenUsagePeriod[] = ['day', 'month', 'year'];
const THIRD_PARTY_USAGE_LIMIT = 5;
const EMPTY_THIRD_PARTY_TOTAL = { messages: 0, tokens: 0, credits: 0, toolCalls: 0 };
const TOKEN_USAGE_CHART_HEIGHT = 240;
const TOKEN_USAGE_CHART_TOP = 44;
const TOKEN_USAGE_CHART_BOTTOM = 196;
const TOKEN_USAGE_CHART_PADDING_X = 56;
const TOKEN_USAGE_POINT_SPACING = 96;

const formatTokens = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })}K`;
  }

  return value.toLocaleString();
};

const formatTokenUsagePointLabel = (point: TokenUsagePoint, period: TokenUsagePeriod): string => {
  if (period === 'year') {
    return point.period || point.label;
  }

  const [year, month, day] = point.period.split('-');

  if (period === 'month' && year && month) {
    return `${month}/${year}`;
  }

  if (period === 'day' && month && day) {
    return `${day}/${month}`;
  }

  return point.label;
};

const getUsageDateRange = () => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

// ============================================
// Dashboard Component
// ============================================

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, quota, subscription } = useAuth();
  const displayName = user?.fullName || user?.userName || t('dashboard.userFallback');
  const { agents } = useAgents();
  const [usagePeriod, setUsagePeriod] = useState<TokenUsagePeriod>('day');
  const [usagePoints, setUsagePoints] = useState<TokenUsagePoint[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [thirdPartyByTenant, setThirdPartyByTenant] = useState<ThirdPartyUsageRow[]>([]);
  const [thirdPartyByAgent, setThirdPartyByAgent] = useState<ThirdPartyUsageRow[]>([]);
  const [thirdPartyTotal, setThirdPartyTotal] = useState(EMPTY_THIRD_PARTY_TOTAL);
  const [thirdPartyLoading, setThirdPartyLoading] = useState(false);
  const [thirdPartyError, setThirdPartyError] = useState<string | null>(null);
  const [dashboardQuota, setDashboardQuota] = useState<UserQuota | null>(
    quota ?? user?.quota ?? null
  );
  const [dashboardSubscription, setDashboardSubscription] = useState<SubscriptionInfo | null>(
    subscription ?? user?.subscription ?? null
  );
  const [dashboardSummaryLoading, setDashboardSummaryLoading] = useState(true);

  const subscriptionCode = dashboardSubscription?.packageCode.toLowerCase();
  const subscriptionPlanName =
    dashboardSubscription?.packageName || t('dashboard.subscription.free');
  const currentQuota = dashboardQuota ?? quota ?? user?.quota ?? null;
  const showQuotaSkeleton = dashboardSummaryLoading && !currentQuota;
  const userAgents = useMemo(
    () => agents.filter((agent) => agent.ownerType !== 'SYSTEM'),
    [agents]
  );

  const usageData = useMemo(() => {
    const total = currentQuota?.quotaLimit ?? 0;
    const packageRemaining =
      currentQuota?.packageRemainingTokens ?? currentQuota?.remainingTokens ?? 0;
    const used = currentQuota?.packageTokensUsed ?? Math.max(0, total - packageRemaining);
    const percentage =
      currentQuota?.percentageUsed ??
      (total > 0 ? Math.min(100, Math.round((used / total) * 1000) / 10) : 0);
    const walletTokens = currentQuota?.advanceTokens ?? 0;
    const availableTokens =
      currentQuota?.totalRemainingTokens ?? currentQuota?.remainingTokens ?? 0;
    const hasQuotaData = Boolean(currentQuota);

    return {
      used,
      total,
      percentage,
      packageRemaining,
      walletTokens,
      availableTokens,
      hasWalletFallback: hasQuotaData && packageRemaining <= 0 && walletTokens > 0,
      hasNoTokensAvailable: hasQuotaData && availableTokens <= 0,
      nextReset: currentQuota?.monthStartDate
        ? (() => {
            const resetDate = new Date(currentQuota.monthStartDate);
            resetDate.setMonth(resetDate.getMonth() + 1);
            return resetDate.toLocaleDateString();
          })()
        : null,
      walletSourceSummary: currentQuota?.walletSourceSummary,
    };
  }, [currentQuota]);

  const usageChartPoints = useMemo(
    () =>
      usagePoints.map((point) => ({
        ...point,
        label: formatTokenUsagePointLabel(point, usagePeriod),
      })),
    [usagePeriod, usagePoints]
  );
  const chartMax = useMemo(
    () => Math.max(1, ...usageChartPoints.map((point) => point.totalTokens)),
    [usageChartPoints]
  );
  const periodTotal = usageChartPoints.reduce((sum, point) => sum + point.totalTokens, 0);
  const chartWidth = useMemo(
    () =>
      Math.max(
        620,
        Math.max(usageChartPoints.length - 1, 1) * TOKEN_USAGE_POINT_SPACING +
          TOKEN_USAGE_CHART_PADDING_X * 2
      ),
    [usageChartPoints.length]
  );
  const lineCoordinates = useMemo(
    () =>
      usageChartPoints.map((point, index) => {
        const x =
          usageChartPoints.length === 1
            ? chartWidth / 2
            : TOKEN_USAGE_CHART_PADDING_X + index * TOKEN_USAGE_POINT_SPACING;
        const y =
          TOKEN_USAGE_CHART_BOTTOM -
          (point.totalTokens / chartMax) * (TOKEN_USAGE_CHART_BOTTOM - TOKEN_USAGE_CHART_TOP);

        return { x, y, point };
      }),
    [chartMax, chartWidth, usageChartPoints]
  );
  const linePath = lineCoordinates
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ');

  useEffect(() => {
    setDashboardQuota(quota ?? user?.quota ?? null);
  }, [quota, user?.quota]);

  useEffect(() => {
    setDashboardSubscription(subscription ?? user?.subscription ?? null);
  }, [subscription, user?.subscription]);

  useEffect(() => {
    let isActive = true;

    const loadDashboardSummary = async () => {
      setDashboardSummaryLoading(true);

      try {
        const [quotaData, subscriptionData] = await Promise.allSettled([
          getQuota(),
          getSubscription(),
        ]);

        if (!isActive) return;

        if (quotaData.status === 'fulfilled') {
          setDashboardQuota(quotaData.value);
        }

        if (subscriptionData.status === 'fulfilled') {
          setDashboardSubscription({
            status: subscriptionData.value.status,
            packageName: subscriptionData.value.package.name,
            packageCode: subscriptionData.value.package.code,
            isTrialing: subscriptionData.value.isTrialSubscription,
            trialDaysRemaining: subscriptionData.value.trialEndsAt
              ? Math.ceil(
                  (new Date(subscriptionData.value.trialEndsAt).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              : null,
            expiresAt: subscriptionData.value.endAt,
          });
        }
      } catch {
        // Keep the context-backed fallback when dashboard summary refresh is unavailable.
      } finally {
        if (isActive) {
          setDashboardSummaryLoading(false);
        }
      }
    };

    loadDashboardSummary();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadUsage = async () => {
      setUsageLoading(true);
      setUsageError(null);

      try {
        const data = await getTokenUsageSeries(usagePeriod);

        if (isActive) {
          setUsagePoints(data.points);
        }
      } catch (error) {
        if (isActive) {
          setUsagePoints([]);
          setUsageError(
            error instanceof Error ? error.message : t('dashboard.tokenUsage.errors.loadFailed')
          );
        }
      } finally {
        if (isActive) {
          setUsageLoading(false);
        }
      }
    };

    loadUsage();

    return () => {
      isActive = false;
    };
  }, [t, usagePeriod]);

  useEffect(() => {
    let isActive = true;

    const loadThirdPartyUsage = async () => {
      setThirdPartyLoading(true);
      setThirdPartyError(null);

      try {
        const dateRange = getUsageDateRange();
        const [tenantUsage, agentUsage] = await Promise.all([
          getThirdPartyUsage({ ...dateRange, groupBy: 'external_tenant' }),
          getThirdPartyUsage({ ...dateRange, groupBy: 'agent' }),
        ]);

        if (!isActive) return;

        setThirdPartyTotal(
          tenantUsage.data.reduce(
            (total, row) => ({
              messages: total.messages + row.messages,
              tokens: total.tokens + row.total_tokens,
              credits: total.credits + row.cost_credits,
              toolCalls: total.toolCalls + row.tool_calls,
            }),
            EMPTY_THIRD_PARTY_TOTAL
          )
        );
        setThirdPartyByTenant(tenantUsage.data.slice(0, THIRD_PARTY_USAGE_LIMIT));
        setThirdPartyByAgent(agentUsage.data.slice(0, THIRD_PARTY_USAGE_LIMIT));
      } catch (error) {
        if (!isActive) return;

        setThirdPartyByTenant([]);
        setThirdPartyByAgent([]);
        setThirdPartyTotal(EMPTY_THIRD_PARTY_TOTAL);
        setThirdPartyError(
          error instanceof Error ? error.message : t('dashboard.thirdPartyUsage.errors.loadFailed')
        );
      } finally {
        if (isActive) {
          setThirdPartyLoading(false);
        }
      }
    };

    loadThirdPartyUsage();

    return () => {
      isActive = false;
    };
  }, [t]);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <Box className="mb-6 md:mb-8">
        <Typography
          variant="h4"
          className="font-bold text-gray-900 dark:text-white"
          sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          {t('dashboard.welcome', { name: displayName })}
        </Typography>
        <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
          {t('dashboard.subtitle')}
        </Typography>
      </Box>

      {/* Stats Cards Row */}
      <Box className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:grid-cols-3 md:gap-6">
        {/* Total Agents Card */}
        <Card
          className="border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Box className="flex items-start justify-between">
            <Box>
              <Typography
                variant="body2"
                className="mb-1 font-medium text-gray-500 dark:text-slate-400"
              >
                {t('dashboard.stats.totalAgents')}
              </Typography>
              <Typography variant="h3" className="font-bold text-gray-900 dark:text-white">
                {userAgents.length}
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.stats.agentsCreated')}
              </Typography>
            </Box>
            <Box className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </Box>
          </Box>
        </Card>

        {/* Subscription Plan Card */}
        <Card
          className="border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Box className="flex items-start justify-between">
            <Box className="flex-1">
              <Typography
                variant="body2"
                className="mb-1 font-medium text-gray-500 dark:text-slate-400"
              >
                {t('dashboard.stats.subscriptionPlan')}
              </Typography>
              <Box className="mt-2">
                <Chip
                  label={t('dashboard.subscription.planLabel', { name: subscriptionPlanName })}
                  className={`font-semibold ${
                    subscriptionCode === 'enterprise'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : subscriptionCode === 'pro'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                  size="medium"
                />
              </Box>
              <Typography
                variant="caption"
                className="mt-2 block text-gray-500 dark:text-slate-400"
              >
                {subscriptionCode === 'pro'
                  ? t('dashboard.subscription.proDescription')
                  : subscriptionCode === 'enterprise'
                    ? t('dashboard.subscription.enterpriseDescription')
                    : t('dashboard.subscription.freeDescription')}
              </Typography>
            </Box>
            <Box className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />
            </Box>
          </Box>
        </Card>

        {/* Usage Quota Card */}
        <Card
          className="border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Box className="flex items-start justify-between">
            <Box className="flex-1">
              <Typography
                variant="body2"
                className="mb-1 font-medium text-gray-500 dark:text-slate-400"
              >
                {t('dashboard.stats.usageQuota')}
              </Typography>
              {showQuotaSkeleton ? (
                <UsageQuotaSkeleton />
              ) : (
                <>
                  <Typography variant="h5" className="font-bold text-gray-900 dark:text-white">
                    {usageData.used.toLocaleString()} / {usageData.total.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                    {t('dashboard.stats.packageTokensUsed', {
                      remaining: usageData.availableTokens.toLocaleString(),
                    })}
                  </Typography>
                  {(usageData.hasWalletFallback || usageData.hasNoTokensAvailable) && (
                    <Box
                      className={`mt-3 rounded-lg border px-3 py-2 ${
                        usageData.hasNoTokensAvailable
                          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                          : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                      }`}
                    >
                      <Typography
                        variant="caption"
                        className={
                          usageData.hasNoTokensAvailable
                            ? 'font-medium text-red-700 dark:text-red-300'
                            : 'font-medium text-amber-700 dark:text-amber-300'
                        }
                      >
                        {usageData.hasNoTokensAvailable
                          ? t('dashboard.stats.noTokensAvailable')
                          : t('dashboard.stats.walletFallback')}
                      </Typography>
                    </Box>
                  )}
                  <Box className="mt-4 grid grid-cols-1 gap-2 text-sm">
                    <Box className="flex items-center justify-between gap-3">
                      <span className="text-gray-500 dark:text-slate-400">
                        {t('dashboard.stats.packageQuota')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {usageData.packageRemaining.toLocaleString()}
                      </span>
                    </Box>
                    <Box className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                        <Coins size={14} className="text-amber-500" />
                        {t('dashboard.stats.walletToken')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {usageData.walletTokens.toLocaleString()}
                      </span>
                    </Box>
                    <Box className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-slate-700">
                      <span className="text-gray-500 dark:text-slate-400">
                        {t('dashboard.stats.availableToken')}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {usageData.availableTokens.toLocaleString()}
                      </span>
                    </Box>
                    <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                      {t('dashboard.stats.nextReset', {
                        date: usageData.nextReset || t('dashboard.stats.nextResetUnknown'),
                      })}
                    </Typography>
                    {usageData.walletTokens > 0 && usageData.walletSourceSummary && (
                      <Box className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-gray-50 p-2 text-xs dark:bg-slate-900/60">
                        <span className="text-gray-500 dark:text-slate-400">
                          {t('dashboard.walletSources.purchased')}
                        </span>
                        <span className="text-right text-gray-700 dark:text-slate-200">
                          {usageData.walletSourceSummary.purchased.toLocaleString()}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400">
                          {t('dashboard.walletSources.adminGranted')}
                        </span>
                        <span className="text-right text-gray-700 dark:text-slate-200">
                          {usageData.walletSourceSummary.adminGranted.toLocaleString()}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400">
                          {t('dashboard.walletSources.carryOver')}
                        </span>
                        <span className="text-right text-gray-700 dark:text-slate-200">
                          {usageData.walletSourceSummary.carryOver.toLocaleString()}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400">
                          {t('dashboard.walletSources.adjustment')}
                        </span>
                        <span className="text-right text-gray-700 dark:text-slate-200">
                          {usageData.walletSourceSummary.refundAdjustment.toLocaleString()}
                        </span>
                      </Box>
                    )}
                  </Box>
                  {/* Progress Bar */}
                  <Box className="mt-3">
                    <LinearProgress
                      variant="determinate"
                      value={usageData.percentage}
                      className="h-2 rounded-full"
                      sx={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#3B82F6',
                          borderRadius: '9999px',
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      className="mt-1 block text-right text-gray-500 dark:text-slate-400"
                    >
                      {t('dashboard.stats.packagePercentUsed', {
                        percent: usageData.percentage,
                      })}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
            <Box className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="text-blue-600 dark:text-blue-400" size={24} />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Token Usage Charts */}
      <Card
        className="mb-6 border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:mb-8"
        elevation={0}
      >
        <Box className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <Box>
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
              {t('dashboard.tokenUsage.title')}
            </Typography>
            {usageLoading ? (
              <Skeleton variant="text" width={220} height={24} className="mt-1" />
            ) : (
              <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
                {t('dashboard.tokenUsage.subtitle', {
                  total: formatTokens(periodTotal),
                })}
              </Typography>
            )}
          </Box>

          <Box
            role="tablist"
            aria-label={t('dashboard.tokenUsage.periodLabel')}
            className="inline-flex w-fit rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {TOKEN_USAGE_PERIODS.map((period) => {
              const isSelected = usagePeriod === period;

              return (
                <button
                  key={period}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setUsagePeriod(period)}
                  className={`min-w-16 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t(`dashboard.tokenUsage.periods.${period}`)}
                </button>
              );
            })}
          </Box>
        </Box>

        {usageLoading && <TokenUsageChartSkeleton />}

        {!usageLoading && usageError && (
          <Box className="flex h-72 items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
            <Typography variant="body2" className="text-red-600 dark:text-red-300">
              {usageError}
            </Typography>
          </Box>
        )}

        {!usageLoading && !usageError && (
          <Box className="min-w-0">
            <Box className="mb-3 flex items-center gap-2">
              <LineChart size={18} className="text-blue-600 dark:text-blue-400" />
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {t('dashboard.tokenUsage.lineTitle')}
              </Typography>
            </Box>

            <Box className="overflow-x-auto rounded-lg border border-gray-100 p-4 dark:border-slate-700">
              <Box style={{ minWidth: `${chartWidth}px` }}>
                <svg
                  viewBox={`0 0 ${chartWidth} ${TOKEN_USAGE_CHART_HEIGHT}`}
                  className="h-64 w-full overflow-visible"
                  role="img"
                  aria-label={t('dashboard.tokenUsage.lineTitle')}
                >
                  <line
                    x1="0"
                    y1={TOKEN_USAGE_CHART_BOTTOM}
                    x2={chartWidth}
                    y2={TOKEN_USAGE_CHART_BOTTOM}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-slate-700"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1={(TOKEN_USAGE_CHART_TOP + TOKEN_USAGE_CHART_BOTTOM) / 2}
                    x2={chartWidth}
                    y2={(TOKEN_USAGE_CHART_TOP + TOKEN_USAGE_CHART_BOTTOM) / 2}
                    stroke="currentColor"
                    className="text-gray-100 dark:text-slate-800"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1={TOKEN_USAGE_CHART_TOP}
                    x2={chartWidth}
                    y2={TOKEN_USAGE_CHART_TOP}
                    stroke="currentColor"
                    className="text-gray-100 dark:text-slate-800"
                    strokeWidth="1"
                  />
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {lineCoordinates.map(({ x, y, point }) => (
                    <g key={point.period}>
                      <text
                        x={x}
                        y={Math.max(16, y - 12)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="currentColor"
                        className="text-gray-700 dark:text-slate-200"
                      >
                        {point.totalTokens.toLocaleString()}
                      </text>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#ffffff"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                      >
                        <title>{`${point.label}: ${point.totalTokens.toLocaleString()}`}</title>
                      </circle>
                    </g>
                  ))}
                  {lineCoordinates.map(({ x, point }, index) => {
                    const shouldShow =
                      lineCoordinates.length <= 6 ||
                      index === 0 ||
                      index === lineCoordinates.length - 1 ||
                      index % Math.ceil(lineCoordinates.length / 4) === 0;

                    if (!shouldShow) {
                      return null;
                    }

                    return (
                      <text
                        key={`${point.period}-label`}
                        x={x}
                        y={TOKEN_USAGE_CHART_HEIGHT - 12}
                        textAnchor="middle"
                        fontSize="11"
                        fill="currentColor"
                        className="text-gray-500 dark:text-slate-400"
                      >
                        {point.label}
                      </text>
                    );
                  })}
                </svg>
                <Box className="mt-4 flex flex-wrap items-center gap-4">
                  <Box className="flex items-center gap-2">
                    <Box className="h-0.5 w-5 rounded-full bg-blue-500" />
                    <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                      {t('dashboard.tokenUsage.legend.line')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Card>

      {/* Third-Party Usage */}
      <Card
        className="mb-6 border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:mb-8"
        elevation={0}
      >
        <Box className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <Box>
            <Box className="flex items-center gap-2">
              <Network size={18} className="text-emerald-600 dark:text-emerald-400" />
              <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
                {t('dashboard.thirdPartyUsage.title')}
              </Typography>
            </Box>
            <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
              {t('dashboard.thirdPartyUsage.subtitle')}
            </Typography>
          </Box>

          <Box className="grid grid-cols-2 gap-3 text-right md:grid-cols-4">
            <Box>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.thirdPartyUsage.summary.messages')}
              </Typography>
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {thirdPartyTotal.messages.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.thirdPartyUsage.summary.tokens')}
              </Typography>
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {formatTokens(thirdPartyTotal.tokens)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.thirdPartyUsage.summary.credits')}
              </Typography>
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {thirdPartyTotal.credits.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.thirdPartyUsage.summary.tools')}
              </Typography>
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {thirdPartyTotal.toolCalls.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>

        {thirdPartyLoading && (
          <Box className="flex min-h-44 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
            <CircularProgress size={24} />
          </Box>
        )}

        {!thirdPartyLoading && thirdPartyError && (
          <Box className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <Typography variant="body2" className="text-amber-700 dark:text-amber-300">
              {thirdPartyError}
            </Typography>
          </Box>
        )}

        {!thirdPartyLoading && !thirdPartyError && (
          <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ThirdPartyUsageList
              title={t('dashboard.thirdPartyUsage.byTenant')}
              emptyText={t('dashboard.thirdPartyUsage.empty')}
              rows={thirdPartyByTenant}
              getLabel={(row) =>
                row.external_tenant_id ||
                row.client_id ||
                t('dashboard.thirdPartyUsage.unknownTenant')
              }
            />
            <ThirdPartyUsageList
              title={t('dashboard.thirdPartyUsage.byAgent')}
              emptyText={t('dashboard.thirdPartyUsage.empty')}
              rows={thirdPartyByAgent}
              getLabel={(row) => row.agent_public_id || t('dashboard.thirdPartyUsage.unknownAgent')}
            />
          </Box>
        )}
      </Card>

      {/* Additional Content Section */}
      <Box className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Recent Activity Card */}
        <Card
          className="border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Typography variant="h6" className="mb-4 font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recentActivity.title')}
          </Typography>
          <Box className="space-y-3">
            {userAgents.slice(0, 5).map((agent) => (
              <Box
                key={agent.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-slate-700"
              >
                <Box className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Users className="text-blue-600 dark:text-blue-400" size={16} />
                </Box>
                <Box className="flex-1">
                  <Typography variant="body2" className="font-medium text-gray-900 dark:text-white">
                    {agent.name}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                    {agent.description ||
                      t('dashboard.recentActivity.knowledgeSources', {
                        count: agent.knowledgeCount ?? 0,
                      })}
                  </Typography>
                </Box>
                {agent.isDefault && (
                  <Chip
                    label={t('common.default')}
                    size="small"
                    className="bg-blue-100 text-blue-700"
                  />
                )}
              </Box>
            ))}
            {userAgents.length === 0 && (
              <Box className="py-8 text-center">
                <Typography variant="body2" className="text-gray-500 dark:text-slate-400">
                  {t('dashboard.recentActivity.empty')}
                </Typography>
              </Box>
            )}
          </Box>
        </Card>
      </Box>
    </div>
  );
};

interface ThirdPartyUsageListProps {
  title: string;
  emptyText: string;
  rows: ThirdPartyUsageRow[];
  getLabel: (row: ThirdPartyUsageRow) => string;
}

const UsageQuotaSkeleton: React.FC = () => (
  <Box aria-hidden="true">
    <Skeleton variant="text" width="72%" height={36} />
    <Skeleton variant="text" width="62%" height={20} />
    <Box className="mt-4 grid grid-cols-1 gap-2">
      {[0, 1, 2].map((item) => (
        <Box key={item} className="flex items-center justify-between gap-3">
          <Skeleton variant="text" width={item === 1 ? 120 : 96} height={22} />
          <Skeleton variant="text" width={72} height={22} />
        </Box>
      ))}
      <Skeleton variant="text" width="68%" height={20} />
    </Box>
    <Box className="mt-3">
      <Skeleton variant="rectangular" height={8} className="rounded-full" />
      <Box className="mt-1 flex justify-end">
        <Skeleton variant="text" width={48} height={18} />
      </Box>
    </Box>
  </Box>
);

const TokenUsageChartSkeleton: React.FC = () => (
  <Box aria-hidden="true" className="min-w-0">
    <Box className="mb-3 flex items-center gap-2">
      <Skeleton variant="circular" width={18} height={18} />
      <Skeleton variant="text" width={160} height={24} />
    </Box>
    <Box className="overflow-x-auto rounded-lg border border-gray-100 p-4 dark:border-slate-700">
      <Box className="min-w-[620px]">
        <Box className="relative h-64 overflow-hidden">
          <Box className="absolute inset-x-0 top-[10%] border-t border-gray-100 dark:border-slate-800" />
          <Box className="absolute inset-x-0 top-1/2 border-t border-gray-100 dark:border-slate-800" />
          <Box className="absolute inset-x-0 bottom-[10%] border-t border-gray-200 dark:border-slate-700" />
          <Skeleton
            variant="rectangular"
            width="88%"
            height={4}
            className="absolute left-[6%] top-[48%] rounded-full"
          />
          <Box className="absolute inset-x-[6%] top-[24%] flex justify-between">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} variant="text" width={52} height={18} />
            ))}
          </Box>
          <Box className="absolute inset-x-[6%] top-[44%] flex justify-between">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} variant="circular" width={10} height={10} />
            ))}
          </Box>
        </Box>
        <Box className="mt-2 flex justify-between gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} variant="text" width={64} height={18} />
          ))}
        </Box>
        <Box className="mt-4 flex flex-wrap items-center gap-4">
          <Box className="flex items-center gap-2">
            <Skeleton variant="rectangular" width={20} height={4} className="rounded-full" />
            <Skeleton variant="text" width={96} height={18} />
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

const ThirdPartyUsageList: React.FC<ThirdPartyUsageListProps> = ({
  title,
  emptyText,
  rows,
  getLabel,
}) => (
  <Box className="rounded-lg border border-gray-100 p-4 dark:border-slate-700">
    <Typography variant="subtitle2" className="mb-3 font-semibold text-gray-900 dark:text-white">
      {title}
    </Typography>
    <Box className="space-y-3">
      {rows.map((row, index) => (
        <Box
          key={`${getLabel(row)}-${index}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
        >
          <Box className="min-w-0">
            <Typography
              variant="body2"
              className="truncate font-medium text-gray-900 dark:text-white"
            >
              {getLabel(row)}
            </Typography>
            <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
              {row.messages.toLocaleString()} messages · {row.tool_calls.toLocaleString()} tools
            </Typography>
          </Box>
          <Box className="text-right">
            <Typography variant="body2" className="font-semibold text-gray-900 dark:text-white">
              {formatTokens(row.total_tokens)}
            </Typography>
            <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
              {row.cost_credits.toLocaleString()} credits
            </Typography>
          </Box>
        </Box>
      ))}
      {rows.length === 0 && (
        <Typography variant="body2" className="py-4 text-center text-gray-500 dark:text-slate-400">
          {emptyText}
        </Typography>
      )}
    </Box>
  </Box>
);
