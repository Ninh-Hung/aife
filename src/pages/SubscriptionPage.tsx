/**
 * SubscriptionPage Component
 * Main container for subscription management, plan comparison, and billing history
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { PlanCard } from '../components/subscription/PlanCard';
import { BillingHistory } from '../components/subscription/BillingHistory';
import {
  getPackages,
  getCurrentSubscription,
  getBillingHistory,
  cancelSubscription,
  upgradeSubscription,
} from '../services/api';
import type { Package, CurrentSubscription, BillingHistoryItem } from '../types';
import { useNotification } from '../hooks/useNotification';

export const SubscriptionPage: React.FC = () => {
  const { success, error } = useNotification();
  // State management
  const [packages, setPackages] = useState<Package[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    setLoading(true);

    try {
      // Fetch all data in parallel
      const [packagesRes, subscriptionRes, historyRes] = await Promise.all([
        getPackages(),
        getCurrentSubscription(),
        getBillingHistory(),
      ]);

      // Handle packages
      if (packagesRes.success && packagesRes.data) {
        setPackages(packagesRes.data);
      } else {
        throw new Error(packagesRes.error || 'Failed to load packages');
      }

      // Handle subscription (might not exist for new users)
      if (subscriptionRes.success && subscriptionRes.data) {
        setCurrentSubscription(subscriptionRes.data);
      }

      // Handle billing history (might be empty)
      if (historyRes.success && historyRes.data) {
        setBillingHistory(historyRes.data);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    setActionLoading(true);
    setCancelDialogOpen(false);

    try {
      const result = await cancelSubscription();

      if (result.success) {
        success('Subscription cancelled successfully');
        // Refresh data
        await fetchAllData();
      } else {
        error(result.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle upgrade subscription
  const handleUpgradeSubscription = async (packageId: string) => {
    setActionLoading(true);

    try {
      const result = await upgradeSubscription(packageId);

      if (result.success) {
        success('Subscription upgraded successfully');
        // Refresh data
        await fetchAllData();
      } else {
        error(result.error || 'Failed to upgrade subscription');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to upgrade subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Show cancel confirmation dialog
  const showCancelDialog = () => {
    setCancelDialogOpen(true);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-8">
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={300} height={24} />
        </div>
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={400} className="rounded-lg" />
          ))}
        </div>
        <Skeleton variant="rectangular" height={300} className="rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      {/* Loading Overlay */}
      {actionLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-slate-800">
            <CircularProgress />
            <p className="mt-4 text-gray-900 dark:text-slate-100">Processing...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-slate-100">
          Choose Your Plan
        </h1>
        <p className="text-gray-600 dark:text-slate-400">Select the perfect plan for your needs</p>
      </div>

      {/* Plan Cards Grid */}
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <PlanCard
            key={pkg.publicId}
            package={pkg}
            isCurrentPlan={currentSubscription?.packageId === pkg.publicId}
            onUpgrade={handleUpgradeSubscription}
            onCancel={showCancelDialog}
          />
        ))}
      </div>

      {/* Billing History Section */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
          Billing History
        </h2>
        <BillingHistory history={billingHistory} />
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your subscription? You will lose access to premium
            features at the end of your billing period.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} color="inherit">
            Keep Subscription
          </Button>
          <Button onClick={handleCancelSubscription} color="error" variant="contained">
            Cancel Subscription
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
