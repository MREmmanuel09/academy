import { countPendingMutations } from '@/lib/offline-queue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('offline-queue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('countPendingMutations returns 0 on IndexedDB failure', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const count = await countPendingMutations();
    expect(count).toBe(0);
  });

  it('countPendingMutations returns 0 when open throws', async () => {
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        throw new Error('DB not available');
      }),
    });
    const count = await countPendingMutations();
    expect(count).toBe(0);
  });

  it('countPendingMutations returns 0 when indexedDB is missing object stores', async () => {
    const mockStore = {
      index: vi.fn(() => ({
        count: vi.fn(() => {
          const req = { result: 0, onsuccess: null as (() => void) | null, onerror: null };
          setTimeout(() => req.onsuccess?.(), 0);
          return req;
        }),
      })),
    };
    const mockTx = { objectStore: vi.fn(() => mockStore) };
    const mockDb = {
      transaction: vi.fn(() => mockTx),
      objectStoreNames: { contains: vi.fn(() => true) },
    };
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        const req = {
          result: mockDb,
          onupgradeneeded: null,
          onsuccess: null as (() => void) | null,
          onerror: null,
        };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      }),
    });
    const count = await countPendingMutations();
    expect(count).toBe(0);
  });
});
