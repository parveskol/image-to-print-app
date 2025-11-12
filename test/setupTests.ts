import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IndexedDB with proper implementation
const mockIDBDatabase = {
  objectStoreNames: { contains: jest.fn() },
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
};

const mockIDBRequest = {
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null,
  result: null,
  error: null,
};

Object.defineProperty(window, 'indexedDB', {
  writable: true,
  value: {
    open: jest.fn(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        if (request.onsuccess) {
          request.result = { ...mockIDBDatabase };
          request.onsuccess();
        }
      }, 0);
      return request;
    }),
    deleteDatabase: jest.fn(),
  },
});

// Mock service worker
const mockRegistration = {
  addEventListener: jest.fn(),
  installing: null,
  waiting: null,
  active: null,
};

const mockServiceWorker = {
  register: jest.fn(() => Promise.resolve({})),
  ready: Promise.resolve(mockRegistration),
  addEventListener: jest.fn(),
  controller: null,
};

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: mockServiceWorker,
});

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});