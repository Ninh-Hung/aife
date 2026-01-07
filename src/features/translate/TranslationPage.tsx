/**
 * Translation Workspace Page
 * Features: Agent Selection, Source Input, Multi-language Results Grid
 */

import {
  Box,
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { FileText, Mic, Upload } from 'lucide-react';
import React, { useState } from 'react';
import { ResultCard } from '../../components/translate/ResultCard';
import { Agent, Language, SUPPORTED_LANGUAGES, TranslationResult } from '../../types';

// ============================================
// Props Interface
// ============================================

interface TranslationPageProps {
  agents: Agent[];
  onCreateAgent?: () => void;
  selectedAgentId?: string;
}

// ============================================
// TranslationPage Component
// ============================================

export const TranslationPage: React.FC<TranslationPageProps> = ({
  agents,
  onCreateAgent: _onCreateAgent,
  selectedAgentId: propSelectedAgentId,
}) => {
  const [selectedAgentId] = useState<string>(
    propSelectedAgentId || agents.find((a) => a.isDefault)?.id || agents[0]?.id || ''
  );
  const [sourceText, setSourceText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<Language | null>(null);
  const [targetLanguages] = useState<Language[]>([
    SUPPORTED_LANGUAGES[0], // English
    SUPPORTED_LANGUAGES[9], // Vietnamese
    SUPPORTED_LANGUAGES[8], // Korean
  ]);
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto');

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // ============================================
  // Handlers
  // ============================================

  const handleSourceTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setSourceText(text);

    // Simple language detection (in production, use a real API)
    if (text.trim()) {
      // Mock detection - defaults to English
      setDetectedLanguage(SUPPORTED_LANGUAGES[0]);
    } else {
      setDetectedLanguage(null);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim() || !selectedAgent) return;

    setIsTranslating(true);

    // Create initial pending results
    const newResults: TranslationResult[] = targetLanguages.map((lang, index) => ({
      id: `result-${Date.now()}-${index}`,
      targetLanguage: lang,
      translatedText: '',
      sourceText,
      sourceLanguage: detectedLanguage || SUPPORTED_LANGUAGES[0],
      agentId: selectedAgentId,
      status: 'processing' as const,
      createdAt: new Date(),
    }));

    setResults(newResults);

    // Simulate translation API calls (replace with actual API)
    try {
      const translatedResults = await Promise.all(
        newResults.map(async (result) => {
          // Simulate API delay
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

          // Mock translation (in production, call actual translation API)
          return {
            ...result,
            translatedText: `[${result.targetLanguage.name}] ${sourceText}`,
            status: 'completed' as const,
          };
        })
      );

      setResults(translatedResults);
    } catch (error) {
      console.error('Translation failed:', error);
      setResults((prev) => prev.map((r) => ({ ...r, status: 'failed' as const })));
    } finally {
      setIsTranslating(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <Box className="flex min-h-screen flex-col bg-gray-50 dark:bg-slate-900">
      {/* Main Content: Two Columns */}
      <Box className="flex flex-1 gap-6 px-8 py-6">
        {/* Left Column: Source Text Input */}
        <Box className="w-[45%]">
          <Box className="flex h-full flex-col rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {/* Source Text Header */}
            <Box className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-700">
              <Typography
                variant="subtitle1"
                className="font-semibold text-gray-900 dark:text-white"
              >
                Source Text
              </Typography>
              <Box className="flex items-center gap-2">
                <FormControl size="small" className="min-w-[140px]">
                  <Select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="bg-gray-100 text-sm text-gray-900 dark:bg-slate-700 dark:text-white"
                    displayEmpty
                  >
                    <MenuItem value="auto">Auto Detect</MenuItem>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <MenuItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  className="text-blue-600 hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-slate-700"
                >
                  <Mic size={20} />
                </IconButton>
              </Box>
            </Box>

            {/* Text Area */}
            <Box className="flex-1 p-4">
              <TextField
                multiline
                fullWidth
                placeholder="Enter your text to translate..."
                value={sourceText}
                onChange={handleSourceTextChange}
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  className: 'text-gray-900 dark:text-slate-300',
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    height: '100%',
                    alignItems: 'flex-start',
                  },
                  '& textarea': {
                    height: '100% !important',
                    overflow: 'auto !important',
                  },
                }}
              />
            </Box>

            {/* Bottom Actions */}
            <Box className="border-t border-gray-200 px-4 py-3 dark:border-slate-700">
              <Box className="mb-3 flex items-center justify-between">
                <Box className="flex gap-2">
                  <Button
                    size="small"
                    startIcon={<Upload size={16} />}
                    className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    Upload File
                  </Button>
                  <Button
                    size="small"
                    startIcon={<FileText size={16} />}
                    className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                  >
                    Paste
                  </Button>
                </Box>
                <Typography variant="caption" className="text-gray-500 dark:text-slate-500">
                  {sourceText.length} / 5000 characters
                </Typography>
              </Box>
              <Button
                variant="contained"
                fullWidth
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isTranslating}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                size="large"
              >
                {isTranslating ? 'Translating...' : 'Translate'}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Right Column: Translations Stacked */}
        <Box className="flex-1 overflow-y-auto">
          <Box className="space-y-4">
            {results.length === 0 ? (
              <Box className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
                <Typography variant="body1" className="text-gray-500 dark:text-slate-500">
                  Translation will appear here...
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
