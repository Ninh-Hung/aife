/**
 * BillingHistory Component
 * Displays a table of past billing transactions
 */

import React from 'react';
import { Chip } from '@mui/material';
import { Download } from 'lucide-react';
import { BillingHistoryItem } from '../../types';

interface BillingHistoryProps {
  history: BillingHistoryItem[];
}

export const BillingHistory: React.FC<BillingHistoryProps> = ({ history }) => {
  // Status color mapping
  const getStatusColor = (
    status: BillingHistoryItem['status']
  ): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      case 'REFUNDED':
        return 'default';
      default:
        return 'default';
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="text-gray-500 dark:text-slate-400">No billing history available</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Plan Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Invoice
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {history.map((item) => (
              <tr
                key={item.publicId}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-900"
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                  {formatDate(item.paymentDate)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">
                  {item.packageName}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                  ${item.amount.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {item.invoiceUrl ? (
                    <a
                      href={item.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <Download size={16} />
                      Download
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="divide-y divide-gray-200 dark:divide-slate-700 md:hidden">
        {history.map((item) => (
          <div key={item.publicId} className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900 dark:text-slate-100">
                  {item.packageName}
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  {formatDate(item.paymentDate)}
                </div>
              </div>
              <Chip label={item.status} color={getStatusColor(item.status)} size="small" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                ${item.amount.toFixed(2)}
              </div>
              {item.invoiceUrl && (
                <a
                  href={item.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  <Download size={16} />
                  Download
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
