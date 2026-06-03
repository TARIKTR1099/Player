const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Global state/settings/library functions (main.js'den gelen fonksiyonlara erişim)
// main.js'de bu dosya require edildiği için ipcMain dinleyicileri burada aktif olur.

ipcMain.handle('add-music-prompt', async (event, filePath) => {
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Taşı ve Eski Konumu Sil', 'Kopyala ve Eski Konumu Tut', 'İptal'],
    defaultId: 0,
    title: 'Müzik Aktarma',
    message: `${path.basename(filePath)} aktarılırken ne yapılsın?`,
    checkboxLabel: 'Seçimi Hatırla',
  });

  return {
    action: result.response === 0 ? 'move' : result.response === 1 ? 'copy' : 'cancel',
    remember: result.checkboxChecked
  };
});
