/**
 * Translation Workspace Page
 * Features: source text input, target language selection, multi-language results.
 */

import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChevronDown, FileText, Languages, Mic, Upload } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResultCard } from '../../components/translate/ResultCard';
import { getSupportedLanguages, translateText } from '../../services/api';
import { Agent, Language, SUPPORTED_LANGUAGES, TranslationResult } from '../../types';

interface TranslationPageProps {
  agents: Agent[];
  onCreateAgent?: () => void;
  selectedAgentId?: string;
}

export const TranslationPage: React.FC<TranslationPageProps> = ({
  agents,
  onCreateAgent: _onCreateAgent,
  selectedAgentId: propSelectedAgentId,
}) => {
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    propSelectedAgentId || agents.find((agent) => agent.isDefault)?.id || agents[0]?.id || ''
  );
  const [sourceText, setSourceText] = useState('');
  const [selectedTargetCodes, setSelectedTargetCodes] = useState<string[]>(['en', 'vi', 'ko']);
  const [supportedLanguages, setSupportedLanguages] = useState<Language[]>(SUPPORTED_LANGUAGES);
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const selectedTargets = useMemo(
    () => supportedLanguages.filter((language) => selectedTargetCodes.includes(language.code)),
    [selectedTargetCodes, supportedLanguages]
  );

  useEffect(() => {
    const defaultAgentId =
      propSelectedAgentId || agents.find((agent) => agent.isDefault)?.id || agents[0]?.id || '';

    setSelectedAgentId((currentAgentId) => {
      if (currentAgentId && agents.some((agent) => agent.id === currentAgentId)) {
        return currentAgentId;
      }

      return defaultAgentId;
    });
  }, [agents, propSelectedAgentId]);

  const findLanguage = (code: string): Language =>
    supportedLanguages.find((language) => language.code === code) || {
      code,
      name: code.toUpperCase(),
      nativeName: code.toUpperCase(),
    };

  useEffect(() => {
    let isMounted = true;

    const loadSupportedLanguages = async () => {
      const response = await getSupportedLanguages();
      if (isMounted && response.success && response.data && response.data.length > 0) {
        setSupportedLanguages(response.data);
      }
    };

    void loadSupportedLanguages();

    return () => {
      isMounted = false;
    };
  }, []);

  const getFlagUrl = (language: Language) =>
    language.flagUrl ||
    (language.countryCode ? `https://flagcdn.com/24x18/${language.countryCode}.png` : null);

  const renderLanguageLabel = (language: Language) => {
    const flagUrl = getFlagUrl(language);

    return (
      <Box className="flex min-w-0 items-center gap-2">
        {flagUrl ? (
          <Box
            component="img"
            src={flagUrl}
            alt=""
            className="h-[18px] w-[18px] rounded-full object-cover"
            loading="lazy"
          />
        ) : (
          <Box className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-700 dark:bg-slate-600 dark:text-slate-100">
            {language.code.toUpperCase()}
          </Box>
        )}
        <Box className="min-w-0">
          <Typography variant="body2" className="truncate text-gray-900 dark:text-white">
            {language.name}
          </Typography>
          <Typography
            variant="caption"
            className="block truncate text-gray-500 dark:text-slate-400"
          >
            {language.nativeName}
          </Typography>
        </Box>
      </Box>
    );
  };

  const toggleTargetLanguage = (code: string) => {
    setSelectedTargetCodes((current) => {
      if (current.includes(code)) {
        return current.filter((item) => item !== code);
      }
      return [...current, code];
    });
  };

  const buildPendingResults = (): TranslationResult[] =>
    selectedTargets.map((language) => ({
      id: `result-${Date.now()}-${language.code}`,
      targetLanguage: language,
      translatedText: '',
      sourceText,
      sourceLanguage: findLanguage('en'),
      agentId: selectedAgentId,
      status: 'processing',
      createdAt: new Date(),
    }));

  const handleTranslate = async () => {
    const text = sourceText.trim();
    if (!text || selectedTargets.length === 0) return;

    setIsTranslating(true);
    setErrorMessage(null);
    setResults(buildPendingResults());

    const response = await translateText({
      text,
      targetLang: selectedTargets.map((language) => language.code),
      agentPublicId: selectedAgent?.publicId,
    });

    if (!response.success || !response.data) {
      setErrorMessage(response.error || t('translate.errors.failed'));
      setResults((current) => current.map((result) => ({ ...result, status: 'failed' })));
      setIsTranslating(false);
      return;
    }

    const translatedResults: TranslationResult[] = response.data.translations.map(
      (translation) => ({
        id: `${response.data?.requestId}-${translation.lang}`,
        targetLanguage: findLanguage(translation.lang),
        translatedText: translation.text,
        sourceText: response.data?.source.text || text,
        sourceLanguage:
          response.data?.source.lang && response.data.source.lang !== 'auto'
            ? findLanguage(response.data.source.lang)
            : findLanguage('en'),
        agentId: selectedAgentId,
        status: translation.status === 'failed' ? 'failed' : 'completed',
        createdAt: new Date(),
      })
    );

    setResults(translatedResults);
    setIsTranslating(false);
  };

  return (
    <Box className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50 dark:bg-slate-900">
      <Box className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-6 px-6 py-6 lg:grid-cols-2 lg:grid-rows-1">
        <Box className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Box className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-700">
            <Box className="flex items-center gap-2">
              <Languages size={20} className="text-blue-600 dark:text-blue-400" />
              <Typography
                variant="subtitle1"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {t('translate.source.title')}
              </Typography>
            </Box>

            {agents.length > 0 && (
              <Select
                size="small"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="min-w-[180px] bg-gray-100 text-sm text-gray-900 dark:bg-slate-700 dark:text-white"
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </Box>

          <Box className="min-h-0 flex-1 overflow-hidden p-4">
            <TextField
              multiline
              fullWidth
              placeholder={t('translate.source.placeholder')}
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                className: 'text-gray-900 dark:text-slate-300',
              }}
              sx={{
                height: '100%',
                '& .MuiInputBase-root': {
                  height: '100%',
                  minHeight: 0,
                  alignItems: 'flex-start',
                },
                '& textarea': {
                  height: '100% !important',
                  overflow: 'auto !important',
                },
              }}
            />
          </Box>

          <Box className="shrink-0 border-t border-gray-200 px-4 py-3 dark:border-slate-700">
            <Box className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <Box className="flex gap-2">
                <Button size="small" startIcon={<Upload size={16} />} disabled>
                  {t('translate.source.uploadFile')}
                </Button>
                <Tooltip title={t('translate.source.voiceInput')}>
                  <span>
                    <IconButton
                      size="small"
                      disabled
                      className="text-blue-600 hover:bg-gray-100 disabled:text-gray-400 dark:text-blue-400 dark:hover:bg-slate-700 dark:disabled:text-slate-500"
                    >
                      <Mic size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button size="small" startIcon={<FileText size={16} />} disabled>
                  {t('translate.source.paste')}
                </Button>
              </Box>
              <Typography variant="caption" className="text-gray-500 dark:text-slate-500">
                {t('translate.source.characterCount', { count: sourceText.length, limit: 5000 })}
              </Typography>
            </Box>
            <Button
              variant="contained"
              fullWidth
              onClick={handleTranslate}
              disabled={!sourceText.trim() || selectedTargets.length === 0 || isTranslating}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
              size="large"
            >
              {isTranslating
                ? t('translate.actions.translating')
                : t('translate.actions.translate')}
            </Button>
          </Box>
        </Box>

        <Box className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <Box className="flex min-h-[57px] shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
            <Box className="flex min-w-0 items-center gap-2">
              <Languages size={20} className="text-blue-600 dark:text-blue-400" />
              <Typography
                variant="subtitle1"
                className="font-semibold text-gray-900 dark:text-white"
              >
                {t('translate.response.title')}
              </Typography>
            </Box>
          </Box>

          <Accordion
            disableGutters
            className="shrink-0 border-b border-gray-200 bg-white shadow-none before:hidden dark:border-slate-700 dark:bg-slate-800"
          >
            <AccordionSummary
              expandIcon={<ChevronDown size={18} />}
              className="min-h-[56px] border-b border-gray-200 px-4 dark:border-slate-700"
            >
              <Box className="min-w-0">
                <Typography
                  variant="subtitle1"
                  className="font-semibold text-gray-900 dark:text-white"
                >
                  {t('translate.targets.title')}
                </Typography>
                <Typography variant="caption" className="text-gray-500 dark:text-slate-400">
                  {t('translate.targets.selected', { count: selectedTargets.length })}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails className="px-4 py-3">
              <Box className="mb-3 flex flex-wrap gap-2">
                {selectedTargets.map((language) => {
                  const flagUrl = getFlagUrl(language);
                  return (
                    <Chip
                      key={language.code}
                      size="small"
                      label={language.name}
                      avatar={
                        flagUrl ? (
                          <Box
                            component="img"
                            src={flagUrl}
                            alt=""
                            className="h-[18px] w-[18px] rounded-full object-cover"
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </Box>
              <Box className="max-h-[260px] overflow-y-auto">
                {supportedLanguages.map((language) => (
                  <FormControlLabel
                    key={language.code}
                    className="m-0 flex w-full rounded px-1 py-1 hover:bg-gray-50 dark:hover:bg-slate-700"
                    control={
                      <Checkbox
                        checked={selectedTargetCodes.includes(language.code)}
                        onChange={() => toggleTargetLanguage(language.code)}
                      />
                    }
                    label={renderLanguageLabel(language)}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Box className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {results.length === 0 ? (
              <Box className="flex h-full min-h-[240px] items-center justify-center text-center">
                <Typography variant="body2" className="text-gray-500 dark:text-slate-500">
                  {t('translate.response.empty')}
                </Typography>
              </Box>
            ) : (
              results.map((result) => <ResultCard key={result.id} result={result} />)
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
