import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Lazy Electron IPC getter — doesn't crash in web mode
const getIpcRenderer = () => {
  try { return window.require('electron').ipcRenderer; }
  catch { return null; }
};

const DEFAULT_EQ = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const DEFAULT_AUDIO_EFFECTS = {
  clarity: 0,
  ambience: 0,
  surround: 0,
  dynamicBoost: 0,
  bassBoost: 0,
};

const DEFAULT_VIDEO_EFFECTS = {
  brightness: 100, contrast: 100, saturation: 100, gamma: 100, sharpness: 0,
  cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
  rotate: 0, flipH: false, flipV: false, zoom: 100,
  threshold: 0, posterize: 0, oldPhoto: false,
  psychedelic: false, waterRipple: false, anaglyph: false, tiles: 0, puzzle: 0,
  logoImage: null, logoOpacity: 100, logoX: 50, logoY: 50, logoSize: 15,
  textContent: '', textX: 50, textY: 90, textSize: 24, textColor: '#ffffff',
  motionBlur: 0,
};

const DEFAULT_AUDIO_V2 = {
  compressor: { threshold: 0, ratio: 1, knee: 30, attack: 0.003, release: 0.25, makeupGain: 0 },
  spatial: { enabled: false, positionX: 0, positionY: 0, positionZ: 0, coneInnerAngle: 360, coneOuterAngle: 360, coneOuterGain: 0, distanceModel: 'inverse', reverbMix: 0 },
  delay: { enabled: false, time: 0.3, feedback: 0.3, wetDry: 0.5 },
  expander: { enabled: false, threshold: -40, ratio: 2, attack: 0.01, release: 0.1 },
};

const DEFAULT_MAPPING = { avSyncOffset: 0, subtitleFile: null, subtitleTracks: [], activeSubtitle: null, subtitleOffset: 0, subtitleSize: 100, subtitleColor: '#ffffff' };

// Track schema placeholder (intentionally empty — chapters live on the track object)

const safeStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (/quota|exceeded/i.test(msg)) {
        try {
          localStorage.removeItem(name);
          localStorage.setItem(name, value);
        } catch {
          // swallow: never crash renderer on persist
        }
        return;
      }
      // swallow all persist write errors to keep UI alive
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

const toPersistedTrack = (track) => {
  if (!track || typeof track !== 'object') return null;
  return {
    id: track.id,
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
    genre: track.genre || '',
    year: track.year || 0,
    duration: track.duration || 0,
    location: track.location || '',
    url: track.url || '',
    streamUrl: track.streamUrl || '',
    type: track.type || '',
    trackNumber: track.trackNumber || 0,
    bpm: track.bpm || 0,
    picture: typeof track.picture === 'string' && track.picture.length < 2048 ? track.picture : null,
  };
};

