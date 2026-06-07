const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage, shell, screen, powerSaveBlocker, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const mm = require('music-metadata');
const chokidar = require('chokidar');
const database = require('./database');
const { PLATFORM, getWindowFrame, getAppIcon, getDefaultWindowSize, getIconPath } = require('./platform');
const { buildAppMenu } = require('./platform/menu');

// ============================================================
//  Portable Mode Detection
//  If a `portable.flag` file exists in the directory containing
//  the launcher EXE, the app runs in portable mode:
//  - All user data (settings, library, logs) is stored next to
//    the EXE instead of in %APPDATA% / ~/.config
//  - No registry writes, no auto-updates
//  Detected BEFORE app.setPath / app.getPath calls.
// ============================================================
function detectPortableMode() {
  try {
    if (!app.isPackaged) return false; // dev mode always uses default userData
    const exeDir = path.dirname(process.execPath);
    const flagPath = path.join(exeDir, 'portable.flag');
    if (fs.existsSync(flagPath)) {
      // Override userData path to be next to the EXE
      const portableData = path.join(exeDir, 'userdata');
      fs.mkdirSync(portableData, { recursive: true });
      app.setPath('userData', portableData);
      return true;
    }
  } catch (e) {
    console.warn('[portable] detection failed:', e.message);
  }
  return false;
}
const IS_PORTABLE = detectPortableMode();
if (IS_PORTABLE) {
  console.log('[portable] mode ACTIVE — userData =', app.getPath('userData'));
}

let mainWindow = null;
let tray = null;
let isQuitting = false;
let suppressTrayToggleUntil = 0;
let powerSaveBlockId = null;
let dbWatcher = null;
let userDataPath = null;
let settingsFile = null;
let libraryFile = null;
let favoritesFile = null;
let legacyGroupsFile = null;

const TEMP_MUSIC_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function getTempMusicDir() {
  const dir = path.join(os.tmpdir(), 'player-music', 'tempmusic');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanTempMusic(maxAgeMs = TEMP_MUSIC_MAX_AGE) {
  try {
    const dir = getTempMusicDir();
    const now = Date.now();
    const files = fs.readdirSync(dir);
    let deleted = 0;
    for (const file of files) {
      try {
        const stat = fs.statSync(path.join(dir, file));
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(path.join(dir, file));
          deleted++;
        }
      } catch {}
    }
    return deleted;
  } catch { return 0; }
}

// ============================================================
//  File-based logging (Electron on Windows is a GUI app — stdout
//  is buffered, so we mirror console.* into userData/logs/main.log).
//  Helps diagnose black-screen / mount failures.
// ============================================================
let logFilePath = null;
function setupFileLogging() {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    // Keep only the last 5 log files (delete older ones)
    try {
      const all = fs.readdirSync(logDir)
        .filter(f => f.startsWith('main-') && f.endsWith('.log'))
        .map(f => ({ f, mtime: fs.statSync(path.join(logDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      all.slice(5).forEach(({ f }) => {
        try { fs.unlinkSync(path.join(logDir, f)); } catch {}
      });
    } catch {}
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    logFilePath = path.join(logDir, `main-${stamp}.log`);
    const orig = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    const write = (level, args) => {
      try {
        const line = `[${new Date().toISOString()}] [${level}] ` +
          args.map(a => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })())).join(' ') + '\n';
        if (logFilePath) fs.appendFileSync(logFilePath, line);
        orig[level]?.apply(console, args);
      } catch {}
    };
    console.log = (...a) => write('log', a);
    console.warn = (...a) => write('warn', a);
    console.error = (...a) => write('error', a);
  } catch (e) {
    // Fallback: just use console normally
  }
}
setupFileLogging();
console.log('[main] === Player starting ===');
console.log('[main] executable:', process.execPath);
console.log('[main] userData:', app.getPath('userData'));
console.log('[main] platform:', process.platform, 'arch:', process.arch);
console.log('[main] electron:', process.versions.electron, 'chrome:', process.versions.chrome);

// Force release any stale lock before requesting new one
// This handles cases where app was killed without proper cleanup
try {
  const lockPath = path.join(app.getPath('userData'), 'SingletonLock');
  if (fs.existsSync(lockPath)) {
    // Try to remove stale lock file
    fs.unlinkSync(lockPath);
    console.log('[main] stale SingletonLock removed:', lockPath);
  }
} catch (e) {
  console.warn('[main] lock release failed:', e.message);
}

// Single instance lock - skip in dev mode (multiple dev sessions often wanted)
// and in packaged mode guard against stale Windows named pipes by retrying
// once after 500ms.
function requestLockWithRetry() {
  let lock = app.requestSingleInstanceLock();
  if (lock) return true;
  // Quick check: if a real instance is alive, no point retrying. Look for
  // an electron.exe belonging to our userData path.
  try {
    const { execSync } = require('child_process');
    const out = execSync('tasklist /FI "IMAGENAME eq electron.exe" /FO CSV /NH', { stdio: 'pipe' }).toString();
    const ourPids = out.split(/\r?\n/).filter(l => l.toLowerCase().includes('electron.exe'));
    if (ourPids.length === 0) {
      console.log('[main] no live electron.exe found — lock appears stale, retrying in 1.2s');
      // Wait briefly so the named pipe is released by Windows
      const until = Date.now() + 1200;
      while (Date.now() < until) { /* spin briefly */ }
      lock = app.requestSingleInstanceLock();
    }
  } catch {}
  return lock;
}
const gotTheLock = app.isPackaged ? requestLockWithRetry() : true;
console.log('[main] gotTheLock =', gotTheLock, '(packaged=' + app.isPackaged + ')');
if (!gotTheLock) {
  // Another instance is already running, quit immediately
  console.log('[main] ANOTHER INSTANCE RUNNING — quitting');
  app.quit();
  process.exit(0);
}
console.log('[main] registering app.whenReady().then(...)...');

app.whenReady().then(() => {
  console.log('[main] app READY (whenReady fired) — proceeding to createWindow');
  // Ensure app identity is exactly "Player" so Windows notifications / tray
  // / taskbar show "Player" instead of the "electron.app.Player" legacy name.
  try {
    app.setName('Player');
  } catch (_) { /* ignore on platforms that don't support it */ }
  try {
    app.setAppUserModelId('com.player.media');
  } catch (_) { /* ignore */ }
}).catch((e) => console.error('[main] whenReady rejected:', e));

// Handle second instance attempt (Windows "Open with" file association)
app.on('second-instance', (event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) showWindowFromTray();
    mainWindow.focus();
    // Check for player:// deep link
    const playerUrl = commandLine?.find(arg => arg.startsWith('player://'));
    if (playerUrl) { mainWindow.webContents.send('deep-link', playerUrl); return; }
    // Check if a file was passed as argument
    const filePath = commandLine?.find(arg => {
      const ext = path.extname(arg).toLowerCase();
      return SUPPORTED_EXTENSIONS.has(ext);
    });
    if (filePath) {
      mainWindow.webContents.send('open-file-path', filePath);
    }
  }
});

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma',
  '.mp4', '.mkv', '.avi', '.mov', '.webm'
]);

const WINDOW_LAYOUTS = {
  normal: { width: 960, height: 516, minWidth: 860, minHeight: 400 },
  compact: { width: 430, height: 282, minWidth: 300, minHeight: 190 },
  library: { width: 1180, height: 720, minWidth: 1024, minHeight: 640 },
  video: { width: 920, height: 600, minWidth: 860, minHeight: 500 }
};

const SETTINGS_VERSION = 2;

const DEFAULT_AUDIO_EFFECTS = {
  clarity: 0,
  ambience: 0,
  surround: 0,
  dynamicBoost: 0,
  bassBoost: 0,
};

const DEFAULT_AUDIO_PROFILES = {
  default: { ...DEFAULT_AUDIO_EFFECTS },
  cinema: { clarity: 20, ambience: 40, surround: 60, dynamicBoost: 30, bassBoost: 20 },
  music: { clarity: 30, ambience: 10, surround: 20, dynamicBoost: 10, bassBoost: 15 },
  voice: { clarity: 50, ambience: 0, surround: 0, dynamicBoost: 40, bassBoost: 0 },
};

function readJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
  }
  return fallback;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function cloneAudioProfiles() {
  return Object.fromEntries(
    Object.entries(DEFAULT_AUDIO_PROFILES).map(([id, profile]) => [
      id,
      { ...DEFAULT_AUDIO_EFFECTS, ...profile }
    ])
  );
}

function mergeAudioProfiles(savedProfiles = {}) {
  const merged = cloneAudioProfiles();
  if (!savedProfiles || typeof savedProfiles !== 'object') return merged;
  Object.entries(savedProfiles).forEach(([id, profile]) => {
    if (!profile || typeof profile !== 'object') return;
    merged[id] = { ...DEFAULT_AUDIO_EFFECTS, ...profile };
  });
  return merged;
}

function getSettings() {
  const rawSettings = readJson(settingsFile, {});
  const savedVersion = rawSettings._version || 0;
  const playerDataFolder = path.join(app.getPath('appData'), 'Player');
  const defaultMusicFolder = path.join(playerDataFolder, 'Music');
  const oldMusicFolder = path.join(os.homedir(), 'Music', 'player', 'Music');

  let musicFolder = defaultMusicFolder;
  if (rawSettings.musicFolder && rawSettings.musicFolder !== oldMusicFolder) {
    musicFolder = rawSettings.musicFolder;
  }

  const defaults = {
    theme: 'dark',
    width: WINDOW_LAYOUTS.normal.width,
    height: WINDOW_LAYOUTS.normal.height,
    x: null,
    y: null,
    layoutMode: 'normal',
    language: 'system',
    startup: false,
    minimizeToTray: true,
    maximized: false,
    lastSession: null,
    audioEffects: { ...DEFAULT_AUDIO_EFFECTS },
    audioProfiles: cloneAudioProfiles(),
    selectedAudioProfile: 'default',
    customPlaybackRate: 1,
    musicFolder: musicFolder,
    downloadDir: '',
    _version: SETTINGS_VERSION,
  };

  // If version mismatch, reset to defaults (discard old corrupt settings)
  if (savedVersion < SETTINGS_VERSION) {
    return defaults;
  }

  return {
    ...defaults,
    ...rawSettings,
    audioEffects: { ...DEFAULT_AUDIO_EFFECTS, ...(rawSettings.audioEffects || {}) },
    audioProfiles: mergeAudioProfiles(rawSettings.audioProfiles),
    customPlaybackRate: Number(rawSettings.customPlaybackRate) || 1,
    musicFolder: musicFolder,
    _version: SETTINGS_VERSION,
  };
}

