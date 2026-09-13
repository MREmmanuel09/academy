'use client';

import {
  countPendingMutations,
  deleteMutation,
  getPendingMutations,
  queueMutation,
} from '@/lib/offline-queue';
import { useCallback, useEffect, useState } from 'react';

const MAX_RETRIES = 3;

/**
 * Hook to manage offline mutations and sync when online.
 *
 * Usage:
 * ```tsx
 * const { isOnline, pendingCount, syncPending } = useOfflineSync();
 *
 * // Queue a mutation when offline
 * await queueMutation('reviewSrsCard', { cardId, rating });
 *
 * // Sync pending mutations when back online
 * await syncPending();
 * ```
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check initial online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    countPendingMutations().then(setPendingCount);
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncPending();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Sync all pending mutations to the server.
   */
  const syncPending = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const mutations = await getPendingMutations();

      for (const mutation of mutations) {
        if (mutation.retries >= MAX_RETRIES) {
          console.warn(`Mutation ${mutation.id} exceeded max retries, skipping`);
          continue;
        }

        try {
          // Dynamically import the action based on the mutation type
          const actionModule = await import('@/app/actions/offline-sync');
          const result = await actionModule.syncOfflineMutation(mutation);

          if (result.ok) {
            if (mutation.id !== undefined) await deleteMutation(mutation.id);
          } else {
            console.error(`Failed to sync mutation ${mutation.id}:`, result.error);
          }
        } catch (error) {
          console.error(`Error syncing mutation ${mutation.id}:`, error);
        }
      }

      // Update count after sync
      const newCount = await countPendingMutations();
      setPendingCount(newCount);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  /**
   * Queue a mutation for offline execution.
   */
  const enqueue = useCallback(async (action: string, payload: unknown): Promise<number> => {
    const id = await queueMutation(action, payload);
    setPendingCount((c) => c + 1);
    return id;
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    enqueue,
    syncPending,
  };
}
