'use client';

import { OfflineIndicator } from './offline-indicator';

/**
 * Client-side wrapper for the header that includes the offline indicator.
 * This is separate from the server-rendered Header to allow client-only
 * features like online/offline detection.
 */
export function HeaderClient() {
  return (
    <div className="flex items-center gap-2">
      <OfflineIndicator />
    </div>
  );
}