export const useStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'tr',
      layoutMode: 'normal',
      accentColor: '#0f6cbd',
      transparencyLevel: 0, // 0-100
      sidebarMode: 'full', // 'full' | 'icons' | 'collapsed'
      sidebarToggleBehavior: 'fullToggle', // 'fullToggle' | 'iconsToggle'
      sidebarWidth: 256,
      keyboardShortcuts: {
        'play-pause': 'Space',
        'prev': 'ShiftLeft+ArrowLeft',
        'next': 'ShiftRight+ArrowRight',
        'seek-back': 'ArrowLeft',
        'seek-fwd': 'ArrowRight',
        'vol-up': 'ArrowUp',
        'vol-down': 'ArrowDown',
        'mute': 'KeyM',
        'visualizer': 'KeyV',
        'waveform': 'KeyW',
        'lyrics': 'KeyL',
        'rename': 'F2',
        'delete': 'Delete',
        'settings': 'ControlLeft+Comma',
        'search': 'ControlLeft+KeyF',
        'fullscreen': 'F11',
      },
      
      tracks: [],
      playlists: [],
      activePlaylist: 'all',
      searchQuery: '',
      isLoading: false,
      scanProgress: null, // { current, total, progress, status } from main process
      activeTab: 'home',
      
      currentTrack: null,
      playId: 0,
      isPlaying: false,
      volume: 80,
      progress: 0,
      duration: 0,
      lastPlayedTrack: null,
      lastPlayedPosition: 0,
      lastPlayedAt: null,
      
      shuffleMode: false,
      repeatMode: 'off',
      queue: [],
      currentIndex: -1,
      playbackRate: 1.0,
      muted: false,
      previousVolume: 80,
      
      categories: [],
      
      showVisualizer: false,
      showWaveform: false,
      showLyrics: false,
      contextMenu: null,
      dbEnabled: 0,
      libraryViewMode: 'grid', // 'grid' | 'list' | 'compact'
      
      audioEffects: { ...DEFAULT_AUDIO_EFFECTS },
      equalizerBands: [...DEFAULT_EQ],
      eqPresets: {
        'Düz': DEFAULT_EQ,
        'Pop': [3, 2, 0, -1, -2, -1, 0, 1, 2, 3],
        'Rock': [4, 3, 2, 1, -1, -2, -1, 0, 1, 2],
        'Klasik': [3, 3, 2, 2, 1, 1, 0, 0, 0, 0],
        'Bas Güçlendirme': [6, 5, 4, 3, 2, 1, 0, 0, 0, 0],
        'Tiz Güçlendirme': [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
        'Jazz': [2, 1, 0, 1, 2, 3, 2, 1, 0, -1],
        'Elektronik': [4, 2, 0, -1, 0, 2, 4, 3, 2, 1],
        'Hip Hop': [5, 4, 3, 1, 0, -1, 0, 1, 2, 3],
        'Dinamik Güç': [2, 1, 0, 0, 0, 0, 1, 2, 3, 4],
      },
      customPresets: {},
      selectedPreset: 'Düz',
      perTrackEq: {},
      perTrackEffects: {},
      perTrackVideoEffects: {},
      perTrackMapping: {},
      perTrackPresets: {},
      
      videoEffects: { ...DEFAULT_VIDEO_EFFECTS },
      audioV2: { ...DEFAULT_AUDIO_V2 },
      mapping: { ...DEFAULT_MAPPING },

      // LRCLib synced lyrics
      syncedLyrics: null, // raw LRC text
      syncedLyricsCues: [], // parsed cues [{ start, end, text }]
      syncedLyricsLoading: false,
      lastLyricsQuery: '', // cache key to avoid re-fetching same track

      tempTracks: {},
      autoEqRecommended: null,
      
      // AI Settings
      aiProvider: {
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api',
        apiKey: '',
      },
      aiModels: [
        { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B (Free)' },
        { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder (Free)' },
        { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Dolphin Mistral 24B Venice (Free)' },
      ],
      aiHeaders: [],
      aiSelectedModel: 'nvidia/nemotron-3-super-120b-a12b:free',
      
      // Effects Master Bypass (default: true = all effects OFF, pristine audio)
      effectsBypass: true,
      
      // Error Log System
      errors: [], // [{ message, name, componentStack, timestamp }]

      addError: (message, details = {}) => {
        const errorEntry = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          message: String(message || 'Unknown error').slice(0, 200),
          name: details.name || 'Error',
          componentStack: details.componentStack || null,
          context: details.context || null,
          timestamp: Date.now(),
        };
        set((s) => ({
          errors: [errorEntry, ...(s.errors || [])].slice(0, 50),
        }));
      },

      clearErrors: () => set({ errors: [] }),

      // Developer Console
      devLogsEnabled: false,
      logs: [],
      
      // Plugin System
      pluginSkillsPath: '',
      installedPlugins: [],
      publishedPlugins: [],
      marketplacePlugins: [],
      
      // Sleep Timer (minutes, null = off)
      sleepTimer: null,
      sleepTimerEnd: null,

      // Recently played history (max 20 entries: trackId + timestamp)
      playHistory: [],

      // Volume Boost (1.0 = normal, 2.0 = max boost)
      volumeBoost: 1.0,
      
      // Crossfade (0=off, 1-10 seconds)
      crossfadeDuration: 3,

      // Per-track playback positions (trackId → seconds) — resume where you left off
      playbackPositions: {},
      
      // Google Auth
      googleUser: null,
      
      // AI Chat State
      aiChatMessages: [],
      aiChatLoading: false,
      selectedPluginCategory: 'skin',
      
      // Basic setters
      setIsLoading: (v) => set({ isLoading: v }),
      setScanProgress: (p) => set({ scanProgress: p }),
      setTheme: (t) => set({ theme: t }),
      setLanguage: (l) => set({ language: l }),
      setLayoutMode: (m) => set({ layoutMode: m }),
      setActiveTab: (t) => set({ activeTab: t }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setShowVisualizer: (v) => set({ showVisualizer: v }),
      setShowWaveform: (v) => set({ showWaveform: v }),
      setShowLyrics: (v) => set({ showLyrics: v }),
      setContextMenu: (v) => set({ contextMenu: v }),
      setDbEnabled: (v) => set({ dbEnabled: v }),
      setLibraryViewMode: (m) => set({ libraryViewMode: m }),
      setAccentColor: (c) => set({ accentColor: c }),
      setTransparencyLevel: (t) => set({ transparencyLevel: t }),
      setSidebarMode: (m) => set({ sidebarMode: m }),
      setSidebarToggleBehavior: (b) => set({ sidebarToggleBehavior: b }),
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setKeyboardShortcuts: (shortcuts) => set({ keyboardShortcuts: shortcuts }),
      setAiSelectedModel: (m) => set({ aiSelectedModel: m }),
      setPluginSkillsPath: (p) => set({ pluginSkillsPath: p }),
      setGoogleUser: (u) => set({ googleUser: u }),
      setSleepTimer: (t) => set({ sleepTimer: t, sleepTimerEnd: t ? Date.now() + t * 60000 : null }),
      addToHistory: (trackId) => set((s) => {
        const filtered = s.playHistory.filter((e) => e.trackId !== trackId);
        const newEntry = { trackId, playedAt: Date.now() };
        return { playHistory: [newEntry, ...filtered].slice(0, 20) };
      }),
      clearHistory: () => set({ playHistory: [] }),
      setVolumeBoost: (b) => set({ volumeBoost: Math.max(1.0, Math.min(2.0, b)) }),
      setCrossfadeDuration: (d) => set({ crossfadeDuration: Math.max(0, Math.min(10, d)) }),
      setEffectsBypass: (v) => set({ effectsBypass: v }),
      toggleMute: () => set((state) => {
        if (state.muted) {
          return { muted: false, volume: state.previousVolume || 80 };
        }
        return { muted: true, previousVolume: state.volume };
      }),
      setMuted: (v) => set((state) => {
        if (v && !state.muted) return { muted: true, previousVolume: state.volume };
        if (!v && state.muted) return { muted: false, volume: state.previousVolume || 80 };
        return {};
      }),
      // Per-track position save (capped at 100 entries to prevent bloat)
      savePlaybackPosition: (trackId, position) => {
        if (!trackId || typeof position !== 'number' || position < 0) return;
        set((state) => {
          const positions = { ...state.playbackPositions, [trackId]: Math.floor(position) };
          // Cap at 100 entries — remove oldest by sorting by value (position as proxy for recency)
          const keys = Object.keys(positions);
          if (keys.length > 100) {
            const sorted = keys.sort((a, b) => positions[a] - positions[b]);
            const toRemove = sorted.slice(0, keys.length - 100);
            toRemove.forEach(k => delete positions[k]);
          }
          return { playbackPositions: positions };
        });
      },
      setDevLogsEnabled: (v) => set({ devLogsEnabled: v }),
      addLog: (text, type = 'info') => {
        const entry = { text, type, timestamp: Date.now(), id: `log-${Date.now()}-${Math.random().toString(36).slice(2,6)}` };
        // Dosyaya sadece devLogsEnabled açık ise yaz (arka planda, bekleme yok)
        try {
          if (get().devLogsEnabled) {
            getIpcRenderer()?.invoke('append-log', { text, type, timestamp: Date.now() }).catch(() => {});
          }
        } catch {}
        set((state) => ({ logs: [...state.logs.slice(-499), entry] }));
      },
      clearLogs: () => {
        // Belleği ve dosyayı birlikte temizle
        try {
          getIpcRenderer()?.invoke('clear-log-file').catch(() => {});
        } catch {}
        set({ logs: [] });
      },
      addAiChatMessage: (msg) => set((state) => ({
        aiChatMessages: [...state.aiChatMessages, { ...msg, timestamp: Date.now() }]
      })),
      clearAiChat: () => set({ aiChatMessages: [] }),
      setAiChatLoading: (v) => set({ aiChatLoading: v }),
      setSelectedPluginCategory: (c) => set({ selectedPluginCategory: c }),
      installPlugin: (plugin) => set((state) => ({
        installedPlugins: [...state.installedPlugins, { ...plugin, installedAt: Date.now(), enabled: true }]
      })),
      uninstallPlugin: (pluginId) => set((state) => ({
        installedPlugins: state.installedPlugins.filter(p => p.id !== pluginId)
      })),
      togglePlugin: (pluginId) => set((state) => ({
        installedPlugins: state.installedPlugins.map(p =>
          p.id === pluginId ? { ...p, enabled: !p.enabled } : p
        )
      })),
      publishPlugin: (plugin) => set((state) => ({
        publishedPlugins: [...state.publishedPlugins, { ...plugin, publishedAt: Date.now() }]
      })),
      ratePlugin: (pluginId, rating) => set((state) => ({
        marketplacePlugins: state.marketplacePlugins.map(p =>
          p.id === pluginId ? { ...p, userRating: rating } : p
        )
      })),
      setShuffleMode: (enabled) => {
        const { tracks, currentTrack } = get();
        if (!currentTrack) { set({ shuffleMode: enabled, repeatMode: enabled ? 'off' : get().repeatMode }); return; }
        const queue = enabled ? [...tracks].sort(() => Math.random() - 0.5) : [...tracks];
        set({ shuffleMode: enabled, repeatMode: enabled ? 'off' : get().repeatMode, queue, currentIndex: queue.findIndex(t => t.id === currentTrack.id) });
      },
      setRepeatMode: (mode) => set((state) => ({
        repeatMode: mode,
        shuffleMode: mode !== 'off' ? false : state.shuffleMode
      })),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setVolume: (v) => set({ volume: v }),
      setProgress: (p) => set({ progress: p }),
      setDuration: (d) => set({ duration: d }),
      setLastPlayedTrack: (track, position) => set({
        lastPlayedTrack: track,
        lastPlayedPosition: position || 0,
        lastPlayedAt: Date.now()
      }),
      clearLastPlayed: () => set({ lastPlayedTrack: null, lastPlayedPosition: 0, lastPlayedAt: null }),
      
      // Track management
      renameTrack: (trackId, newName) => set((state) => ({
        tracks: state.tracks.map(t => t.id === trackId ? { ...t, title: newName } : t)
      })),
      deleteTrack: (trackId) => set((state) => ({
        tracks: state.tracks.filter(t => t.id !== trackId),
        currentTrack: state.currentTrack?.id === trackId ? null : state.currentTrack
      })),
      
      // Categories
      addCategory: (name) => set((state) => ({
        categories: [...state.categories, { id: `cat-${Date.now()}`, name, tracks: [] }]
      })),
      removeCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
      })),
      addTrackToCategory: (categoryId, trackId) => set((state) => {
        const category = state.categories.find(c => c.id === categoryId);
        if (!category) return {};
        return {
          categories: state.categories.map(c =>
            c.id === categoryId ? { ...c, tracks: [...c.tracks.filter(id => id !== trackId), trackId] } : c
          ),
          tracks: state.tracks.map(t =>
            t.id === trackId ? { ...t, category: category.name } : t
          )
        };
      }),
      
      // Playlist management
      createPlaylist: async (name) => {
        try {
          const result = await getIpcRenderer()?.invoke('db-create-playlist', name);
          if (result) {
            set((state) => ({ playlists: [...state.playlists, result] }));
            get().addLog(`📋 Yeni çalma listesi oluşturuldu: ${name}`, 'success');
          }
        } catch (e) { get().addLog('Çalma listesi oluşturulamadı', 'error'); }
      },
      renamePlaylist: async (id, newName) => {
        try {
          await getIpcRenderer()?.invoke('db-rename-playlist', id, newName);
          set((state) => ({ playlists: state.playlists.map(p => p.id === id ? { ...p, name: newName } : p) }));
          get().addLog(`✏️ Çalma listesi yeniden adlandırıldı: ${newName}`, 'success');
        } catch (e) { get().addLog('Yeniden adlandırma başarısız', 'error'); }
      },
      deletePlaylist: async (id) => {
        try {
          await getIpcRenderer()?.invoke('db-delete-playlist', id);
          set((state) => ({ playlists: state.playlists.filter(p => p.id !== id), activePlaylist: state.activePlaylist === id ? 'all' : state.activePlaylist }));
          get().addLog('🗑️ Çalma listesi silindi', 'info');
        } catch (e) { get().addLog('Çalma listesi silinemedi', 'error'); }
      },
      addToPlaylist: async (playlistId, trackId) => {
        try {
          await getIpcRenderer()?.invoke('db-add-to-playlist', playlistId, trackId);
          get().addLog('➕ Şarkı çalma listesine eklendi', 'info');
        } catch (e) { get().addLog('Şarkı eklenemedi', 'error'); }
      },
      removeFromPlaylist: async (playlistId, trackId) => {
        try {
          await getIpcRenderer()?.invoke('db-remove-from-playlist', playlistId, trackId);
          set((state) => ({ tracks: state.tracks }));
          get().addLog('➖ Şarkı çalma listesinden çıkarıldı', 'info');
        } catch (e) {}
      },
      setActivePlaylist: (id) => set({ activePlaylist: id }),
      loadPlaylists: async () => {
        try {
          const pls = await getIpcRenderer()?.invoke('db-get-playlists');
          set({ playlists: pls });
        } catch (e) {}
      },
      
      // Queue management
      addToQueue: (track) => {
        const { queue, currentTrack, tracks } = get();
        if (!currentTrack) { get().playTrack(track); return; }
        const idx = queue.findIndex(t => t.id === track.id);
        if (idx >= 0) return;
        set({ queue: [...queue, track] });
        get().addLog(`➕ Sıraya eklendi: ${track.title}`, 'info');
      },
      playNext: (track) => {
        const { queue, currentIndex, currentTrack, tracks } = get();
        if (!currentTrack) { get().playTrack(track); return; }
        const insertAt = currentIndex + 1;
        const newQueue = [...queue];
        newQueue.splice(insertAt, 0, track);
        set({ queue: newQueue });
        get().addLog(`⏭️ Sıradaki: ${track.title}`, 'info');
      },
      removeFromQueue: (trackId) => {
        const { queue, currentIndex, currentTrack } = get();
        const newQueue = queue.filter(t => t.id !== trackId);
        const removedBefore = queue.slice(0, currentIndex).filter(t => t.id === trackId).length;
        set({ queue: newQueue, currentIndex: currentIndex - removedBefore });
      },
      clearQueue: () => set({ queue: [], currentIndex: -1 }),
      reorderQueue: (fromIndex, toIndex) => {
        const { queue, currentIndex } = get();
        if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) return;
        const newQueue = [...queue];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);
        // Adjust currentIndex if the currently-playing track was moved
        let newIndex = currentIndex;
        if (currentIndex === fromIndex) newIndex = toIndex;
        else if (fromIndex < currentIndex && toIndex >= currentIndex) newIndex--;
        else if (fromIndex > currentIndex && toIndex <= currentIndex) newIndex++;
        set({ queue: newQueue, currentIndex: newIndex });
      },
      
      // Import/Export
      exportPlaylistAsM3U: async (playlistId, playlistName) => {
        try {
          const result = await getIpcRenderer()?.invoke('export-playlist-m3u', playlistId, playlistName);
          if (result.error) { get().addLog(`Dışa aktarılamadı: ${result.error}`, 'error'); return; }
          if (result.canceled) return;
          get().addLog(`📁 Çalma listesi dışa aktarıldı: ${result.path}`, 'success');
        } catch (e) { get().addLog('Dışa aktarma başarısız', 'error'); }
      },
      importM3U: async () => {
        try {
          const result = await getIpcRenderer()?.invoke('import-m3u');
          if (result.error) { get().addLog(`İçe aktarılamadı: ${result.error}`, 'error'); return; }
          if (result.canceled) return;
          if (result.imported > 0) {
            get().addLog(`📥 ${result.imported} şarkı M3U\'dan içe aktarıldı`, 'success');
            get().refreshLibrary();
          } else {
            get().addLog('İçe aktarılacak yeni şarkı bulunamadı', 'info');
          }
        } catch (e) { get().addLog('M3U içe aktarma başarısız', 'error'); }
      },
      exportLibraryBackup: async () => {
        try {
          const result = await getIpcRenderer()?.invoke('export-library-json');
          if (result.error) { get().addLog(`Yedek alınamadı: ${result.error}`, 'error'); return; }
          if (result.canceled) return;
          get().addLog(`💾 Kütüphane yedeği alındı (${result.trackCount} şarkı)`, 'success');
        } catch (e) { get().addLog('Yedekleme başarısız', 'error'); }
      },
      importLibraryBackup: async () => {
        try {
          const result = await getIpcRenderer()?.invoke('import-library-json');
          if (result.error) { get().addLog(`Geri yüklenemedi: ${result.error}`, 'error'); return; }
          if (result.canceled) return;
          get().addLog(`📂 Kütüphane geri yüklendi (${result.imported}/${result.totalTracks} yeni şarkı)`, 'success');
          get().refreshLibrary();
        } catch (e) { get().addLog('Geri yükleme başarısız', 'error'); }
      },
      
      // Equalizer
      _checkAndApplyAutoBypass: (bands, effects) => {
        const allBandsZero = bands.every(b => b === 0);
        const allEffectsZero = Object.values(effects).every(v => v === 0);
        return allBandsZero && allEffectsZero;
      },
      setEqualizerBand: (index, value) => set((state) => {
        const bands = [...state.equalizerBands];
        bands[index] = value;
        const autoBypass = get()._checkAndApplyAutoBypass(bands, state.audioEffects);
        return { equalizerBands: bands, selectedPreset: 'Özel', effectsBypass: autoBypass };
      }),
      applyPreset: (name) => {
        const presets = { ...get().eqPresets, ...get().customPresets };
        const bands = presets[name];
        if (bands) set({ equalizerBands: [...bands], selectedPreset: name, effectsBypass: false });
      },
      saveCustomPreset: (name, bands) => set((state) => ({
        customPresets: { ...state.customPresets, [name]: [...bands] },
        selectedPreset: name,
      })),
      deleteCustomPreset: (name) => set((state) => {
        const presets = { ...state.customPresets };
        delete presets[name];
        return { customPresets: presets };
      }),
      setAudioEffect: (effect, value) => set((state) => {
        const newEffects = { ...state.audioEffects, [effect]: value };
        const autoBypass = get()._checkAndApplyAutoBypass(state.equalizerBands, newEffects);
        const trackId = state.currentTrack?.id;
        if (trackId) return { audioEffects: newEffects, perTrackEffects: { ...state.perTrackEffects, [trackId]: newEffects }, effectsBypass: autoBypass };
        return { audioEffects: newEffects, effectsBypass: autoBypass };
      }),
      setPerTrackEq: (trackId, bands) => set((state) => ({
        perTrackEq: { ...state.perTrackEq, [trackId]: bands }
      })),
      // Per-track preset binding: map trackId → preset name (built-in or custom).
      // When the user switches to a track, its saved preset is auto-applied via
      // the `useAudioPlayer` track-change effect.
      perTrackPresets: {},
      setPerTrackPreset: (trackId, presetName) => set((state) => {
        if (!trackId) return {};
        const presets = { ...state.perTrackPresets };
        // Validate: only bind if preset exists in built-in or custom
        const all = { ...state.eqPresets, ...state.customPresets };
        if (!presetName || presetName === 'Düz' || !all[presetName]) {
          delete presets[trackId];
        } else {
          presets[trackId] = presetName;
        }
        // Also apply preset bands to per-track EQ so the audio path picks them up
        // immediately for the current track.
        const bands = all[presetName];
        const next = { perTrackPresets: presets };
        if (bands && state.currentTrack?.id === trackId) {
          next.equalizerBands = [...bands];
          next.selectedPreset = presetName;
          next.effectsBypass = false;
        }
        return next;
      }),
      setAutoEqRecommended: (rec) => set({ autoEqRecommended: rec }),
      
      // Video Effects
      setVideoEffect: (effect, value) => set((state) => {
        const newEffects = { ...state.videoEffects, [effect]: value };
        const trackId = state.currentTrack?.id;
        if (trackId) return { videoEffects: newEffects, perTrackVideoEffects: { ...state.perTrackVideoEffects, [trackId]: newEffects } };
        return { videoEffects: newEffects };
      }),
      setVideoEffectsBulk: (effects) => set((state) => {
        const newEffects = { ...state.videoEffects, ...effects };
        const trackId = state.currentTrack?.id;
        if (trackId) return { videoEffects: newEffects, perTrackVideoEffects: { ...state.perTrackVideoEffects, [trackId]: newEffects } };
        return { videoEffects: newEffects };
      }),
      
      // Audio V2 (compressor, spatial, delay, expander)
      setAudioV2Node: (node, key, value) => set((state) => {
        const newAudioV2 = { ...state.audioV2, [node]: { ...state.audioV2[node], [key]: value } };
        return { audioV2: newAudioV2, effectsBypass: false };
      }),
      setAudioV2Bulk: (audioV2) => set((state) => {
        const merged = {
          compressor: { ...state.audioV2.compressor, ...(audioV2.compressor || {}) },
          spatial: { ...state.audioV2.spatial, ...(audioV2.spatial || {}) },
          delay: { ...state.audioV2.delay, ...(audioV2.delay || {}) },
          expander: { ...state.audioV2.expander, ...(audioV2.expander || {}) },
        };
        return { audioV2: merged };
      }),
      
      // Mapping
      setMapping: (key, value) => set((state) => {
        const newMapping = { ...state.mapping, [key]: value };
        const trackId = state.currentTrack?.id;
        if (trackId && ['avSyncOffset', 'subtitleOffset', 'subtitleSize', 'subtitleColor'].includes(key)) {
          return { mapping: newMapping, perTrackMapping: { ...state.perTrackMapping, [trackId]: newMapping } };
        }
        return { mapping: newMapping };
      }),
      setSubtitleTracks: (tracks) => set((state) => ({
        mapping: { ...state.mapping, subtitleTracks: tracks }
      })),
      setActiveSubtitle: (id) => set((state) => ({
        mapping: { ...state.mapping, activeSubtitle: id }
      })),

      // LRCLib synced lyrics setters
      setSyncedLyrics: (lrcText, cues) => set({
        syncedLyrics: lrcText,
        syncedLyricsCues: cues,
        syncedLyricsLoading: false,
      }),
      setSyncedLyricsLoading: (loading) => set({ syncedLyricsLoading: loading }),
      clearSyncedLyrics: () => set({
        syncedLyrics: null,
        syncedLyricsCues: [],
        syncedLyricsLoading: false,
        lastLyricsQuery: '',
      }),
      setLastLyricsQuery: (query) => set({ lastLyricsQuery: query }),

      // Temp tracks
      addTempTrack: (track) => set((state) => ({
        tempTracks: { ...state.tempTracks, [track.id]: track }
      })),
      removeTempTrack: (trackId) => set((state) => {
        const temps = { ...state.tempTracks };
        delete temps[trackId];
        return { tempTracks: temps };
      }),
      
      refreshLibrary: async () => {
        set({ isLoading: true, scanProgress: null });
        // Listen for scan progress from main process (remove old listener first)
        getIpcRenderer()?.removeAllListeners('library-scan-progress');
        getIpcRenderer()?.on('library-scan-progress', (_e, p) => {
          set({ scanProgress: p });
          if (p.current >= p.total && p.total > 0) {
            // Scan complete — remove listener and refresh library data
            getIpcRenderer()?.removeAllListeners('library-scan-progress');
            setTimeout(() => set({ scanProgress: null }), 2000);
          }
        });
        try {
          const state = await getIpcRenderer()?.invoke('get-library-state');
          set({ tracks: state.tracks || [], playlists: state.playlists || [], isLoading: false });
          get().loadPlaylists();
        } catch (e) { set({ isLoading: false }); }
      },
      
      // Reset audio to defaults
      resetAudioSettings: () => {
        set({
          equalizerBands: [...DEFAULT_EQ],
          selectedPreset: 'Düz',
          audioEffects: { ...DEFAULT_AUDIO_EFFECTS },
          audioV2: { ...DEFAULT_AUDIO_V2 },
        });
        get().addLog('Ses ayarları fabrika ayarlarına döndürüldü', 'success');
      },
      
      // Reset video/display to defaults
      resetVideoSettings: () => {
        set({
          videoEffects: { ...DEFAULT_VIDEO_EFFECTS },
          showVisualizer: false,
          showWaveform: false,
        });
        get().addLog('Görüntü ayarları fabrika ayarlarına döndürüldü', 'success');
      },
      
      // Master reset: ALL effects OFF + bypass ON
      resetAllEffects: () => {
        set({
          effectsBypass: true,
          equalizerBands: [...DEFAULT_EQ],
          selectedPreset: 'Düz',
          audioEffects: { ...DEFAULT_AUDIO_EFFECTS },
          audioV2: { ...DEFAULT_AUDIO_V2 },
          videoEffects: { ...DEFAULT_VIDEO_EFFECTS },
          showVisualizer: false,
          showWaveform: false,
        });
        get().addLog('Tüm efektler sıfırlandı ve bypass edildi', 'success');
      },
      
      playTrack: (track) => {
        const { tracks, playId, queue: existingQueue } = get();
        if (track) {
          // Track play history (most recent first, max 20)
          get().addToHistory(track.id);
        }
        if (track && get().perTrackEq[track.id]) set({ equalizerBands: [...get().perTrackEq[track.id]] });
        if (track && get().perTrackEffects[track.id]) set({ audioEffects: { ...get().perTrackEffects[track.id] } });
        if (track && get().perTrackVideoEffects[track.id]) set({ videoEffects: { ...get().perTrackVideoEffects[track.id] } });
        if (track && get().perTrackMapping[track.id]) set({ mapping: { ...get().perTrackMapping[track.id] } });
        // Auto-apply per-track preset binding (trackId → presetName)
        if (track) {
          const presetName = get().perTrackPresets?.[track.id];
          if (presetName) {
            const all = { ...get().eqPresets, ...get().customPresets };
            const bands = all[presetName];
            if (bands) set({ equalizerBands: [...bands], selectedPreset: presetName, effectsBypass: false });
          }
        }
        // Reuse existing queue if it has content (playlist context), otherwise create from all tracks
        const queue = existingQueue && existingQueue.length > 0 ? existingQueue : [...tracks];
        const index = queue.findIndex(t => t.id === track.id);
        // Increment play count
        const updatedTracks = tracks.map(t => 
          t.id === track.id ? { ...t, playCount: (t.playCount || 0) + 1, lastPlayedAt: Date.now() } : t
        );
        set({ 
          tracks: updatedTracks, 
          currentTrack: { ...track, playCount: (track.playCount || 0) + 1, lastPlayedAt: Date.now() }, 
          isPlaying: true, 
          progress: 0, 
          playId: playId + 1, 
          queue, 
          currentIndex: index >= 0 ? index : 0 
        });
        try { get().addLog(`🎵 Oynatılıyor: ${track.title}`, 'info'); } catch {}
      },
      
      nextTrack: () => {
        const { queue, currentIndex, repeatMode, playId } = get();
        if (repeatMode === 'track') { set({ progress: 0, isPlaying: true, playId: playId + 1 }); return; }
        let nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          nextIndex = 0; // Always wrap to start (never stop)
        }
        const next = queue[nextIndex];
        if (!next) return;
        if (get().perTrackEq[next.id]) set({ equalizerBands: [...get().perTrackEq[next.id]] });
        if (get().perTrackEffects[next.id]) set({ audioEffects: { ...get().perTrackEffects[next.id] } });
        if (get().perTrackVideoEffects[next.id]) set({ videoEffects: { ...get().perTrackVideoEffects[next.id] } });
        if (get().perTrackMapping[next.id]) set({ mapping: { ...get().perTrackMapping[next.id] } });
        const nextPresetName = get().perTrackPresets?.[next.id];
        if (nextPresetName) {
          const allNext = { ...get().eqPresets, ...get().customPresets };
          const bands = allNext[nextPresetName];
          if (bands) set({ equalizerBands: [...bands], selectedPreset: nextPresetName, effectsBypass: false });
        }
        set({ currentTrack: next, currentIndex: nextIndex, progress: 0, isPlaying: true, playId: playId + 1 });
      },

      previousTrack: () => {
        const { queue, currentIndex, playId } = get();
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = queue.length - 1;
        const prev = queue[prevIndex];
        if (!prev) return;
        if (get().perTrackEq[prev.id]) set({ equalizerBands: [...get().perTrackEq[prev.id]] });
        if (get().perTrackEffects[prev.id]) set({ audioEffects: { ...get().perTrackEffects[prev.id] } });
        if (get().perTrackVideoEffects[prev.id]) set({ videoEffects: { ...get().perTrackVideoEffects[prev.id] } });
        if (get().perTrackMapping[prev.id]) set({ mapping: { ...get().perTrackMapping[prev.id] } });
        const prevPresetName = get().perTrackPresets?.[prev.id];
        if (prevPresetName) {
          const allPrev = { ...get().eqPresets, ...get().customPresets };
          const bands = allPrev[prevPresetName];
          if (bands) set({ equalizerBands: [...bands], selectedPreset: prevPresetName, effectsBypass: false });
        }
        set({ currentTrack: prev, currentIndex: prevIndex, progress: 0, isPlaying: true, playId: playId + 1 });
      },
    }),
    {
      name: 'player-v4-storage',
      partialize: (state) => ({
        // UI preferences (small, safe)
        theme: state.theme, language: state.language, layoutMode: state.layoutMode,
        volume: state.volume, previousVolume: state.previousVolume, muted: state.muted, shuffleMode: state.shuffleMode, repeatMode: state.repeatMode,
        playbackRate: state.playbackRate,
        equalizerBands: state.equalizerBands,
        customPresets: state.customPresets, selectedPreset: state.selectedPreset,
        videoEffects: state.videoEffects, audioV2: state.audioV2,
        mapping: {
          ...state.mapping,
          subtitleTracks: [], // never persist large subtitle timelines
          activeSubtitle: state.mapping?.activeSubtitle ? {
            id: state.mapping.activeSubtitle.id,
            label: state.mapping.activeSubtitle.label || '',
            language: state.mapping.activeSubtitle.language || '',
          } : null,
        },
        showVisualizer: state.showVisualizer, showWaveform: state.showWaveform, showLyrics: state.showLyrics,
        pluginSkillsPath: state.pluginSkillsPath,
        installedPlugins: state.installedPlugins,
        publishedPlugins: state.publishedPlugins,
        lastPlayedTrack: toPersistedTrack(state.lastPlayedTrack),
        lastPlayedPosition: state.lastPlayedPosition,
        lastPlayedAt: state.lastPlayedAt,
        accentColor: state.accentColor,
        transparencyLevel: state.transparencyLevel,
        sidebarMode: state.sidebarMode,
        sidebarToggleBehavior: state.sidebarToggleBehavior,
        sidebarWidth: state.sidebarWidth,
        keyboardShortcuts: state.keyboardShortcuts,
        googleUser: state.googleUser,
        effectsBypass: state.effectsBypass,
        crossfadeDuration: state.crossfadeDuration,
        // Per-track positions (capped at 100)
        playbackPositions: (() => {
          const p = state.playbackPositions || {};
          const keys = Object.keys(p);
          if (keys.length <= 100) return p;
          const sorted = keys.sort((a, b) => p[a] - p[b]);
          const capped = {};
          sorted.slice(-100).forEach(k => capped[k] = p[k]);
          return capped;
        })(),
        devLogsEnabled: state.devLogsEnabled,
        activePlaylist: state.activePlaylist,
        // Queue persistence (capped + sanitized to prevent localStorage bloat)
        queue: (state.queue || []).slice(0, 25).map(toPersistedTrack).filter(Boolean),
        currentIndex: Math.max(-1, Math.min((state.currentIndex ?? -1), 24)),
        // Per-track preset bindings (small, bounded — trackId → preset name)
        perTrackPresets: (() => {
          const p = state.perTrackPresets || {};
          const keys = Object.keys(p);
          if (keys.length <= 200) return p;
          const capped = {};
          keys.slice(-200).forEach(k => capped[k] = p[k]);
          return capped;
        })(),
        // Per-track settings excluded (too large/unbounded)
      }),
      storage: createJSONStorage(() => safeStorage),
      // Graceful fallback if localStorage is full
      onError: (err) => {
        console.warn('Storage persist error:', err.message);
        // Don't crash — state just won't persist this change
      },
    }
  )
);
