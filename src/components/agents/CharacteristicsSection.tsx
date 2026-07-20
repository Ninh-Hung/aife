/**
 * Characteristics Section Component
 * Tabbed section for selecting and creating characteristics
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Checkbox,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import { Plus, Sparkles } from 'lucide-react';
import { Characteristic } from '../../types';
import { listCharacteristics } from '../../services/api';
import { CreateCharacteristicModal } from './CreateCharacteristicModal';
import { useTranslation } from 'react-i18next';

const LAYER_STYLES: Record<string, string> = {
  identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  tone_style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  values: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  behavior: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  constraints: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  domain: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

// ============================================
// Props Interface
// ============================================

interface CharacteristicsSectionProps {
  selectedCharacteristicIds: string[];
  onCharacteristicToggle: (characteristicId: string) => void;
  onCharacteristicCreated: (characteristic: Characteristic) => void;
}

// ============================================
// CharacteristicsSection Component
// ============================================

export const CharacteristicsSection: React.FC<CharacteristicsSectionProps> = ({
  selectedCharacteristicIds,
  onCharacteristicToggle,
  onCharacteristicCreated,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [systemChars, setSystemChars] = useState<Characteristic[]>([]);
  const [userChars, setUserChars] = useState<Characteristic[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCharacteristics();
  }, []);

  const fetchCharacteristics = async () => {
    setLoading(true);
    setFetchError(null);

    // Fetch both system and user characteristics
    const [systemResponse, userResponse] = await Promise.all([
      listCharacteristics('system'),
      listCharacteristics('user'),
    ]);

    if (systemResponse.success && systemResponse.data) {
      setSystemChars(systemResponse.data);
    }

    if (userResponse.success && userResponse.data) {
      setUserChars(userResponse.data);
    }

    if (!systemResponse.success && !userResponse.success) {
      setFetchError(t('agents.characteristics.errors.loadFailed'));
    }

    setLoading(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const isSelected = (characteristic: Characteristic): boolean => {
    return selectedCharacteristicIds.includes(characteristic.publicId);
  };

  const handleCharacteristicCreated = (characteristic: Characteristic) => {
    setUserChars((prev) => [characteristic, ...prev]);
    onCharacteristicCreated(characteristic);
    setIsModalOpen(false);
  };

  const renderCharacteristicItem = (characteristic: Characteristic) => {
    const selected = isSelected(characteristic);
    const layer = characteristic.layer || 'behavior';

    return (
      <Box
        key={characteristic.publicId}
        onClick={() => onCharacteristicToggle(characteristic.publicId)}
        className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
          selected
            ? 'border-2 border-[#3B82F6] bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
        }`}
      >
        <Box className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            disableRipple
            tabIndex={-1}
            inputProps={{ readOnly: true }}
            className={selected ? 'text-[#3B82F6]' : ''}
            sx={{ mt: -1 }}
          />
          <Box className="flex-1">
            <Box className="flex flex-wrap items-center gap-2">
              <Typography
                variant="subtitle1"
                className={`font-semibold ${
                  selected
                    ? 'text-[#3B82F6] dark:text-blue-400'
                    : 'text-gray-900 dark:text-slate-100'
                }`}
              >
                {characteristic.name}
              </Typography>
              <Chip
                label={t(`agents.characteristics.layers.${layer}`, { defaultValue: layer })}
                size="small"
                className={LAYER_STYLES[layer] || LAYER_STYLES.domain}
              />
              <Chip
                label={
                  characteristic.isSystem
                    ? t('agents.characteristics.system')
                    : t('agents.characteristics.mine')
                }
                size="small"
                className={
                  characteristic.isSystem
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                }
              />
            </Box>
            <Typography variant="caption" className="mt-1 text-gray-500 dark:text-slate-500">
              {t('agents.characteristics.code', { code: characteristic.code })}
            </Typography>
            {(characteristic.description || characteristic.prompt) && (
              <Typography
                variant="body2"
                className="mt-2 text-gray-600 dark:text-slate-400"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {characteristic.description || characteristic.prompt}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box className="flex items-center justify-center py-8">
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error" className="mb-4">
        {fetchError}
      </Alert>
    );
  }

  const currentChars = activeTab === 0 ? systemChars : userChars;

  return (
    <Box className="space-y-4">
      <Box className="mb-4">
        <Typography variant="h6" className="mb-1 font-semibold text-gray-900 dark:text-slate-100">
          {t('agents.characteristics.title')}
        </Typography>
        <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
          {t('agents.characteristics.subtitle')}
        </Typography>
      </Box>

      <Box className="border-b border-gray-200 dark:border-slate-700">
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          className="mb-4"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab
            label={t('agents.characteristics.tabs.system', { count: systemChars.length })}
            icon={<Sparkles size={16} />}
            iconPosition="start"
          />
          <Tab
            label={t('agents.characteristics.tabs.mine', { count: userChars.length })}
            icon={<Plus size={16} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {activeTab === 1 && (
        <Button
          variant="outlined"
          fullWidth
          startIcon={<Plus size={18} />}
          onClick={() => setIsModalOpen(true)}
          className="mb-4 border-dashed border-gray-300 text-gray-700 hover:border-[#3B82F6] hover:text-[#3B82F6] dark:border-slate-600 dark:text-slate-300"
        >
          {t('agents.characteristics.createNew')}
        </Button>
      )}

      <Box className="max-h-[400px] space-y-2 overflow-y-auto">
        {currentChars.map(renderCharacteristicItem)}

        {currentChars.length === 0 && (
          <Box className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <Typography className="text-gray-600 dark:text-slate-400">
              {activeTab === 0
                ? t('agents.characteristics.empty.system')
                : t('agents.characteristics.empty.mine')}
            </Typography>
          </Box>
        )}
      </Box>

      <CreateCharacteristicModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCharacteristicCreated}
      />
    </Box>
  );
};
