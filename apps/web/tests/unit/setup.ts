import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mock IndexedDB for jsdom environment
if (typeof globalThis.indexedDB === 'undefined') {
  const mockStore = {
    count: () => ({ onsuccess: null as (() => void) | null, result: 0 }),
    index: () => ({
      count: () => ({ onsuccess: null as (() => void) | null, result: 0 }),
    }),
  };
  const mockDB = {
    transaction: () => ({
      objectStore: () => mockStore,
      onerror: null,
    }),
    objectStoreNames: { contains: () => false },
    createObjectStore: () => ({
      createIndex: () => {},
    }),
  };

  const mockIDBRequest = {
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
    result: mockDB as unknown as IDBDatabase,
    error: null,
  };

  globalThis.indexedDB = {
    open: () => {
      setTimeout(() => {
        if (mockIDBRequest.onupgradeneeded) mockIDBRequest.onupgradeneeded();
        if (mockIDBRequest.onsuccess) mockIDBRequest.onsuccess();
      }, 0);
      return mockIDBRequest;
    },
    deleteDatabase: () => mockIDBRequest,
    databases: () => Promise.resolve([]),
  } as unknown as IDBFactory;
}

afterEach(() => {
  cleanup();
});