function saveSettings(settings) {
  writeJson(settingsFile, settings);
}

function getDefaultLibraryState() {
  return {
    sources: [], tracks: [], favorites: [], playlists: [],
    viewMode: 'list', sortBy: 'custom', sortDirection: 'asc',
    currentListId: 'all', globalOrder: []
  };
}

function migrateLegacyLibraryState() {
  const state = getDefaultLibraryState();
  const favorites = readJson(favoritesFile, []);
  const groups = readJson(legacyGroupsFile, []);
  state.favorites = Array.isArray(favorites) ? favorites : [];
  state.playlists = Array.isArray(groups)
    ? groups.map((group) => ({
        id: `playlist-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: group.name || 'Yeni Liste',
        itemIds: Array.isArray(group.songs) ? group.songs : [],
        createdAt: Date.now(), updatedAt: Date.now()
      }))
    : [];
  return state;
}

function getLibraryState() {
  if (!fs.existsSync(libraryFile)) return migrateLegacyLibraryState();
  const data = readJson(libraryFile, getDefaultLibraryState());
  const library = {
    ...getDefaultLibraryState(), ...data,
    sources: Array.isArray(data.sources) ? data.sources : [],
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    playlists: Array.isArray(data.playlists) ? data.playlists : [],
    globalOrder: Array.isArray(data.globalOrder) ? data.globalOrder : []
  };
  return deduplicateLibrary(library);
}

function saveLibraryState(data) {
  writeJson(libraryFile, data);
}

function deduplicateLibrary(library) {
  const seen = new Map();
  const uniqueTracks = [];
  const uniqueOrder = [];
  
  for (const track of library.tracks) {
    // Use normalized path as key for deduplication
    const key = track.location ? track.location.toLowerCase() : track.id;
    if (!seen.has(key)) {
      seen.set(key, track);
      uniqueTracks.push(track);
      uniqueOrder.push(track.id);
    }
  }
  
  library.tracks = uniqueTracks;
  library.globalOrder = uniqueOrder;
  return library;
}

// Send scan progress to the renderer
function emitScanProgress(current, total, status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('library-scan-progress', { current, total, progress: total > 0 ? Math.round((current / total) * 100) : 0, status });
    } catch {}
  }
}

// Process metadata for a batch of file paths in parallel
async function extractMetadataBatch(filePaths) {
  return Promise.allSettled(
    filePaths.map(async (filePath) => {
      const metadata = await extractMetadata(filePath);
      return {
        filePath,
        ...metadata,
        isVideo: !['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(path.extname(filePath).toLowerCase()),
      };
    })
  );
}

async function scanMusicFolder(folderPath) {
  if (!folderPath) return;
  try { await fs.promises.access(folderPath); } catch { return; }
  
  emitScanProgress(0, 1, 'Dosyalar taranıyor...');
  const files = await collectSupportedFilesAsync(folderPath, true);
  if (files.length === 0) return;
  
  const library = getLibraryState();
  // Normalize existing paths to lowercase for comparison
  const existingPaths = new Set(
    library.tracks
      .map(t => t.location)
      .filter(Boolean)
      .map(p => p.toLowerCase())
  );
  
  // Filter only new files
  const newFiles = files.filter(f => !existingPaths.has(f.toLowerCase()));
  if (newFiles.length === 0) return;
  
  const total = newFiles.length;
  const CONCURRENCY = 15; // Process 15 files at a time
  let processed = 0;
  const newTracks = [];
  
  emitScanProgress(0, total, `${total} yeni dosya bulundu`);
  
  // Process metadata in parallel batches
  for (let i = 0; i < newFiles.length; i += CONCURRENCY) {
    const batch = newFiles.slice(i, i + CONCURRENCY);
    const results = await extractMetadataBatch(batch);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const t = result.value;
        const newTrack = {
          id: `track-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          title: t.title,
          artist: t.artist,
          duration: t.duration,
          picture: t.picture,
          location: t.filePath,
          isVideo: t.isVideo,
          addedAt: Date.now()
        };
        newTracks.push(newTrack);
        library.tracks.push(newTrack);
        library.globalOrder.push(newTrack.id);
        existingPaths.add(t.filePath.toLowerCase());
      }
    }
    
    processed += batch.length;
    emitScanProgress(processed, total, `${total - processed} dosya kaldı...`);
  }
  
  if (newTracks.length > 0) {
    const cleanLibrary = deduplicateLibrary(library);
    saveLibraryState(cleanLibrary);
    console.log(`Library scan: added ${newTracks.length} new tracks (async, batch size ${CONCURRENCY})`);
  }
  
  emitScanProgress(total, total, 'Kütüphane güncellendi');
}

function getResourcesBasePath() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
}

function getBundledYtdlpPath() {
  return path.join(getResourcesBasePath(), 'yt-dlp-bin', 'yt-dlp.exe');
}

function getBundledFfmpegPath() {
  return path.join(getResourcesBasePath(), 'yt-dlp-bin', 'ffmpeg', 'bin', 'ffmpeg.exe');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (data) => { stdout += data.toString(); });
    child.stderr?.on('data', (data) => { stderr += data.toString(); });
    child.on('error', (error) => { resolve({ ok: false, stdout, stderr: `${stderr}\n${error.message}` }); });
    child.on('close', (code) => { resolve({ ok: code === 0, stdout, stderr, code }); });
  });
}

async function runYtdlpJson(args) {
  const response = await runCommand(getBundledYtdlpPath(), args, { cwd: path.dirname(getBundledYtdlpPath()) });
  if (!response.ok) throw new Error(response.stderr || 'yt-dlp calistirilamadi.');
  return JSON.parse(response.stdout.trim());
}

function collectSupportedFiles(targetPath, recursive, bucket) {
  let stat;
  try { stat = fs.statSync(targetPath); } catch { return bucket; }
  if (stat.isFile()) {
    if (SUPPORTED_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) bucket.push(targetPath);
    return bucket;
  }
  if (!stat.isDirectory()) return bucket;
  const items = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(targetPath, item.name);
    if (item.isDirectory() && recursive) collectSupportedFiles(fullPath, recursive, bucket);
    else if (SUPPORTED_EXTENSIONS.has(path.extname(item.name).toLowerCase())) bucket.push(fullPath);
  }
  return bucket;
}

// Async version — non-blocking directory walk using fs.promises
async function collectSupportedFilesAsync(targetPath, recursive) {
  const results = [];
  const walk = async (dir) => {
    let items;
    try { items = await fs.promises.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    const dirs = [];
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && recursive) dirs.push(fullPath);
      else if (SUPPORTED_EXTENSIONS.has(path.extname(item.name).toLowerCase())) results.push(fullPath);
    }
    // Walk directories in parallel
    await Promise.all(dirs.map(d => walk(d)));
  };
  try {
    const stat = await fs.promises.stat(targetPath);
    if (stat.isFile()) {
      if (SUPPORTED_EXTENSIONS.has(path.extname(targetPath).toLowerCase())) results.push(targetPath);
      return results;
    }
    if (stat.isDirectory()) await walk(targetPath);
  } catch {}
  return results;
}

function resolveSourceFiles(source) {
  if (!source || !source.type) return [];
  if (source.type === 'files') return Array.isArray(source.values) ? source.values.filter((f) => fs.existsSync(f)) : [];
  if (source.type === 'folder' || source.type === 'location') return collectSupportedFiles(source.value, true, []);
  return [];
}

async function extractMetadata(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const picture = metadata.common.picture && metadata.common.picture[0];
    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || metadata.common.albumartist || 'Unknown Artist',
      duration: metadata.format.duration || 0,
      picture: picture ? `data:${picture.format};base64,${picture.data.toString('base64')}` : null
    };
  } catch {
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: 'Unknown Artist', duration: 0, picture: null
    };
  }
}

const playbackState = { isPlaying: false, canGoNext: false, canGoPrev: false, shuffleMode: false, repeatMode: 'off', trackTitle: '' };

function sendTransportAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('transport-action', action);
}

ipcMain.handle('update-playback-state', (event, state) => {
  if (state) {
    playbackState.isPlaying = state.isPlaying || false;
    playbackState.canGoNext = state.canGoNext || false;
    playbackState.canGoPrev = state.canGoPrev || false;
    playbackState.shuffleMode = state.shuffleMode || false;
    playbackState.repeatMode = state.repeatMode || 'off';
    playbackState.trackTitle = state.trackTitle || '';
    updateThumbarButtons();
    updateTrayMenu();
  }
  return true;
});

function getThumbIcon(name) {
  const p = path.join(getResourcesBasePath(), 'Assets', name);
  if (fs.existsSync(p)) return nativeImage.createFromPath(p).resize({ width: 16, height: 16 });
  return nativeImage.createEmpty();
}

function updateThumbarButtons() {
  if (!mainWindow || process.platform !== 'win32') return;
  mainWindow.setThumbarButtons([
    { tooltip: 'Önceki', icon: getThumbIcon('thumbar-prev.png'), flags: playbackState.canGoPrev ? [] : ['disabled'], click: () => sendTransportAction('prev') },
    { tooltip: playbackState.isPlaying ? 'Duraklat' : 'Oynat', icon: getThumbIcon(playbackState.isPlaying ? 'thumbar-pause.png' : 'thumbar-play.png'), click: () => sendTransportAction('toggle-play') },
    { tooltip: 'Sonraki', icon: getThumbIcon('thumbar-next.png'), flags: playbackState.canGoNext ? [] : ['disabled'], click: () => sendTransportAction('next') },
  ]);
}

