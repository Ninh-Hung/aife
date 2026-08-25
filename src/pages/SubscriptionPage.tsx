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
  subscribe,
  getTokenPacks,
  purchaseTokenPack,
} from '../services/api';
import type {
  Package,
  CurrentSubscription,
  BillingHistoryItem,
  AdvanceTokenPurchaseLimits,
  TokenPack,
  TokenPackPrice,
} from '../types';
import { useNotification } from '../hooks/useNotification';

type SelectedTokenPackPurchase = {
  tokenPack: TokenPack;
  price: TokenPackPrice;
};

export const SubscriptionPage: React.FC = () => {
  const { success, error } = useNotification();
  // State management
  const [packages, setPackages] = useState<Package[]>([]);
  const [tokenPacks, setTokenPacks] = useState<TokenPack[]>([]);
  const [purchaseLimits, setPurchaseLimits] = useState<AdvanceTokenPurchaseLimits | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTokenPackPurchase, setSelectedTokenPackPurchase] =
    useState<SelectedTokenPackPurchase | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const currentPackageCode = currentSubscription?.package?.code?.toUpperCase();

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    setLoading(true);

    try {
      // Fetch all data in parallel
      const [packagesRes, subscriptionRes, historyRes, tokenPacksRes] = await Promise.all([
        getPackages(),
        getCurrentSubscription(),
        getBillingHistory(),
        getTokenPacks(),
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
        setBillingHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      }

      if (tokenPacksRes.success && tokenPacksRes.data) {
        setTokenPacks(tokenPacksRes.data.tokenPacks);
        setPurchaseLimits(tokenPacksRes.data.purchaseLimits ?? null);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!currentSubscription?.publicId || currentPackageCode === 'FREE') {
      error('Free plan cannot be cancelled.');
      setCancelDialogOpen(false);
      return;
    }

    setActionLoading(true);
    setCancelDialogOpen(false);

    try {
      const result = await cancelSubscription(currentSubscription.publicId);

      if (result.success) {
        success('Subscription cancelled. You are now on FREE and can keep using wallet tokens.');
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

  // Handle subscribe (create/upgrade/downgrade)
  const handleSubscribe = async (packageId: string) => {
    setActionLoading(true);

    try {
      const result = await subscribe(packageId);

      if (result.success) {
        success('Subscription updated successfully');
        // Refresh data
        await fetchAllData();
      } else {
        error(result.error || 'Failed to update subscription');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurchaseTokenPack = async () => {
    if (!selectedTokenPackPurchase) {
      return;
    }

    const { tokenPack, price } = selectedTokenPackPurchase;

    setActionLoading(true);
    setSelectedTokenPackPurchase(null);

    try {
      const result = await purchaseTokenPack(tokenPack.publicId, price.currency);

      if (result.success) {
        success('Advance tokens added successfully');
        await fetchAllData();
      } else {
        error(result.error || 'Failed to purchase token pack');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to purchase token pack');
    } finally {
      setActionLoading(false);
    }
  };

  const showPurchaseDialog = (tokenPack: TokenPack, price: TokenPackPrice) => {
    const purchaseBlock = getPurchaseBlock(tokenPack.tokenAmount);

    if (purchaseBlock.blocked) {
      error(purchaseBlock.message || 'This token pack exceeds your purchase limit.');
      return;
    }

    setSelectedTokenPackPurchase({ tokenPack, price });
  };

  const closePurchaseDialog = () => {
    setSelectedTokenPackPurchase(null);
  };

  // Show cancel confirmation dialog
  const showCancelDialog = () => {
    setCancelDialogOpen(true);
  };

  const formatTokenPackPrice = (amountMinor: string | number, currency: string) => {
    const value = Number(amountMinor);
    const displayValue = currency === 'USD' ? value / 100 : value;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(displayValue);
  };

  const getTokenPackPrices = (tokenPack: TokenPack): TokenPackPrice[] =>
    tokenPack.prices && tokenPack.prices.length > 0
      ? tokenPack.prices
      : [
          {
            publicId: `${tokenPack.publicId}_legacy_price`,
            currency: tokenPack.currency,
            amountMinor: Math.round(
              tokenPack.currency === 'USD' ? tokenPack.price * 100 : tokenPack.price
            ).toString(),
            isActive: true,
          },
        ];

  const formatTokenAmount = (amount: number) => `${amount.toLocaleString()} tokens`;

  const getPurchaseBlock = (tokenAmount: number): { blocked: boolean; message?: string } => {
    if (
      purchaseLimits?.dailyRemainingTokens !== null &&
      purchaseLimits?.dailyRemainingTokens !== undefined &&
      tokenAmount > purchaseLimits.dailyRemainingTokens
    ) {
      return {
        blocked: true,
        message: `Daily purchase limit reached. Remaining today: ${formatTokenAmount(
          purchaseLimits.dailyRemainingTokens
        )}.`,
      };
    }

    if (
      purchaseLimits?.monthlyRemainingTokens !== null &&
      purchaseLimits?.monthlyRemainingTokens !== undefined &&
      tokenAmount > purchaseLimits.monthlyRemainingTokens
    ) {
      return {
        blocked: true,
        message: `Monthly purchase limit reached. Remaining this month: ${formatTokenAmount(
          purchaseLimits.monthlyRemainingTokens
        )}.`,
      };
    }

    return { blocked: false };
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
            isCurrentPlan={currentSubscription?.package?.publicId === pkg.publicId}
            onUpgrade={handleSubscribe}
            onCancel={showCancelDialog}
          />
        ))}
      </div>

      {tokenPacks.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-slate-100">
            Advance Tokens
          </h2>
          {purchaseLimits && (
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Daily remaining: </span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {purchaseLimits.dailyRemainingTokens === null
                    ? 'Unlimited'
                    : formatTokenAmount(purchaseLimits.dailyRemainingTokens)}
                </span>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Monthly remaining: </span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {purchaseLimits.monthlyRemainingTokens === null
                    ? 'Unlimited'
                    : formatTokenAmount(purchaseLimits.monthlyRemainingTokens)}
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tokenPacks.map((tokenPack) => {
              const purchaseBlock = getPurchaseBlock(tokenPack.tokenAmount);

              return (
                <div
                  key={tokenPack.publicId}
                  className="rounded-lg border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {tokenPack.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {formatTokenAmount(tokenPack.tokenAmount)}
                    </p>
                  </div>
                  <div className="mb-4 space-y-2">
                    {getTokenPackPrices(tokenPack).map((price) => (
                      <div
                        key={price.publicId}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-slate-700/50"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                          {price.currency}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {formatTokenPackPrice(price.amountMinor, price.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {purchaseBlock.message && (
                    <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                      {purchaseBlock.message}
                    </div>
                  )}
                  <div className="space-y-2">
                    {getTokenPackPrices(tokenPack).map((price) => (
                      <Button
                        key={price.publicId}
                        variant="outlined"
                        fullWidth
                        disabled={purchaseBlock.blocked}
                        onClick={() => showPurchaseDialog(tokenPack, price)}
                      >
                        Buy with {price.currency}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            Are you sure you want to cancel your subscription? Unused package tokens will move to
            your wallet, and your active package will switch to FREE.
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

      {/* Token Pack Purchase Confirmation Dialog */}
      <Dialog
        open={Boolean(selectedTokenPackPurchase)}
        onClose={closePurchaseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Token Purchase</DialogTitle>
        <DialogContent>
          {selectedTokenPackPurchase && (
            <div className="space-y-4">
              <DialogContentText>
                Please confirm the token pack purchase before continuing.
              </DialogContentText>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">
                  {selectedTokenPackPurchase.tokenPack.name}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-600 dark:text-slate-400">Tokens received</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {selectedTokenPackPurchase.tokenPack.tokenAmount.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-600 dark:text-slate-400">Amount</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {formatTokenPackPrice(
                        selectedTokenPackPurchase.price.amountMinor,
                        selectedTokenPackPurchase.price.currency
                      )}
                    </span>
                  </div>
                  {purchaseLimits && (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600 dark:text-slate-400">
                          Daily remaining after purchase
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          {purchaseLimits.dailyRemainingTokens === null
                            ? 'Unlimited'
                            : formatTokenAmount(
                                Math.max(
                                  purchaseLimits.dailyRemainingTokens -
                                    selectedTokenPackPurchase.tokenPack.tokenAmount,
                                  0
                                )
                              )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600 dark:text-slate-400">
                          Monthly remaining after purchase
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">
                          {purchaseLimits.monthlyRemainingTokens === null
                            ? 'Unlimited'
                            : formatTokenAmount(
                                Math.max(
                                  purchaseLimits.monthlyRemainingTokens -
                                    selectedTokenPackPurchase.tokenPack.tokenAmount,
                                  0
                                )
                              )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePurchaseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handlePurchaseTokenPack} variant="contained">
            Confirm Purchase
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
