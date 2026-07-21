/**
 * Dashboard Page Component
 * Features: Stats Overview with Total Agents, Subscription Plan, Usage Quota, Token Usage Charts
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, Typography, LinearProgress, Chip } from '@mui/material';
import { Activity, BarChart3, Coins, CreditCard, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAgents } from '../contexts/AgentsContext';
import { getQuota, getSubscription, getTokenUsageSeries } from '../services/quota.service';
import type { SubscriptionInfo, TokenUsagePeriod, TokenUsagePoint, UserQuota } from '../types';

const TOKEN_USAGE_PERIODS: TokenUsagePeriod[] = ['day', 'month', 'year'];

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

const getLineCoordinates = (points: TokenUsagePoint[], maxValue: number) =>
  points.map((point, index) => {
    const x = ((index + 0.5) / points.length) * 100;
    const y = 90 - (point.totalTokens / maxValue) * 80;

    return { x, y, value: point.totalTokens, label: point.label };
  });

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
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [dashboardQuota, setDashboardQuota] = useState<UserQuota | null>(
    quota ?? user?.quota ?? null
  );
  const [dashboardSubscription, setDashboardSubscription] = useState<SubscriptionInfo | null>(
    subscription ?? user?.subscription ?? null
  );

  const subscriptionCode = dashboardSubscription?.packageCode.toLowerCase();
  const subscriptionPlanName =
    dashboardSubscription?.packageName || t('dashboard.subscription.free');
  const currentQuota = dashboardQuota ?? quota ?? user?.quota ?? null;
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

    return {
      used,
      total,
      percentage,
      packageRemaining,
      walletTokens: currentQuota?.advanceTokens ?? 0,
      availableTokens: currentQuota?.totalRemainingTokens ?? currentQuota?.remainingTokens ?? 0,
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

  const chartMax = useMemo(
    () => Math.max(1, ...usagePoints.map((point) => point.totalTokens)),
    [usagePoints]
  );
  const lineCoordinates = useMemo(
    () => getLineCoordinates(usagePoints, chartMax),
    [chartMax, usagePoints]
  );
  const linePath = lineCoordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const periodTotal = usagePoints.reduce((sum, point) => sum + point.totalTokens, 0);
  const barWidth = usagePoints.length > 0 ? Math.min(6, (100 / usagePoints.length) * 0.55) : 0;

  useEffect(() => {
    setDashboardQuota(quota ?? user?.quota ?? null);
  }, [quota, user?.quota]);

  useEffect(() => {
    setDashboardSubscription(subscription ?? user?.subscription ?? null);
  }, [subscription, user?.subscription]);

  useEffect(() => {
    let isActive = true;

    const loadDashboardSummary = async () => {
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
              <Typography variant="h5" className="font-bold text-gray-900 dark:text-white">
                {usageData.used.toLocaleString()} / {usageData.total.toLocaleString()}
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.stats.tokensUsed', {
                  remaining: usageData.availableTokens.toLocaleString(),
                })}
              </Typography>
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
                  {t('dashboard.stats.percentUsed', { percent: usageData.percentage })}
                </Typography>
              </Box>
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
            <Typography variant="body2" className="mt-1 text-gray-500 dark:text-slate-400">
              {t('dashboard.tokenUsage.subtitle', {
                total: formatTokens(periodTotal),
              })}
            </Typography>
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

        {usageLoading && (
          <Box className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
            <Typography variant="body2" className="text-gray-500 dark:text-slate-400">
              {t('dashboard.tokenUsage.loading')}
            </Typography>
          </Box>
        )}

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
              <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
              <Typography
                variant="subtitle2"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {t('dashboard.tokenUsage.combinedTitle')}
              </Typography>
            </Box>

            <Box className="overflow-x-auto rounded-lg border border-gray-100 p-4 dark:border-slate-700">
              <Box className="min-w-[620px]">
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="h-64 w-full overflow-visible"
                  role="img"
                  aria-label={t('dashboard.tokenUsage.combinedTitle')}
                >
                  <line
                    x1="0"
                    y1="90"
                    x2="100"
                    y2="90"
                    stroke="currentColor"
                    className="text-gray-200 dark:text-slate-700"
                    strokeWidth="0.5"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="100"
                    y2="50"
                    stroke="currentColor"
                    className="text-gray-100 dark:text-slate-800"
                    strokeWidth="0.5"
                  />
                  <line
                    x1="0"
                    y1="10"
                    x2="100"
                    y2="10"
                    stroke="currentColor"
                    className="text-gray-100 dark:text-slate-800"
                    strokeWidth="0.5"
                  />
                  {usagePoints.map((point, index) => {
                    const height =
                      point.totalTokens === 0 ? 0 : (point.totalTokens / chartMax) * 80;
                    const x = ((index + 0.5) / usagePoints.length) * 100 - barWidth / 2;
                    const y = 90 - height;

                    return (
                      <rect
                        key={point.period}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={height}
                        rx="1"
                        fill="#3B82F6"
                        opacity="0.78"
                        vectorEffect="non-scaling-stroke"
                      >
                        <title>{`${point.label}: ${point.totalTokens.toLocaleString()}`}</title>
                      </rect>
                    );
                  })}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {lineCoordinates.map((point) => (
                    <circle
                      key={`${point.label}-${point.x}`}
                      cx={point.x}
                      cy={point.y}
                      r="1.8"
                      fill="#10B981"
                      vectorEffect="non-scaling-stroke"
                    >
                      <title>{`${point.label}: ${point.value.toLocaleString()}`}</title>
                    </circle>
                  ))}
                </svg>
                <Box className="mt-2 flex justify-between gap-2">
                  {usagePoints.map((point, index) => {
                    const shouldShow =
                      usagePoints.length <= 6 ||
                      index === 0 ||
                      index === usagePoints.length - 1 ||
                      index % Math.ceil(usagePoints.length / 4) === 0;

                    return (
                      <Typography
                        key={point.period}
                        variant="caption"
                        className={`min-w-0 truncate text-gray-500 dark:text-slate-400 ${
                          shouldShow ? '' : 'invisible'
                        }`}
                      >
                        {point.label}
                      </Typography>
                    );
                  })}
                </Box>
                <Box className="mt-4 flex flex-wrap items-center gap-4">
                  <Box className="flex items-center gap-2">
                    <Box className="h-3 w-3 rounded-sm bg-blue-500" />
                    <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                      {t('dashboard.tokenUsage.legend.bar')}
                    </Typography>
                  </Box>
                  <Box className="flex items-center gap-2">
                    <Box className="h-0.5 w-5 rounded-full bg-emerald-500" />
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