function getTrayImage() {
  const assetsPath = path.join(getResourcesBasePath(), 'Assets');
  const trayPath = path.join(assetsPath, 'tray-icon.png');
  
  if (!fs.existsSync(trayPath)) {
    const iconPath = path.join(assetsPath, 'icon.png');
    if (fs.existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    }
    return nativeImage.createEmpty();
  }
  
  const image = nativeImage.createFromPath(trayPath);
  return image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 });
}

function updateTrayMenu() {
  if (!tray) return;
  const triggerTrayAction = (action) => {
    suppressTrayToggleUntil = Date.now() + 500;
    sendTransportAction(action);
  };
  const currentTrack = getLibraryState().tracks.find(t => t.isPlaying) || null;
  const titleLine = currentTrack ? `${currentTrack.title} - ${currentTrack.artist}` : 'Player';
  
  // Get categories from library
  const libraryState = getLibraryState();
  const categories = libraryState.categories || [];
  const categorySubmenu = categories.length > 0 
    ? categories.map(cat => ({
        label: cat.name,
        click: () => {
          showWindowFromTray();
          mainWindow?.webContents.send('navigate-category', cat.name);
        }
      }))
    : [{ label: tMain('tray.noCategory'), enabled: false }];

  const contextMenu = Menu.buildFromTemplate([
    // Now Playing
    { label: titleLine, enabled: false },
    { type: 'separator' },
    // Playback controls
    { label: playbackState.isPlaying ? `⏸  ${tMain('player.pause')}` : `▶  ${tMain('player.play')}`, click: () => triggerTrayAction('toggle-play') },
    { label: `⏮  ${tMain('player.prev')}`, enabled: playbackState.canGoPrev, click: () => triggerTrayAction('prev') },
    { label: `⏭  ${tMain('player.next')}`, enabled: playbackState.canGoNext, click: () => triggerTrayAction('next') },
    { label: `🔀  ${tMain('player.shuffle')}`, type: 'checkbox', checked: playbackState.shuffleMode, click: () => triggerTrayAction('shuffle') },
    { label: `🔁  ${tMain('player.repeat')}`, type: 'checkbox', checked: playbackState.repeatMode !== 'off', click: () => triggerTrayAction('repeat') },
    { type: 'separator' },
    // Volume submenu
    { label: `🔊  ${tMain('player.volume')}`, submenu: [
      { label: tMain('player.volumeUp'), click: () => { sendTransportAction('volume-up'); } },
      { label: tMain('player.volumeDown'), click: () => { sendTransportAction('volume-down'); } },
      { label: tMain('player.mute'), click: () => { sendTransportAction('mute-toggle'); } },
      { type: 'separator' },
      { label: '%25', click: () => mainWindow?.webContents.send('set-volume', 25) },
      { label: '%50', click: () => mainWindow?.webContents.send('set-volume', 50) },
      { label: '%75', click: () => mainWindow?.webContents.send('set-volume', 75) },
      { label: '%100', click: () => mainWindow?.webContents.send('set-volume', 100) },
    ]},
    { type: 'separator' },
    // Navigation submenu
    { label: `📂  ${tMain('common.open')}`, submenu: [
      { label: tMain('tray.tabs.home'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('navigate-tab', 'home'); } },
      { label: tMain('tray.tabs.library'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('navigate-tab', 'library'); } },
      { label: tMain('tray.tabs.search'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('navigate-tab', 'search'); } },
      { label: tMain('tray.tabs.settings'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('navigate-tab', 'settings'); } },
    ]},
    // Categories submenu
    { label: `🏷  ${tMain('tray.categories')}`, submenu: categorySubmenu },
    { type: 'separator' },
    // Tools
    { label: `⚡  ${tMain('tray.tools')}`, submenu: [
      { label: tMain('tray.tools.equalizer'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('open-equalizer'); } },
      { label: tMain('tray.tools.effects'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('open-effects'); } },
      { label: tMain('tray.tools.visualizer'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('toggle-visualizer'); } },
      { type: 'separator' },
      { label: tMain('tray.openFile'), click: () => { showWindowFromTray(); mainWindow?.webContents.send('open-file-dialog'); } },
    ]},
    { type: 'separator' },
    // Window
    { label: mainWindow && mainWindow.isVisible() ? `👁  ${tMain('tray.hide')}` : `👁  ${tMain('tray.show')}`, click: () => {
      suppressTrayToggleUntil = Date.now() + 500;
      if (mainWindow && mainWindow.isVisible()) hideWindowToTray();
      else showWindowFromTray();
    }},
    { label: `🖥  ${tMain('player.fullscreen')}`, click: () => {
      showWindowFromTray();
      mainWindow?.webContents.send('toggle-fullscreen');
    }},
    { type: 'separator' },
    { label: `❌  ${tMain('tray.quit')}`, click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip(titleLine);
}

function hideWindowToTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setSkipTaskbar(true);
  mainWindow.hide();
}

function showWindowFromTray() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
  if (mainWindow.webContents.isCrashed()) {
    mainWindow.webContents.reload();
  } else {
    mainWindow.webContents.send('window-restored');
  }
}

function applyWindowLayout(tab, layoutMode, hasVideo) {
  if (!mainWindow) return;
  let layout = WINDOW_LAYOUTS.normal;
  if (tab === 'library') layout = WINDOW_LAYOUTS.library;
  else if (layoutMode === 'compact') layout = WINDOW_LAYOUTS.compact;
  else if (hasVideo) layout = WINDOW_LAYOUTS.video;
  mainWindow.setMinimumSize(layout.minWidth, layout.minHeight);
  const area = screen.getPrimaryDisplay().workArea;
  const nextWidth = Math.min(layout.width, area.width);
  const nextHeight = Math.min(layout.height, area.height);
  const x = Math.max(area.x, Math.round(area.x + (area.width - nextWidth) / 2));
  const y = Math.max(area.y, Math.round(area.y + (area.height - nextHeight) / 2));
  mainWindow.setBounds({ x, y, width: nextWidth, height: nextHeight }, true);
}

function createWindow() {
  const settings = getSettings();
  const windowFrame = getWindowFrame();
  const defaultSize = getDefaultWindowSize();

  // Restore position if saved, otherwise center on screen
  let winX, winY;
  if (settings.x != null && settings.y != null) {
    const area = screen.getPrimaryDisplay().workArea;
    // Only restore if position is visible on screen
    if (settings.x < area.right && settings.y < area.bottom && settings.x > area.left - 200 && settings.y > area.top - 200) {
      winX = settings.x;
      winY = settings.y;
    }
  }

  mainWindow = new BrowserWindow({
    width: settings.width || defaultSize.width,
    height: settings.height || defaultSize.height,
    ...(winX != null ? { x: winX, y: winY } : {}),
    minWidth: WINDOW_LAYOUTS.normal.minWidth,
    minHeight: WINDOW_LAYOUTS.normal.minHeight,
    fullscreenable: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
    ...windowFrame,
  });

  // Restore maximized state
  if (settings.maximized) mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '..', 'dist-web', 'index.html'));
  console.log('[main] BrowserWindow created, loadFile called:', path.join(__dirname, '..', 'dist-web', 'index.html'));

  // ============================================================
  //  DEBUG: Forward renderer logs to main stdout for black-screen
  //  diagnostics. Captures all console.log/info/warn/error and
  //  uncaught errors, page-load failures, and renderer crashes.
  // ============================================================
  mainWindow.webContents.on('console-message', (event, level, message, line, source) => {
    const tag = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level] || 'LOG';
    console.log(`[renderer:${tag}] ${message}  (${source}:${line})`);
    // Also append raw to log file in case the global console override misses anything
    try { if (logFilePath) fs.appendFileSync(logFilePath, `[renderer:${tag}] ${message}  (${source}:${line})\n`); } catch {}
  });
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(`[main] did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL} mainFrame=${isMainFrame}`);
  });
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[main] render-process-gone:', details);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] did-finish-load (page fully loaded)');
  });
  mainWindow.webContents.on('dom-ready', () => {
    console.log('[main] dom-ready (DOM available)');
  });
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[main] preload-error:', preloadPath, error);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('[main] ready-to-show fired, showing window');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      // Check if launched with a file (Windows "Open with")
      const filePath = process.argv.find((arg, i) => {
        if (i === 0) return false; // skip executable path
        const ext = path.extname(arg).toLowerCase();
        return SUPPORTED_EXTENSIONS.has(ext);
      });
      if (filePath) {
        mainWindow.webContents.send('open-file-path', filePath);
      }
    }
  });

  // Normal minimize to taskbar (not tray)
  // Tray minimize is handled separately via IPC (window-close-to-tray)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const settings = getSettings();
      // Save window bounds + maximized state
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        settings.width = bounds.width;
        settings.height = bounds.height;
        settings.x = bounds.x;
        settings.y = bounds.y;
        settings.maximized = mainWindow.isMaximized();
        saveSettings(settings);
      }
      // Close to tray or quit?
      if (settings.minimizeToTray) {
        event.preventDefault();
        hideWindowToTray();
        return;
      }
      // Now actually quit
      isQuitting = true;
      app.quit();
    }
  });
  mainWindow.on('show', () => { 
    mainWindow?.setSkipTaskbar(false); 
    updateThumbarButtons();
    updateTrayMenu(); 
  });
  mainWindow.on('hide', () => {
    if (!isQuitting) mainWindow?.setSkipTaskbar(true);
    updateTrayMenu();
  });
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-event', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-event', false);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.on('crashed', () => {
    mainWindow?.webContents?.reload();
  });
  // Allow file drag-drop — forward to renderer
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Prevent navigation from file drops
    if (url.startsWith('file://')) event.preventDefault();
  });
  updateThumbarButtons();
}

function createTray() {
  tray = new Tray(getTrayImage());
  tray.on('click', () => {
    if (!mainWindow || Date.now() < suppressTrayToggleUntil) return;
    if (mainWindow.isVisible()) hideWindowToTray();
    else showWindowFromTray();
  });
  updateTrayMenu();
}

