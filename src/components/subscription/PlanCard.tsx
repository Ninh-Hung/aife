/**
 * PlanCard Component
 * Displays a subscription plan with dynamic styling based on metadata
 */

import React from 'react';
import {
  Zap,
  Crown,
  Shield,
  CheckCircle2,
  LucideIcon,
  Sparkles,
  Star,
  Rocket,
  Award,
} from 'lucide-react';
import { Package, PackageMetadata } from '../../types';
import { Button } from '@mui/material';

interface PlanCardProps {
  package: Package;
  isCurrentPlan: boolean;
  onUpgrade: (packageId: string) => void;
  onCancel: () => void;
}

// Map icon name strings to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Zap,
  Crown,
  Shield,
  Sparkles,
  Star,
  Rocket,
  Award,
  CheckCircle2,
};

export const PlanCard: React.FC<PlanCardProps> = ({
  package: pkg,
  isCurrentPlan,
  onUpgrade,
  onCancel,
}) => {
  // Parse metadata
  const metadata: PackageMetadata = React.useMemo(() => {
    try {
      return JSON.parse(pkg.metadata) as PackageMetadata;
    } catch {
      return { color: '#3B82F6', icon: 'Zap' };
    }
  }, [pkg.metadata]);

  const IconComponent = iconMap[metadata.icon] || Zap;
  const accentColor = metadata.color || '#3B82F6';

  return (
    <div
      className={`
        relative rounded-lg border-2 bg-white p-6 transition-all
        duration-200 hover:shadow-lg dark:bg-slate-800
        ${
          isCurrentPlan
            ? 'shadow-md'
            : 'border-gray-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-600'
        }
      `}
      style={{
        borderColor: isCurrentPlan ? accentColor : undefined,
        borderTopWidth: isCurrentPlan ? '4px' : undefined,
      }}
    >
      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          Current Plan
        </div>
      )}

      {/* Icon and Name */}
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg p-3" style={{ backgroundColor: `${accentColor}20` }}>
          <IconComponent size={28} style={{ color: accentColor }} className="stroke-current" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{pkg.name}</h3>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">${pkg.price}</span>
          <span className="text-gray-500 dark:text-slate-400">/{pkg.duration}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="mb-6 space-y-3">
        {pkg.features.map((feature, index) => {
          const FeatureIcon = iconMap[feature.icon] || CheckCircle2;
          return (
            <li key={index} className="flex items-start gap-3">
              <FeatureIcon
                size={20}
                className="mt-0.5 flex-shrink-0 text-green-500 dark:text-green-400"
              />
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-slate-100">
                  {feature.quota}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  {feature.description}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Action Button */}
      {isCurrentPlan ? (
        <Button
          variant="text"
          onClick={onCancel}
          fullWidth
          className="normal-case"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          Cancel Subscription
        </Button>
      ) : (
        <Button
          variant="contained"
          onClick={() => onUpgrade(pkg.publicId)}
          fullWidth
          className="normal-case"
          sx={{
            backgroundColor: accentColor,
            color: '#fff',
            '&:hover': {
              backgroundColor: accentColor,
              opacity: 0.9,
            },
          }}
        >
          Upgrade Plan
        </Button>
      )}
    </div>
  );
};
