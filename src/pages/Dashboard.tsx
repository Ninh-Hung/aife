/**
 * Dashboard Page Component
 * Features: Stats Overview with Total Agents, Subscription Plan, Usage Quota
 */

import React from 'react';
import { Box, Card, Typography, LinearProgress, Chip } from '@mui/material';
import { Users, CreditCard, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAgents } from '../contexts/AgentsContext';

// ============================================
// Dashboard Component
// ============================================

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { agents } = useAgents();
  const subscriptionCode = user?.subscription?.packageCode.toLowerCase();
  const subscriptionPlanName = user?.subscription?.packageName || t('dashboard.subscription.free');

  // Mock usage data (in production, this would come from API)
  const usageData = {
    used: 8450,
    total: 10000,
    percentage: 84.5,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <Box className="mb-6 md:mb-8">
        <Typography
          variant="h4"
          className="font-bold text-gray-900 dark:text-white"
          sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          {t('dashboard.welcome', { name: user?.userName || t('dashboard.userFallback') })}
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
                {agents.length}
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
                {t('dashboard.stats.charactersUsed')}
              </Typography>
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

      {/* Additional Content Section */}
      <Box className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        {/* Recent Activity Card */}
        <Card
          className="border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Typography variant="h6" className="mb-4 font-semibold text-gray-900 dark:text-white">
            {t('dashboard.recentActivity.title')}
          </Typography>
          <Box className="space-y-3">
            {agents.slice(0, 5).map((agent) => (
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
            {agents.length === 0 && (
              <Box className="py-8 text-center">
                <Typography variant="body2" className="text-gray-500 dark:text-slate-400">
                  {t('dashboard.recentActivity.empty')}
                </Typography>
              </Box>
            )}
          </Box>
        </Card>

        {/* Quick Actions Card */}
        <Card
          className="border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          elevation={0}
        >
          <Typography variant="h6" className="mb-4 font-semibold text-gray-900 dark:text-white">
            {t('dashboard.quickActions.title')}
          </Typography>
          <Box className="space-y-3">
            <Box className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
              <Typography variant="body1" className="font-medium text-gray-900 dark:text-white">
                {t('dashboard.quickActions.createAgent.title')}
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.quickActions.createAgent.description')}
              </Typography>
            </Box>
            <Box className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
              <Typography variant="body1" className="font-medium text-gray-900 dark:text-white">
                {t('dashboard.quickActions.upgradePlan.title')}
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.quickActions.upgradePlan.description')}
              </Typography>
            </Box>
            <Box className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
              <Typography variant="body1" className="font-medium text-gray-900 dark:text-white">
                {t('dashboard.quickActions.usageHistory.title')}
              </Typography>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                {t('dashboard.quickActions.usageHistory.description')}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>
    </div>
  );
};
