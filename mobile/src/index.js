/**
 * Mobile entry point for Capacitor (Android/iOS).
 * Detects platform and bridges to the shared web app.
 */

// Platform detection for Capacitor
const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
const platform = isCapacitor ? window.Capacitor.getPlatform() : 'web';

console.log(`[Player Mobile] Platform: ${platform}`);

// Polyfill Electron APIs for Capacitor
if (!window.require) {
  window.require = () => ({});
}

// Provide Electron-like IPC shim for mobile
if (!window.electronAPI) {
  window.electronAPI = {
    invoke: async (channel, ...args) => {
      switch (channel) {
        case 'get-settings':
          return JSON.parse(localStorage.getItem('player-settings') || '{}');
        case 'save-settings':
          localStorage.setItem('player-settings', JSON.stringify(args[0]));
          return true;
        case 'get-library':
          return JSON.parse(localStorage.getItem('player-library') || '{"tracks":[],"playlists":[]}');
        case 'save-library':
          localStorage.setItem('player-library', JSON.stringify(args[0]));
          return true;
        case 'get-token':
          return localStorage.getItem('player-token');
        case 'set-token':
          localStorage.setItem('player-token', args[0]);
          return true;
        case 'open-file-dialog':
          return []; // Mobile: use file picker intent
        case 'get-platform':
          return platform;
        default:
          console.warn(`[Mobile] Unhandled IPC: ${channel}`);
          return null;
      }
    },
    on: (channel, callback) => {
      console.log(`[Mobile] IPC listener registered: ${channel}`);
    },
    removeListener: () => {},
  };
}

// Export for use in React
export { isCapacitor, platform };
