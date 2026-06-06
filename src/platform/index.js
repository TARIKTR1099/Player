/**
 * Platform abstraction layer — shared utilities
 * All Electron-specific platform adapters go through this module.
 */

const os = require('os');

const PLATFORM = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  isArm: os.arch() === 'arm64',
  isX64: os.arch() === 'x64',
  isDev: !require('electron').app.isPackaged,
};

/**
 * Get the user data directory for config persistence.
 * Cross-platform safe path.
 */
function getUserDataPath() {
  const { app } = require('electron');
  return app.getPath('userData');
}

/**
 * Get path for a platform-specific icon.
 */
function getIconPath(name) {
  const path = require('path');
  const { app } = require('electron');
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'Assets')
    : path.join(__dirname, '..', '..', 'Assets');
  return path.join(base, name);
}

/**
 * Platform-appropriate app icon path.
 */
function getAppIcon() {
  if (PLATFORM.isMac) return getIconPath('icon.icns');
  if (PLATFORM.isWindows) return getIconPath('icon.ico');
  return getIconPath('icon.png');
}

/**
 * Get tray icon (16x16 for Mac, 32x32 for others).
 */
function getTrayIconPath() {
  if (PLATFORM.isMac) return getIconPath('tray-icon.png');
  return getIconPath('tray-icon.png');
}

/**
 * Platform-appropriate window frame options.
 */
function getWindowFrame() {
  // macOS: use native traffic-light titlebar (titleBarStyle: 'hiddenInset')
  // Windows/Linux: frameless with custom controls
  if (PLATFORM.isMac) {
    return {
      frame: true,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 12 },
    };
  }
  return {
    frame: false,
  };
}

/**
 * Get default window dimensions based on platform.
 */
function getDefaultWindowSize() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  if (PLATFORM.isMac) {
    return { width: Math.min(1280, width), height: Math.min(800, height) };
  }
  if (PLATFORM.isLinux) {
    return { width: Math.min(1200, width), height: Math.min(750, height) };
  }
  // Windows
  return { width: Math.min(1280, width), height: Math.min(780, height) };
}

module.exports = {
  PLATFORM,
  getUserDataPath,
  getIconPath,
  getAppIcon,
  getTrayIconPath,
  getWindowFrame,
  getDefaultWindowSize,
};
