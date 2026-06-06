/**
 * Cross-platform tray icon.
 * Each platform has different tray constraints:
 * - macOS: 22x22px template image, auto-dark mode
 * - Windows: 32x32px icon, must be .ico or .png
 * - Linux: 32x32px, needs libappindicator/libayatana
 */
const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const { PLATFORM } = require('./index');

function createTray(mainWindow) {
  let iconPath;
  const assetsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'Assets')
    : path.join(__dirname, '..', '..', 'Assets');

  if (PLATFORM.isMac) {
    // macOS: use template image (16x16 for status bar)
    iconPath = path.join(assetsPath, 'tray-icon.png');
  } else if (PLATFORM.isLinux) {
    // Linux: larger icon for tray
    iconPath = path.join(assetsPath, 'tray-icon.png');
  } else {
    // Windows
    iconPath = path.join(assetsPath, 'tray-icon.png');
  }

  let trayIcon = nativeImage.createFromPath(iconPath);

  // macOS: mark as template image for proper dark/light mode
  if (PLATFORM.isMac) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
    trayIcon.setTemplateImage(true);
  } else if (PLATFORM.isWindows) {
    trayIcon = trayIcon.resize({ width: 32, height: 32 });
  } else {
    trayIcon = trayIcon.resize({ width: 32, height: 32 });
  }

  const tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Player\'ı Göster',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Oynat / Duraklat',
      click: () => mainWindow.webContents.send('media-toggle-play'),
    },
    {
      label: 'Sonraki',
      click: () => mainWindow.webContents.send('media-next'),
    },
    {
      label: 'Önceki',
      click: () => mainWindow.webContents.send('media-previous'),
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Player - Medya Oynatıcı');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow.show();
    }
  });

  // macOS: update tray on theme change
  if (PLATFORM.isMac) {
    app.on('notification', (event, userInfo) => {
      // System theme changed — tray template handles it automatically
    });
  }

  return tray;
}

module.exports = { createTray };
