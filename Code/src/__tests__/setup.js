// Test setup — mocks for browser APIs used by the app
import '@testing-library/jest-dom';

// Mock window.require for Electron — returns null in test (web mode)
if (typeof globalThis.window !== 'undefined') {
  // Don't redefine window if already set by jsdom
} else {
  Object.defineProperty(globalThis, 'window', {
    value: {
      ...globalThis.window,
      require: () => null,
      Capacitor: undefined,
    },
    writable: true,
  });
}

// Ensure localStorage exists for zustand persist middleware
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
    writable: true,
  });
}

// Mock MediaSession
if (typeof globalThis.navigator !== 'undefined') {
  Object.defineProperty(globalThis.navigator, 'mediaSession', {
    value: {
      playbackState: 'none',
      metadata: null,
      setActionHandler: () => {},
    },
    writable: true,
  });
}

// Make window.require return null by default (web mode)
if (typeof globalThis.window !== 'undefined') {
  globalThis.window.require = () => null;
  globalThis.window.Capacitor = undefined;
}
