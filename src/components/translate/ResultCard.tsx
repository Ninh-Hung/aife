/**
 * Translation Result Card Component
 * Displays a single language translation result with copy functionality
 */

import React, { useState } from 'react';
import { Typography, IconButton, Box, Tooltip, CircularProgress } from '@mui/material';
import { Copy, Check, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TranslationResult } from '../../types';

// ============================================
// Props Interface
// ============================================

interface ResultCardProps {
  result: TranslationResult;
}

// ============================================
// ResultCard Component
// ============================================

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleSpeak = () => {
    // Text-to-speech functionality
    if ('speechSynthesis' in window && result.translatedText) {
      const utterance = new SpeechSynthesisUtterance(result.translatedText);
      utterance.lang = result.targetLanguage.code;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Get language code for flag badge
  const getLanguageCode = () => {
    const code = result.targetLanguage.code.split('-')[0].toUpperCase();
    return code.length === 2 ? code : code.substring(0, 2);
  };

  return (
    <Box className="rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Language Header */}
      <Box className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
        <Box className="flex items-center gap-3">
          {/* Language Flag Badge */}
          <Box
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              background:
                result.targetLanguage.code === 'en'
                  ? '#EF4444'
                  : result.targetLanguage.code === 'vi'
                    ? '#F97316'
                    : result.targetLanguage.code === 'ko'
                      ? '#EC4899'
                      : '#3B82F6',
            }}
          >
            <span className="text-white">{getLanguageCode()}</span>
          </Box>
          <Typography variant="subtitle1" className="font-medium text-gray-900 dark:text-white">
            {result.targetLanguage.name}
          </Typography>
        </Box>

        {/* Action Buttons */}
        {result.status === 'completed' && (
          <Box className="flex items-center gap-1">
            <Tooltip title={t('translate.result.copy')}>
              <IconButton
                onClick={handleCopy}
                size="small"
                className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                sx={{ minWidth: 44, minHeight: 44 }} // Touch target optimization
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </IconButton>
            </Tooltip>
            <Tooltip title={t('translate.result.listen')}>
              <IconButton
                onClick={handleSpeak}
                size="small"
                className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                sx={{ minWidth: 44, minHeight: 44 }} // Touch target optimization
              >
                <Volume2 size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Translation Content */}
      <Box className="min-h-[100px] p-4">
        {result.status === 'processing' && (
          <Box className="flex h-full items-center justify-center py-6">
            <CircularProgress size={28} className="text-blue-600 dark:text-blue-400" />
          </Box>
        )}

        {result.status === 'completed' && (
          <Typography variant="body1" className="leading-relaxed text-gray-900 dark:text-slate-300">
            {result.translatedText}
          </Typography>
        )}

        {result.status === 'failed' && (
          <Typography variant="body2" className="text-red-500 dark:text-red-400">
            {t('translate.result.failed')}
          </Typography>
        )}

        {result.status === 'pending' && (
          <Typography variant="body2" className="text-gray-500 dark:text-slate-500">
            {t('translate.result.pending')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
