/**
 * Platform detection for React UI.
 * Detects Electron, Capacitor (mobile), and web environments.
 */

let cachedPlatform = null;
let cachedIsElectron = null;
let cachedIsCapacitor = null;
let cachedIsMobile = null;

// Exported for testing — reset cached platform detection
export function resetPlatformCache() {
  cachedPlatform = null;
  cachedIsElectron = null;
  cachedIsCapacitor = null;
  cachedIsMobile = null;
}

export function getPlatform() {
  if (cachedPlatform) return cachedPlatform;

  // Detect Capacitor (Android/iOS)
  if (typeof window !== 'undefined' && window.Capacitor) {
    const p = window.Capacitor.getPlatform();
    cachedPlatform = p; // 'android' or 'ios'
    cachedIsCapacitor = true;
    cachedIsMobile = true;
    cachedIsElectron = false;
    return p;
  }

  // Detect Electron
  if (typeof window !== 'undefined' && window.require && window.require('electron')) {
    cachedPlatform = 'electron';
    cachedIsElectron = true;
    cachedIsMobile = false;
    cachedIsCapacitor = false;
    return 'electron';
  }

  cachedPlatform = 'web';
  cachedIsElectron = false;
  cachedIsCapacitor = false;
  cachedIsMobile = false;
  return 'web';
}

export function isElectron() {
  if (cachedIsElectron !== null) return cachedIsElectron;
  getPlatform();
  return cachedIsElectron;
}

export function isCapacitor() {
  if (cachedIsCapacitor !== null) return cachedIsCapacitor;
  getPlatform();
  return cachedIsCapacitor;
}

export function isMobile() {
  if (cachedIsMobile !== null) return cachedIsMobile;
  getPlatform();
  return cachedIsMobile;
}

/**
 * True when running on Android (Capacitor).
 */
export function isAndroid() {
  return getPlatform() === 'android';
}

/**
 * True when running on iOS (Capacitor).
 */
export function isIOS() {
  return getPlatform() === 'ios';
}

/**
 * True when running in a native desktop context (Electron).
 */
export function isDesktop() {
  return isElectron();
}

export function isMacOS() {
  if (isElectron()) {
    try {
      const os = window.require('os');
      return os.platform() === 'darwin';
    } catch { return false; }
  }
  return navigator.platform?.toLowerCase().includes('mac') || false;
}

export function isWindows() {
  if (isElectron()) {
    try {
      const os = window.require('os');
      return os.platform() === 'win32';
    } catch { return false; }
  }
  return navigator.platform?.toLowerCase().includes('win') || false;
}

export function isLinux() {
  if (isElectron()) {
    try {
      const os = window.require('os');
      return os.platform() === 'linux';
    } catch { return false; }
  }
  return navigator.platform?.toLowerCase().includes('linux') || false;
}

/**
 * Safe IPC bridge that works on Electron, Capacitor, and Web.
 */
export async function ipcInvoke(channel, ...args) {
  if (isElectron()) {
    try {
      const { ipcRenderer } = window.require('electron');
      return await ipcRenderer.invoke(channel, ...args);
    } catch (e) {
      console.error(`IPC invoke failed (${channel}):`, e);
      return null;
    }
  }

  if (isCapacitor()) {
    // Capacitor IPC shim (defined in mobile/src/index.js)
    if (window.electronAPI) {
      return window.electronAPI.invoke(channel, ...args);
    }
    return null;
  }

  // Web fallback via localStorage
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
    default:
      return null;
  }
}

/**
 * Listen for IPC events. Works on all platforms.
 */
export function ipcOn(channel, callback) {
  if (isElectron()) {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.on(channel, callback);
      return () => ipcRenderer.removeListener(channel, callback);
    } catch { return () => {}; }
  }
  if (isCapacitor()) {
    if (window.electronAPI?.on) {
      window.electronAPI.on(channel, callback);
    }
    return () => {};
  }
  return () => {};
}
