'use client';

import { useOfflineSync } from '@/hooks/use-offline-sync';
import { Button } from '@academy/ui';
import { useTranslations } from 'next-intl';

/**
 * Shows offline status and pending sync count.
 * Appears in the header when there are pending mutations.
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineSync();
  const t = useTranslations('common');

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {t('offline')}
        </span>
      )}

      {pendingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing || !isOnline}
          onClick={() => syncPending()}
          className="h-7 text-xs"
        >
          {isSyncing ? (
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('syncing')}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                />
              </svg>
              {pendingCount} {t('pending')}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
