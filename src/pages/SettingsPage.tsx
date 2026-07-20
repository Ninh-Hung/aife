import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '../components/layout/LanguageSwitch';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();

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
        className="max-w-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
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
    </div>
  );
};
