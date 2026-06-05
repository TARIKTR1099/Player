const { ipcMain, globalShortcut, BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');
const NodeID3 = require('node-id3');
const { trackOps, playlistOps, scrobbleOps, eqOps, close: closeDb } = require('./database');
const { startWatching, stopWatching, scanFolder } = require('./folderWatcher');
const api = require('./apiIntegrations');

let mainWindow = null;

function init(mainWin) {
  mainWindow = mainWin;
  
  // === GLOBAL SHORTCUTS (Media Keys) ===
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('transport-action', 'toggle-play');
  });
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('transport-action', 'next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('transport-action', 'prev');
  });
  globalShortcut.register('MediaStop', () => {
    mainWindow?.webContents.send('transport-action', 'toggle-play');
  });

  // === FOLDER WATCHER ===
  const currentSettings = getSettingsFromMain();
  if (currentSettings.musicFolder) {
    setupFolderWatcher(currentSettings.musicFolder);
  }

  // === IPC HANDLERS ===

  // Database-backed library
  ipcMain.handle('db-get-tracks', (e, opts) => trackOps.getAll(opts || {}));
  ipcMain.handle('db-search-tracks', (e, q) => trackOps.search(q));
  ipcMain.handle('db-add-track', (e, track) => { trackOps.insert(track); return { ok: true }; });
  ipcMain.handle('db-update-track', (e, id, fields) => trackOps.update(id, fields));
  ipcMain.handle('db-delete-track', (e, id) => { trackOps.delete(id); return { ok: true }; });
  ipcMain.handle('db-increment-play', (e, id) => trackOps.incrementPlayCount(id));
  ipcMain.handle('db-get-recent', (e, limit) => trackOps.getRecent(limit));
  ipcMain.handle('db-get-top', (e, limit) => trackOps.getTopPlayed(limit));
  
  // Scrobble
  ipcMain.handle('db-add-scrobble', async (e, trackId, title, artist, duration) => {
    scrobbleOps.add(trackId, title, artist, duration);
    try {
      await api.scrobbleLastfm(artist, title, '', '');
    } catch(e) {}
    return { ok: true };
  });
  ipcMain.handle('db-get-scrobbles', () => scrobbleOps.getRecent());
  ipcMain.handle('db-get-scrobble-stats', () => scrobbleOps.getStats());

  // Playlists
  ipcMain.handle('db-get-playlists', () => playlistOps.getAll());
  ipcMain.handle('db-create-playlist', (e, name) => playlistOps.create(name));
  ipcMain.handle('db-rename-playlist', (e, id, newName) => playlistOps.rename(id, newName));
  ipcMain.handle('db-delete-playlist', (e, id) => playlistOps.delete(id));
  ipcMain.handle('db-get-playlist-tracks', (e, id) => playlistOps.getTracks(id));
  ipcMain.handle('db-add-to-playlist', (e, plId, tId) => playlistOps.addTrack(plId, tId));
  ipcMain.handle('db-remove-from-playlist', (e, plId, tId) => playlistOps.removeTrack(plId, tId));

  // Categories
  ipcMain.handle('db-get-categories', () => categoryOps.getAll());
  
  // Equalizer presets
  ipcMain.handle('db-get-eq-presets', () => eqOps.getAll());
  ipcMain.handle('db-save-eq-preset', (e, name, bands) => eqOps.save(name, bands));
  ipcMain.handle('db-delete-eq-preset', (e, id) => eqOps.delete(id));
  ipcMain.handle('db-get-track-eq', (e, trackId) => eqOps.getTrackEq(trackId));
  ipcMain.handle('db-set-track-eq', (e, trackId, bands, effects) => eqOps.setTrackEq(trackId, bands, effects));

  // Folder watching
  ipcMain.handle('start-folder-watch', (e, folderPath) => setupFolderWatcher(folderPath));
  ipcMain.handle('stop-folder-watch', () => stopWatching());
  ipcMain.handle('scan-folder', async (e, folderPath) => {
    const files = await scanFolder(folderPath);
    return { files, count: files.length };
  });

  // Lyrics
  ipcMain.handle('search-lyrics', async (e, artist, title) => {
    const settings = getSettingsFromMain();
    if (settings.musixmatchKey) {
      return await api.lookupLyrics(artist, title, settings.musixmatchKey);
    }
    return null;
  });

  // Metadata enrichment
  ipcMain.handle('enrich-metadata', async (e, track) => {
    const settings = getSettingsFromMain();
    return await api.enrichMetadata(track, {
      lastfmKey: settings.lastfmKey,
      musixmatchKey: settings.musixmatchKey,
      spotifyId: settings.spotifyId,
      spotifySecret: settings.spotifySecret,
    });
  });

  // Spotify recommendations
  ipcMain.handle('spotify-recommendations', async (e, seedTrack, seedArtist) => {
    const settings = getSettingsFromMain();
    if (settings.spotifyId && settings.spotifySecret) {
      await api.spotifyAuthFlow(settings.spotifyId, settings.spotifySecret);
      return await api.getSpotifyRecommendations(seedTrack, seedArtist);
    }
    return [];
  });

  // Spotify search
  ipcMain.handle('spotify-search', async (e, query) => {
    const settings = getSettingsFromMain();
    if (settings.spotifyId && settings.spotifySecret) {
      await api.spotifyAuthFlow(settings.spotifyId, settings.spotifySecret);
      return await api.searchSpotify(query);
    }
    return [];
  });

  // Last.fm artist info
  ipcMain.handle('lastfm-artist', async (e, artist) => {
    const settings = getSettingsFromMain();
    if (settings.lastfmKey) {
      return await api.lookupLastfmArtist(artist, settings.lastfmKey);
    }
    return null;
  });

  // Node-ID3: Read/write tags
  ipcMain.handle('read-tags', (e, filePath) => {
    try {
      const tags = NodeID3.read(filePath);
      return {
        title: tags.title || '',
        artist: tags.artist || '',
        album: tags.album || '',
        year: tags.year || 0,
        trackNumber: tags.trackNumber || 0,
        genre: tags.genre || '',
        picture: tags.image ? `data:${tags.image.mime || 'image/jpeg'};base64,${tags.image.imageBuffer?.toString('base64')}` : null,
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle('write-tags', (e, filePath, tags) => {
    try {
      NodeID3.update(tags, filePath);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  // Import/Export
  ipcMain.handle('export-playlist-m3u', async (e, playlistId, playlistName) => {
    try {
      const { dialog } = require('electron');
      const tracks = playlistOps.getTracks(playlistId);
      if (!tracks.length) return { error: 'Çalma listesi boş' };
      
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `${playlistName || 'playlist'}.m3u`,
        filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
      });
      if (result.canceled) return { canceled: true };
      
      const lines = ['#EXTM3U'];
      for (const t of tracks) {
        const time = Math.round(t.duration || 0);
        lines.push(`#EXTINF:${time},${t.artist} - ${t.title}`);
        lines.push(t.location || '');
      }
      fs.writeFileSync(result.filePath, lines.join('\n'), 'utf8');
      return { ok: true, path: result.filePath };
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('import-m3u', async () => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }],
        properties: ['openFile']
      });
      if (result.canceled || !result.filePaths.length) return { canceled: true };
      
      const content = fs.readFileSync(result.filePaths[0], 'utf8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).filter(l => !l.startsWith('http'));
      const existing = trackOps.getAll({});
      
      let imported = 0;
      for (const line of lines) {
        const loc = line.trim();
        if (!loc || !fs.existsSync(loc)) continue;
        const name = path.basename(loc, path.extname(loc));
        const match = existing.find(t => t.location === loc || t.title === name);
        if (!match) {
          try {
            const mm = require('music-metadata');
            const metadata = await mm.parseFile(loc);
            const picture = metadata.common.picture?.[0];
            trackOps.insert({
              id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              title: metadata.common.title || name,
              artist: metadata.common.artist || 'Bilinmeyen',
              album: metadata.common.album || '',
              location: loc,
              duration: metadata.format.duration || 0,
              picture: picture ? `data:${picture.format};base64,${picture.data.toString('base64')}` : null,
              source: 'local',
            });
            imported++;
          } catch (e) { /* skip unreadable */ }
        }
      }
      return { ok: true, imported };
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('export-library-json', async () => {
    try {
      const { dialog } = require('electron');
      const tracks = trackOps.getAll({});
      const playlists = playlistOps.getAll();
      const data = { tracks, playlists, exportedAt: Date.now(), version: 1 };
      
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `player-library-backup.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (result.canceled) return { canceled: true };
      
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
      return { ok: true, path: result.filePath, trackCount: tracks.length };
    } catch (e) { return { error: e.message }; }
  });

  ipcMain.handle('import-library-json', async () => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      });
      if (result.canceled || !result.filePaths.length) return { canceled: true };
      
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
      if (!data.tracks || !Array.isArray(data.tracks)) return { error: 'Geçersiz yedek dosyası' };
      
      let imported = 0;
      const existingTracks = trackOps.getAll({});
      const existingLocations = new Set(existingTracks.map(t => t.location).filter(Boolean));
      
      for (const t of data.tracks) {
        if (t.location && existingLocations.has(t.location)) continue;
        trackOps.insert(t);
        imported++;
      }
      
      // Import playlists
      if (data.playlists && Array.isArray(data.playlists)) {
        for (const pl of data.playlists) {
          const existing = playlistOps.getAll().find(p => p.name === pl.name);
          if (!existing) playlistOps.create(pl.name);
        }
      }
      
      return { ok: true, imported, totalTracks: data.tracks.length };
    } catch (e) { return { error: e.message }; }
  });

  // Auto-scan on startup
  ipcMain.handle('auto-scan-folder', async (e, folderPath) => {
    const musicFiles = await scanFolder(folderPath);
    let added = 0;
    
    for (const filePath of musicFiles) {
      const existing = trackOps.getAll({ search: path.basename(filePath, path.extname(filePath)) });
      if (existing.length === 0) {
        try {
          const mm = require('music-metadata');
          const metadata = await mm.parseFile(filePath);
          const picture = metadata.common.picture?.[0];
          
          trackOps.insert({
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
            artist: metadata.common.artist || 'Bilinmeyen',
            album: metadata.common.album || '',
            location: filePath,
            duration: metadata.format.duration || 0,
            picture: picture ? `data:${picture.format};base64,${picture.data.toString('base64')}` : null,
            bitrate: metadata.format.bitrate || 0,
            sampleRate: metadata.format.sampleRate || 0,
            fileSize: metadata.format.numberOfSamples || 0,
            source: 'local',
          });
          added++;
        } catch (e) { /* skip unreadable */ }
      }
    }
    
    return { added, total: musicFiles.length };
  });
}

function setupFolderWatcher(folderPath) {
  startWatching(folderPath, async (filePath) => {
    try {
      const mm = require('music-metadata');
      const metadata = await mm.parseFile(filePath);
      const picture = metadata.common.picture?.[0];
      
      trackOps.insert({
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
        artist: metadata.common.artist || 'Bilinmeyen',
        album: metadata.common.album || '',
        location: filePath,
        duration: metadata.format.duration || 0,
        picture: picture ? `data:${picture.format};base64,${picture.data.toString('base64')}` : null,
        source: 'local',
      });
      
      mainWindow?.webContents.send('library-updated');
    } catch (e) { /* skip */ }
  }, (filePath) => {
    const name = path.basename(filePath, path.extname(filePath));
    const tracks = trackOps.getAll({ search: name });
    tracks.forEach(t => trackOps.delete(t.id));
    mainWindow?.webContents.send('library-updated');
  });
}

// Helper: get settings from main process
function getSettingsFromMain() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function cleanup() {
  globalShortcut.unregisterAll();
  stopWatching();
  closeDb();
}

module.exports = { init, cleanup, getSettings: getSettingsFromMain };