app.whenReady().then(() => {
  userDataPath = app.getPath('userData');
  settingsFile = path.join(userDataPath, 'settings.json');
  libraryFile = path.join(userDataPath, 'library.json');
  favoritesFile = path.join(userDataPath, 'favorites.json');
  legacyGroupsFile = path.join(userDataPath, 'groups.json');

  // Create default folders in APPDATA
  const playerDataFolder = path.join(app.getPath('appData'), 'Player');
  const subfolders = ['Music', 'Categories', 'Youtube', 'Downloads'];
  subfolders.forEach(folder => {
    fs.mkdirSync(path.join(playerDataFolder, folder), { recursive: true });
  });

  // Ensure log directory exists
  const logDir = path.join(userDataPath, 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  // Clean temp music older than 24 hours on startup
  const cleaned = cleanTempMusic(TEMP_MUSIC_MAX_AGE);
  if (cleaned > 0) console.log(`Temp music cleanup: ${cleaned} dosya silindi`);

  const settings = getSettings();
  if (!settings.musicFolder) {
    settings.musicFolder = path.join(playerDataFolder, 'Music');
    saveSettings(settings);
  }

  // Scan default music folder on startup
  scanMusicFolder(settings.musicFolder).then(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('library-changed');
    }
  }).catch(e => console.error('Library scan failed:', e));

  createWindow();
  createTray();

  // Forward F11 to renderer (mediaFullscreen toggle) instead of native OS fullscreen
  mainWindow?.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow?.webContents.send('toggle-fullscreen');
    }
  });

  // Platform-specific setup
  if (PLATFORM.isMac) {
    // macOS: set native app menu
    buildAppMenu();
    // macOS: keep app running when all windows closed
    app.on('activate', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    });
    // macOS: set dock icon
    if (app.dock) {
      app.dock.setIcon(getIconPath('icon.png'));
    }
  } else if (PLATFORM.isWindows) {
    // Windows: register thumbar buttons (done in createWindow)
  } else if (PLATFORM.isLinux) {
    // Linux: ensure Unity/GNOME launcher entry
    app.setAppUserModelId('com.player.media');
  }

  // Global media shortcuts (all platforms)
  const { globalShortcut } = require('electron');
  globalShortcut.register('MediaPlayPause', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('transport-action', 'toggle-play');
  });
  globalShortcut.register('MediaNextTrack', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('transport-action', 'next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('transport-action', 'prev');
  });
});

app.on('window-all-closed', () => {
  if (!PLATFORM.isMac) app.quit();
  // macOS: keep app running in menu bar
});

app.on('will-quit', () => {
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
  database.closeDb();
  // Release single instance lock
  app.releaseSingleInstanceLock();
});

// === Desktop Notification ===
let lastNotifiedTrackId = null;

ipcMain.handle('test-notification', () => {
  try {
    const notification = new Notification({
      title: 'Player',
      body: 'Bildirimler çalışıyor! 🎵',
      icon: getAppIcon(),
      silent: false,
    });
    notification.show();
    return true;
  } catch (e) {
    console.error('test-notification failed:', e);
    return false;
  }
});

ipcMain.handle('show-notification', (event, { title, body, icon, trackId }) => {
  try {
    // Don't show duplicate notifications for the same track
    if (trackId && trackId === lastNotifiedTrackId) return false;
    if (trackId) lastNotifiedTrackId = trackId;
    
    // Don't show notification if window is focused
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) return false;

    const notification = new Notification({
      title: title || 'Player',
      body: body || '',
      icon: icon || getAppIcon(),
      silent: true,
    });
    notification.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        showWindowFromTray();
        mainWindow.focus();
      }
    });
    notification.show();
    return true;
  } catch (e) {
    console.error('Notification failed:', e);
    return false;
  }
});

// === IPC Handlers ===

ipcMain.handle('get-settings', () => getSettings());

ipcMain.handle('save-settings', (event, settings) => {
  saveSettings({ ...getSettings(), ...settings });
  return true;
});

ipcMain.handle('get-library-state', () => getLibraryState());

ipcMain.handle('save-library-state', (event, data) => {
  saveLibraryState(data);
  return true;
});

ipcMain.handle('window-minimize', () => { 
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

 ipcMain.handle('window-maximize', () => {
   if (mainWindow && !mainWindow.isDestroyed()) {
     if (mainWindow.isMaximized()) {
       mainWindow.unmaximize();
     } else {
       mainWindow.maximize();
     }
   }
 });
 
 ipcMain.handle('is-window-maximized', () => {
   return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
 });

ipcMain.handle('window-close-to-tray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) hideWindowToTray();
});

ipcMain.handle('window-close', () => { 
  isQuitting = true;
  app.quit();
});

// Power save blocker — prevent system sleep during playback
ipcMain.handle('power-save-start', () => {
  if (powerSaveBlockId === null) powerSaveBlockId = powerSaveBlocker.start('prevent-app-suspension');
});
ipcMain.handle('power-save-stop', () => {
  if (powerSaveBlockId !== null) { powerSaveBlocker.stop(powerSaveBlockId); powerSaveBlockId = null; }
});

// File drag-drop: receive dropped file paths from renderer
ipcMain.handle('handle-dropped-files', async (event, filePaths) => {
  const audioFiles = filePaths.filter(fp => SUPPORTED_EXTENSIONS.has(path.extname(fp).toLowerCase()));
  if (audioFiles.length > 0) {
    mainWindow?.webContents.send('open-files', audioFiles);
  }
  return audioFiles.length;
});

// Register custom protocol player:// for deep linking
if (!app.isDefaultProtocolClient('player')) {
  app.setAsDefaultProtocolClient('player');
}

app.on('open-url', (event, url) => {
  // macOS: handle player:// URLs
  if (url.startsWith('player://')) {
    mainWindow?.webContents.send('deep-link', url);
  }
});

// Handle player:// URLs on Windows (merged into existing second-instance above)

ipcMain.handle('get-window-size', () => {
  if (!mainWindow) return null;
  const bounds = mainWindow.getBounds();
  return { width: bounds.width, height: bounds.height };
});

ipcMain.handle('set-window-size', (event, { width, height }) => {
  if (!mainWindow) return false;
  mainWindow.setSize(width, height);
  const settings = getSettings();
  settings.width = width;
  settings.height = height;
  saveSettings(settings);
  return true;
});

ipcMain.handle('set-startup', (event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), openAsHidden: true });
  return true;
});

ipcMain.handle('get-startup-status', () => app.getLoginItemSettings().openAtLogin);

ipcMain.handle('get-system-locale', () => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('reg query "HKCU\\Control Panel\\International" /v LocaleName', { stdio: 'pipe' }).toString();
    const match = result.match(/LocaleName\s+REG_SZ\s+(.+)/);
    return match ? match[1].trim() : 'tr';
  } catch { return 'tr'; }
});

ipcMain.handle('get-system-theme', () => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme', { stdio: 'pipe' }).toString();
    const match = result.match(/AppsUseLightTheme\s+REG_DWORD\s+(\d+)/);
    return match && match[1] === '0' ? 'dark' : 'light';
  } catch { return 'dark'; }
});

ipcMain.handle('set-default-audio-player', (event, enabled) => {
  try {
    const { execSync } = require('child_process');
    let appPath = app.getPath('exe');
    
    if (appPath.includes('electron.exe')) {
      console.log('Cannot set as default in development mode');
      shell.openExternal('ms-settings:defaultapps');
      return false;
    }
    
    const extensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.mp4', '.mkv', '.avi', '.mov', '.webm'];
    if (enabled) {
      try {
        execSync(`reg add "HKCU\\Software\\Classes\\PlayerMusicFile" /ve /d "Player Medya Dosyası" /f`, { stdio: 'pipe' });
        execSync(`reg add "HKCU\\Software\\Classes\\PlayerMusicFile\\shell\\open\\command" /ve /d "\\"${appPath}\\" \\"%1\\"" /f`, { stdio: 'pipe' });
        execSync(`reg add "HKCU\\Software\\Classes\\PlayerMusicFile\\DefaultIcon" /ve /d "\\"${appPath}\\",0" /f`, { stdio: 'pipe' });
      } catch (err) { console.error('Class reg add failed:', err); }

      extensions.forEach(ext => {
        try {
          execSync(`reg add "HKCU\\Software\\Classes\\${ext}" /ve /d "PlayerMusicFile" /f`, { stdio: 'pipe' });
          execSync(`reg add "HKCU\\Software\\Classes\\${ext}\\OpenWithProgids" /v "PlayerMusicFile" /t REG_NONE /f`, { stdio: 'pipe' });
        } catch {}
      });

      try {
        const regPath = `HKCU\\Software\\PlayerMusic\\Capabilities`;
        execSync(`reg add "${regPath}" /v ApplicationName /t REG_SZ /d "Player" /f`, { stdio: 'pipe' });
        execSync(`reg add "${regPath}" /v ApplicationDescription /t REG_SZ /d "Player Music - Medya Oynatıcı" /f`, { stdio: 'pipe' });
        
        execSync(`reg add "${regPath}\\FileAssociations" /v ".mp3" /t REG_SZ /d "PlayerMusicFile" /f`, { stdio: 'pipe' });
        execSync(`reg add "${regPath}\\FileAssociations" /v ".wav" /t REG_SZ /d "PlayerMusicFile" /f`, { stdio: 'pipe' });
        execSync(`reg add "${regPath}\\FileAssociations" /v ".flac" /t REG_SZ /d "PlayerMusicFile" /f`, { stdio: 'pipe' });
        execSync(`reg add "${regPath}\\FileAssociations" /v ".mp4" /t REG_SZ /d "PlayerMusicFile" /f`, { stdio: 'pipe' });
        
        execSync(`reg add "HKCU\\Software\\RegisteredApplications" /v "PlayerMusic" /t REG_SZ /d "Software\\PlayerMusic\\Capabilities" /f`, { stdio: 'pipe' });
      } catch (err) { console.error('RegisteredApplications reg add failed:', err); }

      shell.openExternal('ms-settings:defaultapps');
    } else {
      extensions.forEach(ext => {
        try { execSync(`reg delete "HKCU\\Software\\Classes\\${ext}" /f`, { stdio: 'pipe' }); } catch {}
      });
      try { execSync('reg delete "HKCU\\Software\\Classes\\PlayerMusicFile" /f', { stdio: 'pipe' }); } catch {}
      try { execSync('reg delete "HKCU\\Software\\PlayerMusic" /f', { stdio: 'pipe' }); } catch {}
      try { execSync('reg delete "HKCU\\Software\\RegisteredApplications" /v "PlayerMusic" /f', { stdio: 'pipe' }); } catch {}
    }
    return true;
  } catch (e) { console.error('Set default audio player failed:', e); return false; }
});

