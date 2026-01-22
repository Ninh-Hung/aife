/**
 * Capabilities Section Component
 * Multi-select list for choosing agent capabilities
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Zap } from 'lucide-react';
import { Capability } from '../../types';
import { listCapabilities } from '../../services/api';

// ============================================
// Props Interface
// ============================================

interface CapabilitiesSectionProps {
  selectedCapabilityIds: number[];
  onCapabilityToggle: (capabilityId: number) => void;
  error?: string;
}

// ============================================
// CapabilitiesSection Component
// ============================================

export const CapabilitiesSection: React.FC<CapabilitiesSectionProps> = ({
  selectedCapabilityIds,
  onCapabilityToggle,
  error,
}) => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapabilities();
  }, []);

  const fetchCapabilities = async () => {
    setLoading(true);
    setFetchError(null);

    const response = await listCapabilities();

    if (response.success && response.data) {
      setCapabilities(response.data);
    } else {
      setFetchError(response.error || 'Failed to load capabilities');
    }

    setLoading(false);
  };

  const isSelected = (capability: Capability): boolean => {
    // Match by publicId since that's what we store
    return selectedCapabilityIds.includes(parseInt(capability.publicId));
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

  return (
    <Box className="space-y-4">
      <Box className="mb-4">
        <Typography variant="h6" className="mb-1 font-semibold text-gray-900 dark:text-slate-100">
          Capabilities
        </Typography>
        <Typography variant="body2" className="text-gray-600 dark:text-slate-400">
          Select at least one capability to define what your agent can do
        </Typography>
        {error && (
          <Typography variant="caption" className="mt-1 text-red-600 dark:text-red-400">
            {error}
          </Typography>
        )}
      </Box>

      <Box className="grid grid-cols-1 gap-3">
        {capabilities.map((capability) => {
          const selected = isSelected(capability);

          return (
            <Card
              key={capability.publicId}
              onClick={() => onCapabilityToggle(parseInt(capability.publicId))}
              className={`cursor-pointer transition-all duration-200 ${
                selected
                  ? 'border-2 border-[#3B82F6] bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
              }`}
              sx={{ boxShadow: selected ? 2 : 0 }}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Checkbox
                  checked={selected}
                  className={selected ? 'text-[#3B82F6]' : ''}
                  sx={{ mt: -1 }}
                />
                <Box className="flex-1">
                  <Box className="flex items-center gap-2">
                    <Zap
                      size={18}
                      className={
                        selected ? 'text-[#3B82F6]' : 'text-gray-500 dark:text-slate-400'
                      }
                    />
                    <Typography
                      variant="subtitle1"
                      className={`font-semibold ${
                        selected
                          ? 'text-[#3B82F6] dark:text-blue-400'
                          : 'text-gray-900 dark:text-slate-100'
                      }`}
                    >
                      {capability.name}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    className="mt-1 text-gray-600 dark:text-slate-400"
                  >
                    {capability.description}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {capabilities.length === 0 && (
        <Box className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Typography className="text-gray-600 dark:text-slate-400">
            No capabilities available
          </Typography>
        </Box>
      )}
    </Box>
  );
};
