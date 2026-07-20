import React from 'react';
import { ButtonGroup, Button, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { APP_LOCALES, type AppLocale } from '../../i18n/types';

interface LanguageSwitchProps {
  compact?: boolean;
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ compact = false }) => {
  const { i18n, t } = useTranslation();
  const currentLocale = i18n.language === 'vi' ? 'vi' : 'en';

  const handleLanguageChange = (locale: AppLocale) => {
    void i18n.changeLanguage(locale);
  };

  return (
    <ButtonGroup
      size="small"
      variant="outlined"
      aria-label={t('language.label')}
      className="bg-white dark:bg-slate-800"
    >
      {APP_LOCALES.map((locale) => (
        <Tooltip key={locale.code} title={t('language.switchTo', { language: locale.label })} arrow>
          <Button
            type="button"
            onClick={() => handleLanguageChange(locale.code)}
            variant={currentLocale === locale.code ? 'contained' : 'outlined'}
            aria-pressed={currentLocale === locale.code}
            className="min-w-0"
            sx={{
              minWidth: compact ? 40 : 48,
              px: compact ? 1 : 1.25,
              textTransform: 'none',
            }}
          >
            {compact ? locale.shortLabel : locale.label}
          </Button>
        </Tooltip>
      ))}
    </ButtonGroup>
  );
};