ipcMain.handle('get-default-audio-player-status', () => {
  try {
    const { execSync } = require('child_process');
    const result = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.mp3\\UserChoice" /v ProgId', { stdio: 'pipe' }).toString();
    return result.includes('PlayerMusicFile') || result.includes('com.player.media');
  } catch {
    try {
      const { execSync } = require('child_process');
      const result = execSync('reg query "HKCU\\Software\\Classes\\.mp3" /ve', { stdio: 'pipe' }).toString();
      return result.includes('PlayerMusicFile');
    } catch { return false; }
  }
});

ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled) return null;
  const settings = getSettings();
  settings.musicFolder = result.filePaths[0];
  saveSettings(settings);
  return result.filePaths[0];
});

ipcMain.handle('select-download-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (result.canceled) return null;
  const settings = getSettings();
  settings.downloadDir = result.filePaths[0];
  saveSettings(settings);
  return result.filePaths[0];
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('delete-track-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'Dosya bulunamadı' };
    await shell.trashItem(filePath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('open-folder', (event, folderPath) => {
  if (fs.existsSync(folderPath) && fs.statSync(folderPath).isFile()) {
    shell.showItemInFolder(folderPath);
  } else {
    shell.openPath(folderPath);
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf8');
});

// === Neon Database Handlers ===
ipcMain.handle('test-neon-connection', async () => {
  try {
    const result = await database.testConnection();
    if (result.ok) await database.initSchema();
    return result;
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('publish-plugin-neon', async (event, data) => {
  try {
    const plugin = await database.createPlugin({
      name: data.plugin.name,
      description: data.plugin.description,
      category: data.plugin.category || 'feature',
      author: data.plugin.author || '',
      keywords: data.plugin.keywords || '',
      download_link: data.plugin.downloadLink || '',
      md_content: data.plugin.mdContent || '',
      github_repo: data.githubRepo || '',
      github_owner: data.githubOwner || '',
      github_branch: data.githubBranch || 'main'
    });
    return { ok: true, pluginId: plugin.id };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('get-neon-plugins', async (event, filters = {}) => {
  try {
    const plugins = await database.getPlugins(filters);
    return { ok: true, plugins };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('rate-neon-plugin', async (event, data) => {
  try {
    await database.ratePlugin(data.pluginId, data.userId, data.rating, data.review);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('track-plugin-download', async (event, pluginId) => {
  try {
    await database.trackDownload(pluginId);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// === Google Login ===
function getGoogleCredentials() {
  const settings = getSettings();
  return {
    clientId: settings.googleClientId || process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
  };
}

ipcMain.handle('google-login', async () => {
  try {
    const { clientId, clientSecret } = getGoogleCredentials();
    if (!clientId || !clientSecret) {
      return { ok: false, error: 'Google OAuth bilgileri ayarlanmamış. Hesap ayarlarından Google Client ID ve Secret girin.' };
    }

    const http = require('http');
    const https = require('https');

    // Start local server to catch OAuth redirect
    const server = await new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body style="background:#1a1a1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif"><div style="text-align:center"><h2>✅ Giriş başarılı!</h2><p>Bu pencereyi kapatabilirsiniz.</p></div></body></html>');
          resolve(code);
        } else {
          res.writeHead(400);
          res.end('No code');
          reject(new Error('OAuth callback failed'));
        }
      });
      srv.listen(0, '127.0.0.1', () => resolve(srv));
    });

    const port = server.address().port;
    const redirectUri = `http://127.0.0.1:${port}`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('email profile')}&access_type=offline&prompt=consent`;

    // Open OAuth window
    const authWindow = new BrowserWindow({
      width: 500, height: 700,
      title: 'Google ile Giriş',
      autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    authWindow.loadURL(authUrl);
    
    // Wait for the code
    const code = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { reject(new Error('Login timed out')); }, 120000);
      server.on('request', (req) => {
        const url = new URL(req.url, 'http://localhost');
        const c = url.searchParams.get('code');
        if (c) { clearTimeout(timeout); resolve(c); }
      });
    });

    // Exchange code for tokens
    const tokenResponse = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString();

      const req = https.request({
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (tokenResponse.error) {
      server.close();
      authWindow.close();
      return { ok: false, error: tokenResponse.error_description || tokenResponse.error };
    }

    // Get user info
    const userInfo = await new Promise((resolve, reject) => {
      https.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    // Save to Neon DB
    const tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000);
    const savedUser = await database.saveGoogleUser({
      email: userInfo.email,
      display_name: userInfo.name,
      picture: userInfo.picture,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || null,
      token_expiry: tokenExpiry
    });

    server.close();
    authWindow.close();

    return { ok: true, user: savedUser };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('google-logout', async (event, email) => {
  try {
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// === YouTube Download ===
const activeDownloads = new Map();

ipcMain.handle('download-youtube', async (event, url, format, clientDownloadId, thumbnail, options = {}) => {
  const settings = getSettings();
  const musicFolder = settings.musicFolder || path.join(app.getPath('appData'), 'Player', 'Music');
  const downloadDir = settings.downloadDir || path.join(musicFolder, 'Youtube');
  const ytdlpPath = getBundledYtdlpPath();
  const ffmpegPath = getBundledFfmpegPath();
  fs.mkdirSync(downloadDir, { recursive: true });

  return new Promise((resolve) => {
    const downloadId = clientDownloadId || `download-${Date.now()}`;
    const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s');
    const baseArgs = ['--no-warnings', '--newline', '--no-playlist', '-o', outputTemplate, '--ffmpeg-location', ffmpegPath];
    const quality = options.quality || 'best';
    let args;
    if (format === 'audio') {
      const audioQuality = quality !== 'best' ? [`--audio-quality`, quality] : [];
      args = ['-x', '--audio-format', 'mp3', ...audioQuality, ...baseArgs, url];
    } else {
      const videoQuality = quality === 'best' 
        ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
        : `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]`;
      args = ['-f', videoQuality, ...baseArgs, url];
    }

    const processRef = spawn(ytdlpPath, args);
    activeDownloads.set(downloadId, processRef);

    let stderrBuffer = '';

    processRef.stdout.on('data', (data) => {
      const output = data.toString();
      const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
      if (progressMatch) {
        const speedMatch = output.match(/at\s+([\d.]+[KMG]?i?B\/s)/);
        const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
        event.sender.send('download-progress', {
          downloadId, url,
          progress: parseFloat(progressMatch[1]),
          status: 'downloading',
          speed: speedMatch ? speedMatch[1] : null,
          eta: etaMatch ? etaMatch[1] : null,
        });
      }
    });

    processRef.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
    });

    processRef.on('close', async (code) => {
      activeDownloads.delete(downloadId);
      if (code !== 0) {
        const errMsg = `yt-dlp çıkış kodu: ${code}\n${stderrBuffer.trim()}`;
        console.error('download-youtube failed:', errMsg);
        event.sender.send('download-progress', { downloadId, url, status: 'error', error: errMsg });
        resolve({ ok: false, error: errMsg });
        return;
      }
      const files = fs.readdirSync(downloadDir).filter(f => f.endsWith(format === 'audio' ? '.mp3' : '.mp4'));
      const latestFile = files.sort((a, b) => fs.statSync(path.join(downloadDir, b)).mtimeMs - fs.statSync(path.join(downloadDir, a)).mtimeMs)[0];
      if (latestFile) {
        const filePath = path.join(downloadDir, latestFile);
        const metadata = await extractMetadata(filePath);
        const library = getLibraryState();
        const newTrack = { id: `track-${Date.now()}`, ...metadata, location: filePath, isVideo: format !== 'audio', picture: metadata.picture || thumbnail || null };
        library.tracks.push(newTrack);
        library.globalOrder.push(newTrack.id);
        saveLibraryState(library);
        event.sender.send('download-progress', { downloadId, url, status: 'completed', track: newTrack });
        resolve({ ok: true, file: filePath, track: newTrack });
      } else {
        event.sender.send('download-progress', { downloadId, url, status: 'error', error: 'İndirilen dosya bulunamadı' });
        resolve({ ok: false, error: 'İndirilen dosya bulunamadı' });
      }
    });
  });
});

ipcMain.handle('cancel-download', (event, downloadId) => {
  const processRef = activeDownloads.get(downloadId);
  if (processRef) { processRef.kill(); activeDownloads.delete(downloadId); }
  return true;
});

// === Library Watcher ===
ipcMain.handle('start-watcher', (event, folderPath) => {
  try {
    if (dbWatcher) dbWatcher.close();
    dbWatcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      depth: 3,
      ignoreInitial: true,
    });
    dbWatcher.on('add', (filePath) => {
      if (SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
      }
    });
    dbWatcher.on('unlink', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('stop-watcher', () => {
  try {
    if (dbWatcher) { dbWatcher.close(); dbWatcher = null; }
    return { ok: true };
  } catch (e) { return { ok: false }; }
});

ipcMain.handle('clear-library', () => {
  try {
    const state = getDefaultLibraryState();
    saveLibraryState(state);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('repair-library', async () => {
  try {
    let library = getLibraryState();
    
    // Remove non-existent files
    const validTracks = library.tracks.filter(track => {
      if (!track.location) return false;
      return fs.existsSync(track.location);
    });
    
    // Deduplicate
    library.tracks = validTracks;
    library = deduplicateLibrary(library);
    
    saveLibraryState(library);
    
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    return { ok: true, removed: validTracks.length - library.tracks.length };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('reset-and-rescan-library', async () => {
  try {
    const settings = getSettings();
    const musicFolder = settings.musicFolder;
    
    // Clear library
    const state = getDefaultLibraryState();
    saveLibraryState(state);
    
    // Rescan folder
    if (musicFolder && fs.existsSync(musicFolder)) {
      await scanMusicFolder(musicFolder);
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// === System Info ===
ipcMain.handle('get-system-info', () => {
  try {
    return {
      username: os.userInfo().username,
      homeDir: os.homedir(),
      platform: os.platform(),
    };
  } catch {
    return { username: 'Bilinmiyor', homeDir: 'Bilinmiyor', platform: 'unknown' };
  }
});

// === Online Search (yt-dlp based) ===
ipcMain.handle('search-online-tracks', async (event, query) => {
  try {
    const ytdlpPath = getBundledYtdlpPath();
    const isPlaylist = query.includes('playlist') || query.includes('list=') || query.includes('&list=');
    let args;
    if (isPlaylist) {
      // Fetch playlist with up to 50 items
      args = [
        query,
        '--dump-json',
        '--flat-playlist',
        '--no-download',
        '--no-warnings',
        '--skip-download',
        '--playlist-end', '50'
      ];
    } else {
      args = [
        `ytsearch10:${query}`,
        '--dump-json',
        '--flat-playlist',
        '--no-download',
        '--no-warnings',
        '--skip-download'
      ];
    }
    const response = await runCommand(ytdlpPath, args, { cwd: path.dirname(ytdlpPath), timeout: 30000 });
    if (!response.ok) return { ok: false, results: [], isPlaylist };
    
    const lines = response.stdout.trim().split('\n').filter(l => l.trim());
    const results = [];
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        results.push({
          id: data.id || data.url,
          title: data.title || 'Bilinmeyen',
          artist: data.uploader || data.channel || '',
          duration: data.duration || 0,
          thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails.length > 0 ? data.thumbnails[data.thumbnails.length - 1].url : ''),
          pageUrl: data.webpage_url || data.original_url || data.url || '',
          source: 'youtube',
          _playlistItem: isPlaylist
        });
      } catch {}
    }
    return { ok: true, results, isPlaylist };
  } catch (e) {
    console.error('Search failed:', e);
    return { ok: false, results: [], error: e.message, isPlaylist: false };
  }
});

// === Open File Dialog ===
ipcMain.handle('open-file-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Audio/Video Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mp4', 'mkv', 'avi', 'mov', 'webm'] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  } catch (e) { return null; }
});

ipcMain.handle('extract-metadata', async (event, filePath) => {
  return await extractMetadata(filePath);
});

// === Add Music Handlers ===
ipcMain.handle('add-music-files', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio/Video Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mp4', 'mkv', 'avi', 'mov', 'webm'] }]
    });
    if (result.canceled || !result.filePaths.length) return { ok: false };
    
    const library = getLibraryState();
    const musicFolder = getSettings().musicFolder || path.join(app.getPath('appData'), 'Player', 'Music');
    
    for (const filePath of result.filePaths) {
      if (!fs.existsSync(filePath)) continue;
      const destPath = path.join(musicFolder, path.basename(filePath));
      fs.copyFileSync(filePath, destPath);
      const metadata = await extractMetadata(destPath);
      const newTrack = { id: `track-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, ...metadata, location: destPath, isVideo: !['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(path.extname(filePath).toLowerCase()) };
      library.tracks.push(newTrack);
      library.globalOrder.push(newTrack.id);
    }
    saveLibraryState(library);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('add-music-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
    if (result.canceled) return { ok: false };
    
    const library = getLibraryState();
    const musicFolder = getSettings().musicFolder || path.join(app.getPath('appData'), 'Player', 'Music');
    const files = collectSupportedFiles(result.filePaths[0], true, []);
    
    for (const filePath of files) {
      const destPath = path.join(musicFolder, path.basename(filePath));
      fs.copyFileSync(filePath, destPath);
      const metadata = await extractMetadata(destPath);
      const newTrack = { id: `track-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, ...metadata, location: destPath, isVideo: !['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(path.extname(filePath).toLowerCase()) };
      library.tracks.push(newTrack);
      library.globalOrder.push(newTrack.id);
    }
    saveLibraryState(library);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('add-music-compressed', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Compressed Files', extensions: ['zip', 'rar', '7z'] }]
    });
    if (result.canceled) return { ok: false };
    
    const musicFolder = getSettings().musicFolder || path.join(app.getPath('appData'), 'Player', 'Music');
    const extractDir = path.join(musicFolder, 'Extracted');
    fs.mkdirSync(extractDir, { recursive: true });
    
    const { execSync } = require('child_process');
    execSync(`powershell -Command "Expand-Archive -Path '${result.filePaths[0]}' -DestinationPath '${extractDir}' -Force"`, { stdio: 'pipe' });
    
    const files = collectSupportedFiles(extractDir, true, []);
    const library = getLibraryState();
    
    for (const filePath of files) {
      const destPath = path.join(musicFolder, path.basename(filePath));
      fs.copyFileSync(filePath, destPath);
      const metadata = await extractMetadata(destPath);
      const newTrack = { id: `track-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, ...metadata, location: destPath, isVideo: !['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'].includes(path.extname(filePath).toLowerCase()) };
      library.tracks.push(newTrack);
      library.globalOrder.push(newTrack.id);
    }
    saveLibraryState(library);
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('add-music-link', async (event, url) => {
  try {
    if (!url || !url.startsWith('http')) return { ok: false, error: 'Geçersiz link' };
    const settings = getSettings();
    const musicFolder = settings.musicFolder || path.join(app.getPath('appData'), 'Player', 'Music');
    const downloadDir = settings.downloadDir || path.join(musicFolder, 'Downloads');
    fs.mkdirSync(downloadDir, { recursive: true });
    
    const ytdlpPath = getBundledYtdlpPath();
    const ffmpegPath = getBundledFfmpegPath();
    const args = ['-x', '--audio-format', 'mp3', '--newline', '-o', `${downloadDir}/%(title)s.%(ext)s`, '--ffmpeg-location', ffmpegPath, url];
    
    const response = await runCommand(ytdlpPath, args, { cwd: path.dirname(ytdlpPath) });
    if (!response.ok) return { ok: false, error: response.stderr };
    
    const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.mp3'));
    const latestFile = files.sort((a, b) => fs.statSync(path.join(downloadDir, b)).mtimeMs - fs.statSync(path.join(downloadDir, a)).mtimeMs)[0];
    
    if (latestFile) {
      const filePath = path.join(downloadDir, latestFile);
      const metadata = await extractMetadata(filePath);
      const library = getLibraryState();
      const newTrack = { id: `track-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, ...metadata, location: filePath, isVideo: false };
      library.tracks.push(newTrack);
      library.globalOrder.push(newTrack.id);
      saveLibraryState(library);
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('library-changed');
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// Stub IPC handlers to prevent unhandled rejection errors
ipcMain.handle('restart-audio-service', () => ({ ok: true }));
ipcMain.handle('save-ai-settings', (event, settings) => ({ ok: true }));
ipcMain.handle('test-ai-connection', async (event, { apiKey, baseUrl, model, headers }) => {
  try {
    const https = require('https');
    const http = require('http');
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const completionsPath = cleanBase.match(/\/v1$/) ? '/chat/completions' : '/v1/chat/completions';
    const url = new URL(cleanBase + completionsPath);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData),
        ...(headers || []).reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {})
      }
    };
    
    return new Promise((resolve) => {
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ ok: true, msg: 'Bağlantı başarılı!' });
          } else {
            resolve({ ok: false, msg: `Hata: ${res.statusCode} - ${data}` });
          }
        });
      });
      req.on('error', (e) => resolve({ ok: false, msg: `Bağlantı hatası: ${e.message}` }));
      req.write(postData);
      req.end();
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// AI Plugin Analysis Handler
ipcMain.handle('ai-analyze-plugin', async (event, { pluginUrl, pluginId, pluginName }) => {
  try {
    const { aiProvider, aiSelectedModel, aiHeaders } = getSettings();
    
    if (!aiProvider?.apiKey || !aiProvider?.baseUrl) {
      return { ok: false, error: 'AI ayarları yapılmamış' };
    }

    // Build analysis prompt
    const systemPrompt = `You are a security expert analyzing plugins for a music player application.
Analyze the plugin and provide:
1. Safety assessment (safe/risky)
2. Detailed explanation of what the plugin does
3. Access level required (low/medium/high)

Be concise but thorough. Focus on security implications.`;

    const userPrompt = pluginName ? 
      `Analyze this plugin: ${pluginName}\n${pluginUrl || pluginId || ''}` :
      `Analyze this plugin: ${pluginUrl || pluginId || ''}`;

    const headers = {
      'Authorization': `Bearer ${aiProvider.apiKey}`,
      'Content-Type': 'application/json',
    };
    
    // Add custom headers
    if (aiHeaders && Array.isArray(aiHeaders)) {
      aiHeaders.forEach(h => {
        if (h.name && h.value) headers[h.name] = h.value;
      });
    }

    const cleanBase = (aiProvider.baseUrl || '').replace(/\/+$/, '');
    const completionsPath = cleanBase.match(/\/v1$/) ? '/chat/completions' : '/v1/chat/completions';
    const response = await fetch(cleanBase + completionsPath, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiSelectedModel || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { ok: false, error: errorData.error?.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || '';

    // Parse analysis (simple heuristic)
    const safe = !analysis.toLowerCase().includes('risk') && 
                 !analysis.toLowerCase().includes('danger') &&
                 !analysis.toLowerCase().includes('malicious');
    
    const accessLevel = analysis.toLowerCase().includes('high') ? 'Yüksek' :
                       analysis.toLowerCase().includes('medium') ? 'Orta' : 'Düşük';

    return { 
      ok: true, 
      safe,
      details: analysis,
      accessLevel
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('ai-categorize', () => ({ ok: true, message: 'AI kategorizasyon henüz yapılandırılmadı.' }));
ipcMain.handle('db-update-track', (event, trackId, data) => {
  try {
    const library = getLibraryState();
    const idx = library.tracks.findIndex(t => t.id === trackId);
    if (idx !== -1) { Object.assign(library.tracks[idx], data); saveLibraryState(library); }
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('db-remove-track', (event, trackId) => {
  try {
    const library = getLibraryState();
    library.tracks = library.tracks.filter(t => t.id !== trackId);
    library.globalOrder = library.globalOrder.filter(id => id !== trackId);
    saveLibraryState(library);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// Playlist IPC handlers (used by renderer store)
ipcMain.handle('db-get-playlists', () => {
  const library = getLibraryState();
  return library.playlists || [];
});
ipcMain.handle('db-create-playlist', (event, name) => {
  const library = getLibraryState();
  const id = `pl-${Date.now()}`;
  const pl = { id, name, tracks: [], createdAt: Date.now(), updatedAt: Date.now() };
  if (!library.playlists) library.playlists = [];
  library.playlists.push(pl);
  saveLibraryState(library);
  return pl;
});
ipcMain.handle('db-delete-playlist', (event, id) => {
  const library = getLibraryState();
  library.playlists = (library.playlists || []).filter(p => p.id !== id);
  saveLibraryState(library);
});
ipcMain.handle('db-add-to-playlist', (event, plId, tId) => {
  const library = getLibraryState();
  const pl = (library.playlists || []).find(p => p.id === plId);
  if (pl) {
    if (!pl.tracks) pl.tracks = [];
    if (!pl.tracks.includes(tId)) pl.tracks.push(tId);
    pl.updatedAt = Date.now();
    saveLibraryState(library);
  }
});
ipcMain.handle('db-remove-from-playlist', (event, plId, tId) => {
  const library = getLibraryState();
  const pl = (library.playlists || []).find(p => p.id === plId);
  if (pl && pl.tracks) {
    pl.tracks = pl.tracks.filter(id => id !== tId);
    pl.updatedAt = Date.now();
    saveLibraryState(library);
  }
});
ipcMain.handle('db-get-playlist-tracks', (event, plId) => {
  const library = getLibraryState();
  const pl = (library.playlists || []).find(p => p.id === plId);
  if (!pl || !pl.tracks) return [];
  const trackMap = {};
  library.tracks.forEach(t => { trackMap[t.id] = t; });
  return pl.tracks.map(id => trackMap[id]).filter(Boolean);
});

// Import/Export IPC handlers
ipcMain.handle('export-playlist-m3u', async (event, playlistId, playlistName) => {
  try {
    const { dialog } = require('electron');
    const library = getLibraryState();
    const pl = library.playlists?.find(p => p.id === playlistId);
    if (!pl || !pl.tracks || !pl.tracks.length) return { error: 'Calma listesi bos' };
    
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${playlistName || 'playlist'}.m3u`,
      filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
    });
    if (result.canceled) return { canceled: true };
    
    const trackMap = {};
    library.tracks.forEach(t => { trackMap[t.id] = t; });
    
    const lines = ['#EXTM3U'];
    for (const tId of pl.tracks) {
      const t = trackMap[tId];
      if (t) {
        const time = Math.round(t.duration || 0);
        lines.push(`#EXTINF:${time},${t.artist || 'Unknown'} - ${t.title || 'Unknown'}`);
        lines.push(t.location || '');
      }
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
    const library = getLibraryState();
    
    let imported = 0;
    for (const line of lines) {
      const loc = line.trim();
      if (!loc || !fs.existsSync(loc)) continue;
      const name = path.basename(loc, path.extname(loc));
      const match = library.tracks.find(t => t.location === loc || t.title === name);
      if (!match) {
        try {
          const metadata = await mm.parseFile(loc);
          const picture = metadata.common.picture?.[0];
          const id = `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          library.tracks.push({
            id, title: metadata.common.title || name, artist: metadata.common.artist || 'Bilinmeyen',
            album: metadata.common.album || '', location: loc, duration: metadata.format.duration || 0,
            picture: picture ? `data:${picture.format};base64,${picture.data.toString('base64')}` : null,
            source: 'local',
          });
          library.globalOrder.push(id);
          imported++;
        } catch (e) { /* skip */ }
      }
    }
    if (imported > 0) saveLibraryState(library);
    return { ok: true, imported };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('export-library-json', async () => {
  try {
    const { dialog } = require('electron');
    const library = getLibraryState();
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'player-library-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled) return { canceled: true };
    const data = { tracks: library.tracks, playlists: library.playlists || [], exportedAt: Date.now(), version: 1 };
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: result.filePath, trackCount: library.tracks.length };
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
    if (!data.tracks || !Array.isArray(data.tracks)) return { error: 'Gecersiz yedek dosyasi' };
    
    const library = getLibraryState();
    const existingLocations = new Set(library.tracks.map(t => t.location).filter(Boolean));
    
    let imported = 0;
    for (const t of data.tracks) {
      if (t.location && existingLocations.has(t.location)) continue;
      library.tracks.push(t);
      library.globalOrder.push(t.id);
      imported++;
    }
    
    // Import playlists
    if (data.playlists && Array.isArray(data.playlists)) {
      if (!library.playlists) library.playlists = [];
      for (const pl of data.playlists) {
        const existing = library.playlists.find(p => p.name === pl.name);
        if (!existing) library.playlists.push(pl);
      }
    }
    
    if (imported > 0) saveLibraryState(library);
    return { ok: true, imported, totalTracks: data.tracks.length };
  } catch (e) { return { error: e.message }; }
});

// Check if track already exists in library (by title+artist match)
ipcMain.handle('check-track-downloaded', (event, track) => {
  try {
    const library = getLibraryState();
    const match = library.tracks.find(t => 
      t.title && track.title && 
      t.title.toLowerCase().trim() === track.title.toLowerCase().trim() &&
      t.artist && track.artist &&
      t.artist.toLowerCase().trim() === track.artist.toLowerCase().trim()
    );
    return { downloaded: !!match, track: match || null };
  } catch {
    return { downloaded: false, track: null };
  }
});

ipcMain.handle('download-to-temp', async (event, track) => {
  try {
    const ytdlpPath = getBundledYtdlpPath();
    const ffmpegPath = getBundledFfmpegPath();
    const url = track.pageUrl || track.url;
    if (!url) return { ok: false, error: 'URL gerekli' };

    const tempDir = getTempMusicDir();
    const safeName = (track.title || 'audio').replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s-]/g, '').trim() || `audio-${Date.now()}`;
    const outputTemplate = path.join(tempDir, `${safeName}.%(ext)s`);

    await new Promise((resolve, reject) => {
      const quality = track._quality ? [`--audio-quality`, track._quality] : [];
      const args = ['-x', '--audio-format', 'mp3', ...quality, '--no-warnings', '--no-playlist',
        '-o', outputTemplate, '--ffmpeg-location', ffmpegPath, url];
      const proc = spawn(ytdlpPath, args);
      let errOut = '';
      proc.stderr.on('data', (d) => { errOut += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(errOut.trim() || `yt-dlp çıkış kodu: ${code}`));
      });
      proc.on('error', reject);
    });

    const files = fs.readdirSync(tempDir).filter(f => f.startsWith(safeName) && f.endsWith('.mp3'));
    const latestFile = files.sort((a, b) =>
      fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs
    )[0];

    if (!latestFile) return { ok: false, error: 'İndirilen dosya bulunamadı' };

    const filePath = path.join(tempDir, latestFile);
    const metadata = await extractMetadata(filePath);
    const picture = metadata.picture || track.thumbnail || null;

    const tempTrack = {
      id: `temp-${Date.now()}`,
      title: metadata.title || track.title || 'Bilinmeyen',
      artist: metadata.artist || track.artist || 'Bilinmeyen',
      duration: metadata.duration || track.duration || 0,
      location: filePath,
      picture,
      isVideo: false
    };

    return { ok: true, track: tempTrack };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('clear-temp-music', async () => {
  try {
    const dir = getTempMusicDir();
    const files = fs.readdirSync(dir);
    let deleted = 0;
    for (const file of files) {
      try { fs.unlinkSync(path.join(dir, file)); deleted++; } catch {}
    }
    return { ok: true, deleted };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('publish-plugin-github', () => ({ ok: false, error: 'Not implemented' }));
ipcMain.handle('set-always-on-top', (event, flag) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(flag);
  }
  return { ok: true };
});

ipcMain.handle('window-set-size', (event, { width, height, resizable }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setResizable(resizable !== false);
    mainWindow.setMinimumSize(resizable ? 800 : width, resizable ? 600 : height);
    mainWindow.setSize(width, height, true);
    mainWindow.center();
  }
  return { ok: true };
});

ipcMain.handle('check-for-updates', async () => {
  try {
    const https = require('https');
    const currentVersion = app.getVersion();
    
    // GitHub releases API - replace with your repo
    const options = {
      hostname: 'api.github.com',
      path: '/repos/TARIKELER/player-music/releases/latest',
      method: 'GET',
      headers: { 'User-Agent': 'Player-Music-App' }
    };
    
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const release = JSON.parse(data);
              const latestVersion = release.tag_name.replace('v', '');
              const available = latestVersion !== currentVersion;
              resolve({ 
                available, 
                version: available ? latestVersion : currentVersion,
                downloadUrl: release.html_url
              });
            } else {
              resolve({ available: false, version: currentVersion });
            }
          } catch (e) {
            resolve({ available: false, version: currentVersion, error: 'Parse hatası' });
          }
        });
      });
      req.on('error', () => resolve({ available: false, version: currentVersion, error: 'Bağlantı hatası' }));
      req.end();
    });
  } catch (e) {
    return { available: false, version: app.getVersion(), error: e.message };
  }
});

// Copy skills file to user-selected location
ipcMain.handle('copy-skills-file', async () => {
  try {
    const sourcePath = path.join(__dirname, '..', 'docs', 'plugin-skills.md');
    
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      return { ok: false, error: 'Kaynak dosya bulunamadı' };
    }
    
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'AI Skills Dosyasını Kaydet',
      defaultPath: 'plugin-skills.md',
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePath) {
      return { ok: false };
    }
    
    // Copy file
    fs.copyFileSync(sourcePath, result.filePath);
    
    return { ok: true, destination: result.filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// AI Chat Handler
ipcMain.handle('ai-chat', async (event, { message, history, category }) => {
  try {
    // Read plugin-skills.md as system prompt
    const skillsPath = path.join(__dirname, '..', 'docs', 'plugin-skills.md');
    let skillsContent = '';
    
    if (fs.existsSync(skillsPath)) {
      skillsContent = fs.readFileSync(skillsPath, 'utf-8');
    }
    
    // Build system prompt
    const systemPrompt = `${skillsContent}

You are an expert plugin developer for Player Music app.
User wants to create a ${category} plugin.
Generate complete, working plugin code following the structure in the documentation.
Always include package.json and index.js.
Use markdown code blocks with language tags.`;
    
    // Get AI settings
    const settings = getSettings();
    const { aiProvider, aiSelectedModel, aiHeaders } = settings;
    
    if (!aiProvider || !aiProvider.apiKey) {
      return { ok: false, error: 'AI ayarları yapılmamış. Lütfen Ayarlar > AI bölümünden API anahtarınızı girin.' };
    }
    
    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];
    
    // Build headers
    const headers = {
      'Authorization': `Bearer ${aiProvider.apiKey}`,
      'Content-Type': 'application/json',
    };
    
    // Add custom headers
    if (aiHeaders && Array.isArray(aiHeaders)) {
      aiHeaders.forEach(h => {
        if (h.name && h.value) {
          headers[h.name] = h.value;
        }
      });
    }
    
    // Call API
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    const apiUrl = new URL(`${aiProvider.baseUrl}/chat/completions`);
    const protocol = apiUrl.protocol === 'https:' ? https : http;
    
    const requestBody = JSON.stringify({
      model: aiSelectedModel,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    });
    
    const options = {
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      path: apiUrl.pathname,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    return new Promise((resolve) => {
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode !== 200) {
              resolve({ ok: false, error: parsed.error?.message || `HTTP ${res.statusCode}` });
            } else {
              resolve({ ok: true, message: parsed.choices[0].message.content });
            }
          } catch (e) {
            resolve({ ok: false, error: 'Yanıt ayrıştırılamadı' });
          }
        });
      });
      
      req.on('error', (e) => {
        resolve({ ok: false, error: e.message });
      });
      
      req.write(requestBody);
      req.end();
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Save Plugin File Handler
ipcMain.handle('save-plugin-file', async (event, { content, defaultName, projectFolder }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Eklenti Dosyasını Kaydet',
      defaultPath: projectFolder ? path.join(projectFolder, defaultName || 'plugin.js') : (defaultName || 'plugin.js'),
      filters: [
        { name: 'JavaScript', extensions: ['js'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ]
    });
    
    if (result.canceled || !result.filePath) {
      return { ok: false };
    }
    
    fs.writeFileSync(result.filePath, content, 'utf-8');
    
    return { ok: true, path: result.filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Select Folder Dialog Handler
ipcMain.handle('select-folder-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Proje Klasörü Seçin',
      properties: ['openDirectory', 'createDirectory']
    });
    
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { ok: false };
    }
    
    return { ok: true, path: result.filePaths[0] };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Fetch Marketplace Plugins Handler
ipcMain.handle('fetch-marketplace-plugins', async () => {
  try {
    const client = await getDbClient();
    const result = await client.query(`
      SELECT id, name, description, category, author, keywords, 
             download_link, rating, downloads, created_at
      FROM plugins
      ORDER BY downloads DESC, rating DESC
      LIMIT 100
    `);
    
    return { 
      ok: true, 
      plugins: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        author: row.author,
        keywords: row.keywords,
        downloadLink: row.download_link,
        rating: row.rating || 0,
        downloads: row.downloads || 0,
        createdAt: row.created_at
      }))
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// === Missing IPC Handlers ===

ipcMain.handle('resolve-online-track', async (event, track) => {
  try {
    const url = track.pageUrl || track.url;
    if (!url) return { ok: false, error: 'URL gerekli' };

    // Get the metadata and direct stream URL in one go
    const info = await runYtdlpJson([
      '-j',
      '-f', 'bestaudio[ext=m4a]/bestaudio/best',
      '--no-playlist',
      url
    ]);

    return {
      ok: true,
      streamUrl: info.url,
      title: info.title || track.title || 'Bilinmeyen',
      artist: info.uploader || info.channel || track.artist || 'Bilinmeyen',
      duration: info.duration || track.duration || 0,
      thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails.length > 0 ? info.thumbnails[info.thumbnails.length - 1].url : '') || track.thumbnail || null,
      isVideo: false
    };
  } catch (e) {
    console.error('resolve-online-track failed:', e);
    // Fallback to try yt-dlp -g if full JSON dump failed
    try {
      const ytdlpPath = getBundledYtdlpPath();
      const url = track.pageUrl || track.url;
      const streamUrl = await new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, ['-g', '-f', 'bestaudio[ext=m4a]/bestaudio/best', '--no-playlist', url]);
        let output = '';
        let errOutput = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { errOutput += data.toString(); });
        proc.on('close', (code) => {
          if (code === 0 && output.trim()) resolve(output.trim());
          else reject(new Error(errOutput.trim() || `yt-dlp çıkış kodu: ${code}`));
        });
        proc.on('error', reject);
      });
      return {
        ok: true,
        streamUrl,
        title: track.title || 'Bilinmeyen',
        artist: track.artist || 'Bilinmeyen',
        duration: track.duration || 0,
        thumbnail: track.thumbnail || null,
        isVideo: false
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
});

ipcMain.handle('set-window-layout', (event, { tab, layoutMode, hasVideo }) => {
  try {
    applyWindowLayout(tab, layoutMode, hasVideo);
    return true;
  } catch (e) {
    console.error('set-window-layout failed:', e);
    return false;
  }
});

ipcMain.handle('get-metadata', async (event, filePath) => {
  return await extractMetadata(filePath);
});

ipcMain.handle('scan-source', (event, source) => {
  return resolveSourceFiles(source);
});

ipcMain.handle('playback-updated', (event, data) => {
  playbackState.isPlaying = data.isPlaying;
  playbackState.canGoPrev = data.canGoPrev;
  playbackState.canGoNext = data.canGoNext;
  updateThumbarButtons();
  updateTrayMenu();
  return true;
});

// === i18n — language switching for tray / notifications / window title ===
let currentLanguage = 'tr';
ipcMain.handle('set-language', (_event, lang) => {
  if (lang && (lang === 'tr' || lang === 'en')) {
    currentLanguage = lang;
    mainDict = loadMainDict(lang);
    updateTrayMenu();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle('Player');
    }
  }
  return currentLanguage;
});

ipcMain.handle('get-language', () => currentLanguage);

// Load translation dictionaries into the main process so the tray and
// notifications can render in the same language as the UI. The renderer's
// Code/src/locales/*.js files are the single source of truth — we re-read
// them when the language changes.
function loadMainDict(lang) {
  try {
    // main.js runs from the project root, Code/ is the React app source dir.
    const dictPath = path.join(__dirname, 'Code', 'src', 'locales', `${lang}.js`);
    if (!fs.existsSync(dictPath)) return {};
    // Strip the ESM `export default` and import the object literal.
    // Capacitor build doesn't touch this file, so a tiny regex loader is
    // good enough and avoids an extra dependency.
    const raw = fs.readFileSync(dictPath, 'utf8');
    const m = raw.match(/export\s+default\s+(\{[\s\S]*\})/);
    if (!m) return {};
    // eslint-disable-next-line no-new-func
    return new Function(`return (${m[1]});`)();
  } catch (e) {
    return {};
  }
}
let mainDict = loadMainDict('tr');
function tMain(key) {
  return mainDict[key] || key;
}
ipcMain.handle('get-i18n-dict', () => mainDict);

ipcMain.handle('refresh-i18n', () => {
  mainDict = loadMainDict(currentLanguage);
  return mainDict;
});

function getVlcPath() {
  const possiblePaths = [
    'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

ipcMain.handle('get-vlc-status', () => {
  const vlcPath = getVlcPath();
  return { available: vlcPath !== null };
});

ipcMain.handle('open-in-vlc', async (event, { target, startTime, stopTime }) => {
  const vlcPath = getVlcPath();
  if (!vlcPath) return { ok: false, error: 'VLC Media Player bulunamadı.' };
  
  const args = [];
  if (startTime) args.push(`--start-time=${startTime}`);
  if (stopTime) args.push(`--stop-time=${stopTime}`);
  args.push(target);
  
  try {
    spawn(vlcPath, args, { detached: true, stdio: 'ignore' }).unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

function getSystemLocale() {
  try {
    const { execSync } = require('child_process');
    const result = execSync('reg query "HKCU\\Control Panel\\International" /v LocaleName', { stdio: 'pipe' }).toString();
    const match = result.match(/LocaleName\s+REG_SZ\s+(.+)/);
    return match ? match[1].trim() : 'tr';
  } catch { return 'tr'; }
}

ipcMain.handle('get-locale', () => {
  try {
    return getSettings().language === 'system' ? getSystemLocale() : getSettings().language;
  } catch {
    return 'tr';
  }
});

ipcMain.handle('select-source-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio/Video Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'mp4', 'mkv', 'avi', 'mov', 'webm'] }]
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('select-source-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('validate-location', (event, inputPath) => {
  if (!inputPath) {
    return { ok: false, reason: 'Yol boş olamaz.' };
  }
  try {
    const resolvedPath = path.resolve(inputPath);
    if (!fs.existsSync(resolvedPath)) {
      return { ok: false, reason: 'Belirtilen dosya veya klasör bulunamadı.' };
    }
    return { ok: true, path: resolvedPath };
  } catch (err) {
    return { ok: false, reason: 'Geçersiz dosya/klasör yolu.' };
  }
});

// === Developer Logs (file persistence) ===
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'player.log');

ipcMain.handle('append-log', (event, { text, type, timestamp }) => {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date(timestamp).toISOString()}] [${(type || 'info').toUpperCase()}] ${text}\n`;
    fs.appendFileSync(logFile, line, 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('get-log-path', () => {
  return logFile;
});

ipcMain.handle('read-log-file', () => {
  try {
    if (fs.existsSync(logFile)) {
      return { ok: true, content: fs.readFileSync(logFile, 'utf8') };
    }
    return { ok: true, content: '' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('clear-log-file', () => {
  try {
    fs.writeFileSync(logFile, '', 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
