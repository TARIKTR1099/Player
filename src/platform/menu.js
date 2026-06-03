/**
 * Platform-appropriate application menu.
 * macOS gets a full native menu bar.
 * Windows/Linux get a minimal menu (or none since we use custom UI).
 */
const { Menu, app, shell } = require('electron');

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about', label: 'Player Hakkında' },
        { type: 'separator' },
        {
          label: 'Ayarlar...',
          accelerator: 'Cmd+,',
          click: () => {
            const win = require('electron').BrowserWindow.getAllWindows()[0];
            if (win) win.webContents.send('navigate-settings');
          },
        },
        { type: 'separator' },
        { role: 'services', label: 'Servisler' },
        { type: 'separator' },
        { role: 'hide', label: 'Gizle' },
        { role: 'hideOthers', label: 'Diğerlerini Gizle' },
        { role: 'unhide', label: 'Tümünü Göster' },
        { type: 'separator' },
        { role: 'quit', label: 'Çıkış' },
      ],
    });
  }

  template.push({
    label: 'Dosya',
    submenu: [
      {
        label: 'Dosya Aç...',
        accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('open-file-dialog');
        },
      },
      {
        label: 'Klasör Aç...',
        accelerator: isMac ? 'Cmd+Shift+O' : 'Ctrl+Shift+O',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('open-folder-dialog');
        },
      },
      { type: 'separator' },
      isMac ? { role: 'close', label: 'Pencereyi Kapat' } : { role: 'quit', label: 'Çıkış' },
    ],
  });

  template.push({
    label: 'Düzen',
    submenu: [
      { role: 'undo', label: 'Geri Al' },
      { role: 'redo', label: 'İleri Al' },
      { type: 'separator' },
      { role: 'cut', label: 'Kes' },
      { role: 'copy', label: 'Kopyala' },
      { role: 'paste', label: 'Yapıştır' },
      { role: 'selectAll', label: 'Tümünü Seç' },
    ],
  });

  template.push({
    label: 'Görünüm',
    submenu: [
      {
        label: 'Tam Ekran',
        accelerator: isMac ? 'Cmd+Ctrl+F' : 'F11',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.setFullScreen(!win.isFullScreen());
        },
      },
      { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Yakınlaştırmayı Sıfırla' },
      { role: 'zoomIn', label: 'Yakınlaştır' },
      { role: 'zoomOut', label: 'Uzaklaştır' },
    ],
  });

  template.push({
    label: 'Oynatma',
    submenu: [
      {
        label: 'Oynat / Duraklat',
        accelerator: 'Space',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('media-toggle-play');
        },
      },
      {
        label: 'Sonraki',
        accelerator: isMac ? 'Cmd+Right' : 'MediaNextTrack',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('media-next');
        },
      },
      {
        label: 'Önceki',
        accelerator: isMac ? 'Cmd+Left' : 'MediaPreviousTrack',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('media-previous');
        },
      },
      { type: 'separator' },
      {
        label: 'Ses Yükselt',
        accelerator: isMac ? 'Cmd+Up' : 'VolumeUp',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('volume-up');
        },
      },
      {
        label: 'Ses Kıs',
        accelerator: isMac ? 'Cmd+Down' : 'VolumeDown',
        click: () => {
          const win = require('electron').BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('volume-down');
        },
      },
    ],
  });

  template.push({
    label: 'Yardım',
    submenu: [
      {
        label: 'GitHub',
        click: () => shell.openExternal('https://github.com/TARIKTR1099/Player'),
      },
      {
        label: 'Hata Bildir',
        click: () => shell.openExternal('https://github.com/TARIKTR1099/Player/issues/new'),
      },
      { type: 'separator' },
      {
        label: 'Player Hakkında',
        click: () => {
          const { dialog } = require('electron');
          dialog.showMessageBox({
            type: 'info',
            title: 'Player',
            message: `Player v${app.getVersion()}`,
            detail: 'Cross-platform medya oynatıcı\nAI entegrasyonu ve eklenti sistemi ile',
          });
        },
      },
    ],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildAppMenu };
