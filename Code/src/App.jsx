import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import { useStore } from './store';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { Play, Pause, SkipBack, SkipForward, Search, Settings, Download, ListMusic, Minus, X, Menu, Volume2, Maximize2, MonitorPlay, MoreHorizontal, Sliders, Activity, Shuffle, Repeat, Music, Trash2, Edit3, Scissors, Radio, Eye, RotateCcw, RotateCw, Grid, List, LayoutList, Tag, Check, ArrowUp, ArrowDown, Film, FileAudio, Info, FolderOpen, Plus, Square, Video, Copy, Crop, Subtitles, Minimize2, GripVertical, Moon } from 'lucide-react';
import appIcon from './assets/icon.png';
import { isElectron, isMacOS, isMobile, getPlatform } from './platform';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import { GridTrack, ListTrack, CompactTrack, ContextMenu } from './components/TrackComponents';
import { cn } from './lib/utils';
import { fetchSyncedLyrics, parseLRC } from './services/lrclib';
import ToastContainer, { showToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ShortcutsHelp from './components/ShortcutsHelp';
import RecentlyPlayed from './components/RecentlyPlayed';
import BottomNav from './components/BottomNav';
const Downloader = React.lazy(() => import('./components/Downloader'));
const EqualizerModal = React.lazy(() => import('./components/EqualizerModal'));
const EffectsModal = React.lazy(() => import('./components/EffectsModal'));
const SettingsPage = React.lazy(() => import('./components/Settings'));
const Waveform = React.lazy(() => import('./components/Waveform'));
const SpectrumAnalyzer = React.lazy(() => import('./components/SpectrumAnalyzer'));
const Visualizer3DSphere = React.lazy(() => import('./components/Visualizer'));
const LyricsPanel = React.lazy(() => import('./components/LyricsPanel'));
const VideoPlayer = React.lazy(() => import('./components/VideoPlayer'));

// ============================================================
//  Global error handlers — log uncaught errors to console so
//  the main process can mirror them to userData/logs/main.log
// ============================================================
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('[uncaught]', e?.message, e?.filename ? `(${e.filename}:${e.lineno})` : '', e?.error?.stack || '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[unhandledrejection]', e?.reason?.message || e?.reason, e?.reason?.stack || '');
  });
  console.log('[renderer] App.jsx module loaded');
}

const App = () => {
  const { 
    theme, isPlaying, togglePlay, currentTrack, tracks, 
    refreshLibrary, progress, duration, playTrack,
    layoutMode, setLayoutMode, volume, setVolume, activeTab, setActiveTab, categories, addCategory, addTrackToCategory,
    searchQuery, setSearchQuery, shuffleMode, setShuffleMode, repeatMode, setRepeatMode,
    nextTrack, previousTrack, playbackRate, setPlaybackRate,
    showVisualizer, setShowVisualizer, showWaveform, setShowWaveform, showLyrics, setShowLyrics,
    contextMenu, setContextMenu, dbEnabled, libraryViewMode, setLibraryViewMode, isLoading, scanProgress,
    lastPlayedTrack, lastPlayedPosition, setLastPlayedTrack, sidebarMode, setSidebarMode, sidebarToggleBehavior, sidebarWidth, setSidebarWidth, keyboardShortcuts,
    accentColor,
    playlists, activePlaylist, setActivePlaylist, createPlaylist, renamePlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist,
    queue: queueTracks, addToQueue, playNext, removeFromQueue, clearQueue, reorderQueue,
    importM3U, exportPlaylistAsM3U, exportLibraryBackup, importLibraryBackup,
    sleepTimer, sleepTimerEnd, setSleepTimer, volumeBoost, setVolumeBoost,
    crossfadeDuration, setCrossfadeDuration,
    favorites, toggleFavorite,
    addLog,
    syncedLyricsCues, syncedLyricsLoading, setSyncedLyrics, setSyncedLyricsLoading, clearSyncedLyrics, lastLyricsQuery, setLastLyricsQuery
  } = useStore();
  
  const { audioRef, analyserRef } = useAudioPlayer();
  const [showVolumePop, setShowVolumePop] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPlaybackRate, setShowPlaybackRate] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // ⚡ Hide branded splash screen once React has rendered meaningful content
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__hideSplash) return;
    // Wait for the next frame so React's first paint has flushed
    let raf1, raf2, timeoutId;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        // Double-RAF + small timeout guarantees the splash stays visible
        // until the app's bg color (#0a0a0f) is painted behind it
        timeoutId = setTimeout(() => window.__hideSplash(), 80);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timeoutId);
    };
  }, []);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSeeking, setIsSeeking] = useState(false);
  const [visualizerOpacity, setVisualizerOpacity] = useState(0.7);
  const [visualizerMode, setVisualizerMode] = useState('spectrum');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showVisualizerControls, setShowVisualizerControls] = useState(false);
  const [mediaFullscreen, setMediaFullscreen] = useState(false);
  const [showFSMenu, setShowFSMenu] = useState(false);
  const volumePopRef = useRef(null);
  const moreMenuRef = useRef(null);
  const ctxRef = useRef(null);
  const sidebarResizeRef = useRef(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const lastClickedIdxRef = useRef(null);
  const selectedTrackIdsRef = useRef([]);
  const [currentPlaylistTracks, setCurrentPlaylistTracks] = useState(null);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  // Keep ref in sync
  useEffect(() => { selectedTrackIdsRef.current = selectedTrackIds; }, [selectedTrackIds]);

  // Safe track data
  const safeTracks = useMemo(() => {
    try {
      return Array.isArray(tracks) ? tracks : [];
    } catch { return []; }
  }, [tracks]);

  // Performance: memoized filtered tracks
  const filteredTracks = useMemo(() => {
    try {
      if (!safeTracks.length) return [];
      let result = safeTracks;
      // If a playlist is active, use its tracks instead
      if (activePlaylist && activePlaylist !== 'all' && currentPlaylistTracks) {
        result = currentPlaylistTracks;
      }
      // Filter by category
      if (selectedCategory !== 'all') {
        result = result.filter(t => (t.category || '').toLowerCase() === selectedCategory.toLowerCase());
      }
      // Filter by search query — expanded to album, genre, year, filename
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(t =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.artist || '').toLowerCase().includes(q) ||
          (t.album || '').toLowerCase().includes(q) ||
          (t.genre || '').toLowerCase().includes(q) ||
          (t.year && String(t.year).includes(q)) ||
          (t.location || '').toLowerCase().includes(q) ||
          (t.filename || '').toLowerCase().includes(q)
        );
      }
      return result;
    } catch { return []; }
  }, [safeTracks, searchQuery, selectedCategory, activePlaylist, playlists, currentPlaylistTracks]);

  const MAX_RENDERED = 200;
  const [displayCount, setDisplayCount] = useState(MAX_RENDERED);

  // Load library on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await refreshLibrary();
      } catch (e) {
        console.error('Library load error:', e);
      } finally {
        if (mounted) {
          setLibraryLoaded(true);
        }
      }
    };
    load();
    
    // Safety timeout - force loaded after 5 seconds
    const timer = setTimeout(() => {
      if (mounted) setLibraryLoaded(true);
    }, 5000);

    // Mobile viewport detection
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobileViewport(e.matches);
    mql.addEventListener('change', handler);
    setIsMobileViewport(mql.matches);
    return () => {
      mounted = false;
      clearTimeout(timer);
      mql.removeEventListener('change', handler);
    };
  }, []);

  // Instant navigation transition support for Library
  useEffect(() => {
    if (activeTab === 'library') {
      setLibraryReady(false);
      const timer = setTimeout(() => {
        setLibraryReady(true);
      }, 80);
      return () => clearTimeout(timer);
    } else {
      setLibraryReady(false);
    }
  }, [activeTab]);

  // Tray category navigation (custom event from IPC)
  useEffect(() => {
    const handler = (e) => setSelectedCategory(e.detail || 'all');
    window.addEventListener('tray-navigate-category', handler);
    return () => window.removeEventListener('tray-navigate-category', handler);
  }, []);

  // Save track immediately when it changes (so lastPlayedTrack is always current)
  useEffect(() => {
    if (currentTrack) {
      setLastPlayedTrack(currentTrack, 0);
    }
  }, [currentTrack?.id]);
  
  // Periodically save playback position while playing
  useEffect(() => {
    if (!isPlaying || !currentTrack || !audioRef.current) return;
    const interval = setInterval(() => {
      if (audioRef.current && currentTrack) {
        setLastPlayedTrack(currentTrack, audioRef.current.currentTime);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, audioRef]);

  // MediaSession API — integrates with OS media controls
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || 'Bilinmeyen',
      artist: currentTrack.artist || 'Bilinmeyen Sanatçı',
      album: currentTrack.album || '',
      artwork: currentTrack.picture ? [{ src: currentTrack.picture, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => useStore.getState().togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => useStore.getState().togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => useStore.getState().previousTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => useStore.getState().nextTrack());
    // Seek handling
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (audioRef.current && details.seekTime != null) {
        audioRef.current.currentTime = details.seekTime;
        useStore.getState().setProgress(details.seekTime);
      }
    });
    // Stop handling
    navigator.mediaSession.setActionHandler('stop', () => {
      useStore.getState().setIsPlaying(false);
    });
  }, [currentTrack?.id, isPlaying]);

  // Desktop notification when track changes (Electron only)
  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    try {
      const { ipcRenderer } = window.require('electron');
      const body = [currentTrack.artist, currentTrack.album].filter(Boolean).join(' — ');
      ipcRenderer.invoke('show-notification', {
        title: currentTrack.title || 'Player',
        body,
        icon: currentTrack.picture || undefined,
        trackId: currentTrack.id,
      }).catch(() => {});
    } catch (e) {
      try { useStore.getState().addError?.('Notification failed', { name: e.name, message: e.message, context: 'notification-effect' }); } catch {}
    }
  }, [currentTrack?.id, isPlaying]);

  // Power save blocker — prevent system sleep during playback
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (isPlaying) {
        ipcRenderer.invoke('power-save-start').catch(() => {});
      } else {
        ipcRenderer.invoke('power-save-stop').catch(() => {});
      }
    } catch (e) {
      try { useStore.getState().addError?.('Power save blocker failed', { name: e.name, message: e.message, context: 'power-save-effect' }); } catch {}
    }
  }, [isPlaying]);

  // Resume last played track on mount
  useEffect(() => {
    if (!libraryLoaded || !lastPlayedTrack || currentTrack) return;
    if (!tracks || tracks.length === 0) return;
    
    const resume = async () => {
      try {
        const allTracks = Array.isArray(tracks) ? tracks : [];
        const found = allTracks.find(t => t.id === lastPlayedTrack.id);
        if (found) {
          playTrack(found);
          if (lastPlayedPosition > 0 && audioRef.current) {
            const trySeek = () => {
              try {
                if (audioRef.current && audioRef.current.readyState >= 2) {
                  audioRef.current.currentTime = lastPlayedPosition;
                }
              } catch (seekErr) {
                console.warn('Resume seek skipped (audio not ready):', seekErr);
              }
            };
            audioRef.current.addEventListener('canplay', trySeek, { once: true });
            const timeoutId = setTimeout(trySeek, 2000);
            // Cleanup timeout if component unmounts
            audioRef.current.addEventListener('error', () => clearTimeout(timeoutId), { once: true });
          }
        }
      } catch (e) {
        console.warn('Resume track skipped:', e);
      }
    };
    resume();
  }, [libraryLoaded, lastPlayedTrack, currentTrack, tracks]);

  // Save position on app close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTrack && audioRef.current) {
        setLastPlayedTrack(currentTrack, audioRef.current.currentTime);
        // Per-track position save
        useStore.getState().savePlaybackPosition(currentTrack.id, audioRef.current.currentTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentTrack, audioRef, setLastPlayedTrack]);

  // Drag-and-drop file support (Electron): accept OS-dropped audio files into the library.
  // Files flow: renderer drop → `handle-dropped-files` IPC → main filters by extension →
  // re-emits `open-files` to renderer → renderer extracts metadata → adds to library + plays first.
  useEffect(() => {
    let dragCounter = 0;
    const isFileDrag = (e) => {
      const types = e.dataTransfer?.types;
      if (!types) return false;
      return Array.from(types).includes('Files');
    };
    const onDragEnter = (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragCounter++;
      setIsDragOver(true);
    };
    const onDragOver = (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) setIsDragOver(false);
    };
    const onDrop = async (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragCounter = 0;
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length === 0) return;
      // Extract absolute paths. Electron 28+ exposes .path on dropped File objects;
      // newer versions require webUtils.getPathForFile. Both are tried for forward compat.
      const paths = files.map((f) => {
        try {
          if (f.path) return f.path;
          const electron = window.require?.('electron');
          if (electron?.webUtils?.getPathForFile) {
            return electron.webUtils.getPathForFile(f);
          }
        } catch {}
        return null;
      }).filter(Boolean);
      if (paths.length === 0) return;
      try {
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('handle-dropped-files', paths);
      } catch (err) {
        console.error('Drop failed:', err);
      }
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Listen for the main process's `open-files` event (sent after it filters dropped files)
  useEffect(() => {
    let ipcRenderer;
    try {
      ipcRenderer = window.require?.('electron')?.ipcRenderer;
    } catch {}
    if (!ipcRenderer) return;

    // Transport actions from tray menu / media keys / global shortcuts.
    // These arrive on the `transport-action` channel from src/main.js + features.js.
    const onTransportAction = (_event, action) => {
      const state = useStore.getState();
      switch (action) {
        case 'toggle-play':
          state.togglePlay?.();
          break;
        case 'play':
          if (!state.isPlaying) state.togglePlay?.();
          break;
        case 'pause':
          if (state.isPlaying) state.togglePlay?.();
          break;
        case 'next':
          state.nextTrack?.();
          break;
        case 'prev':
          state.previousTrack?.();
          break;
        case 'stop':
          if (state.isPlaying) state.togglePlay?.();
          break;
        case 'shuffle':
          state.toggleShuffle?.();
          break;
        case 'repeat':
          state.toggleRepeat?.();
          break;
        case 'volume-up':
          state.setVolume?.(Math.min(100, (state.volume ?? 0) + 5));
          break;
        case 'volume-down':
          state.setVolume?.(Math.max(0, (state.volume ?? 0) - 5));
          break;
        case 'mute-toggle':
          state.toggleMute?.();
          break;
        default:
          break;
      }
    };
    ipcRenderer.on('transport-action', onTransportAction);

    const onOpenFiles = async (_event, filePaths) => {
      if (!Array.isArray(filePaths) || filePaths.length === 0) return;
      const newTracks = [];
      for (const filePath of filePaths) {
        try {
          const metadata = await ipcRenderer.invoke('extract-metadata', filePath);
          if (metadata) {
            const track = { id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...metadata, location: filePath };
            newTracks.push(track);
          }
        } catch (e) {
          console.warn('Failed to extract metadata for', filePath, e);
        }
      }
      if (newTracks.length === 0) return;
      try {
        const library = await ipcRenderer.invoke('get-library-state');
        const existingPaths = new Set((library.tracks || []).map((t) => t.location));
        const deduped = newTracks.filter((t) => !existingPaths.has(t.location));
        library.tracks = [...(library.tracks || []), ...deduped];
        await ipcRenderer.invoke('save-library-state', library);
        await refreshLibrary();
        // Auto-play the first newly added track
        if (deduped.length > 0) playTrack(deduped[0]);
        addLog(`📁 ${deduped.length} dosya sürüklenip bırakıldı`, 'info');
      } catch (e) {
        console.error('Save dropped files failed:', e);
      }
    };
    ipcRenderer.on('open-files', onOpenFiles);
    return () => {
      try { ipcRenderer.removeListener('open-files', onOpenFiles); } catch (e) {
        try { useStore.getState().addError?.('IPC cleanup failed', { name: e.name, message: e.message, context: 'open-files-removeListener' }); } catch {}
      }
      try { ipcRenderer.removeListener('transport-action', onTransportAction); } catch (e) {
        try { useStore.getState().addError?.('IPC cleanup failed', { name: e.name, message: e.message, context: 'transport-action-removeListener' }); } catch {}
      }
    };
  }, [refreshLibrary, playTrack, addLog]);

  // Auto-fetch synced lyrics from LRCLib when track changes (Spotube pattern)
  useEffect(() => {
    if (!currentTrack?.title) {
      clearSyncedLyrics();
      return;
    }
    // Cache: skip if same track was already fetched
    const queryKey = `${currentTrack.title}::${currentTrack.artist || ''}`;
    if (lastLyricsQuery === queryKey) return;

    setSyncedLyricsLoading(true);
    fetchSyncedLyrics({
      trackName: currentTrack.title,
      artistName: currentTrack.artist || '',
      albumName: currentTrack.album || '',
      duration: currentTrack.duration,
    }).then(result => {
      if (result?.syncedLyrics) {
        const cues = parseLRC(result.syncedLyrics);
        setSyncedLyrics(result.syncedLyrics, cues);
        setLastLyricsQuery(queryKey);
      } else if (result?.plainLyrics) {
        // No synced lyrics — fallback to plain text (show as static)
        setSyncedLyrics(null, []);
        setLastLyricsQuery(queryKey);
      } else {
        setSyncedLyrics(null, []);
        setLastLyricsQuery(queryKey);
      }
    }).catch(() => {
      setSyncedLyrics(null, []);
      setLastLyricsQuery(queryKey);
    });
  }, [currentTrack?.id]);

  // Load playlist tracks when active playlist changes
  useEffect(() => {
    if (!activePlaylist || activePlaylist === 'all') {
      setCurrentPlaylistTracks(null);
      return;
    }
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('db-get-playlist-tracks', activePlaylist).then(plTracks => {
        setCurrentPlaylistTracks(plTracks || []);
      }).catch(() => setCurrentPlaylistTracks([]));
    } catch {}
  }, [activePlaylist]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      try {
        if (volumePopRef.current && !volumePopRef.current.contains(e.target)) setShowVolumePop(false);
        if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false);
        if (ctxRef.current && !ctxRef.current.contains(e.target)) setContextMenu(null);
      } catch {}
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Seek drag handler
  const seekRef = useRef(null);
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isSeeking || !seekRef.current || !audioRef.current) return;
      const rect = seekRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioRef.current.currentTime = p * duration;
    };
    const handleMouseUp = () => setIsSeeking(false);
    if (isSeeking) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSeeking, duration, audioRef]);

  // Sidebar resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingSidebar) return;
      const newWidth = Math.max(180, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    if (isResizingSidebar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  // Apply accent color on startup
  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty('--color-primary', accentColor);
    }
  }, [accentColor]);

  // Sync playback state to main process for tray/thumbar
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      const allTracks = Array.isArray(tracks) ? tracks : [];
      const currentIndex = allTracks.findIndex(t => t.id === currentTrack?.id);
      ipcRenderer.invoke('update-playback-state', {
        isPlaying,
        canGoNext: allTracks.length > 1,
        canGoPrev: allTracks.length > 1,
        shuffleMode,
        repeatMode,
        trackTitle: currentTrack?.title || '',
      });
    } catch {}
  }, [isPlaying, currentTrack, tracks]);

  // Drag & drop support
  useEffect(() => {
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        try {
          const ipcRenderer = window.require('electron').ipcRenderer;
          const paths = files.map(f => f.path);
          ipcRenderer.invoke('add-music-files', paths).then(() => refreshLibrary());
        } catch {}
      }
    };
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);
    return () => {
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);
    };
  }, [refreshLibrary]);

  // Sorted tracks
  const sortedTracks = useMemo(() => {
    try {
      if (!filteredTracks.length) return [];
      const sorted = [...filteredTracks];
      switch (sortBy) {
        case 'name': sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr')); break;
        case 'artist': sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || '', 'tr')); break;
        case 'date': sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)); break;
        case 'category': sorted.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'tr')); break;
        case 'duration': sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0)); break;
        case 'playcount': sorted.sort((a, b) => (b.playCount || 0) - (a.playCount || 0)); break;
        case 'lastplayed': sorted.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)); break;
        default: break;
      }
      if (sortDir === 'desc') sorted.reverse();
      return sorted;
    } catch { return []; }
  }, [filteredTracks, sortBy, sortDir]);

  const displayTracks = useMemo(() => sortedTracks.slice(0, displayCount), [sortedTracks, displayCount]);
  const hasMoreTracks = sortedTracks.length > displayCount;

  const loadMoreTracks = () => {
    setDisplayCount(prev => prev + MAX_RENDERED);
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = useCallback((e) => {
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const p = (e.clientX - rect.left) / rect.width;
      if (audioRef.current) audioRef.current.currentTime = p * duration;
    } catch {}
  }, [duration, audioRef]);

  const handleCtxMenu = (e, track) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, track });
  };

  // Multi-track selection helpers
  const handleTrackClick = useCallback((e, track, idx) => {
    const trackId = track.id;
    const currentSelection = selectedTrackIdsRef.current;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: toggle selection
      setSelectedTrackIds(prev => {
        if (prev.includes(trackId)) return prev.filter(id => id !== trackId);
        return [...prev, trackId];
      });
      lastClickedIdxRef.current = idx;
      setSelectionMode(true);
    } else if (e.shiftKey && lastClickedIdxRef.current !== null && sortedTracks.length > 0) {
      // Shift+Click: range select
      const start = Math.min(lastClickedIdxRef.current, idx);
      const end = Math.max(lastClickedIdxRef.current, idx);
      const range = sortedTracks.slice(start, end + 1).map(t => t.id);
      setSelectedTrackIds(prev => {
        const newSet = new Set(prev);
        range.forEach(id => newSet.add(id));
        return [...newSet];
      });
      setSelectionMode(true);
    } else if (currentSelection.length > 0 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
      // Plain click with existing selection: clear and start fresh
      setSelectedTrackIds([trackId]);
      lastClickedIdxRef.current = idx;
      setSelectionMode(false);
    } else {
      // No selection: normal play
      playTrack(track);
      setSelectedTrackIds([]);
      lastClickedIdxRef.current = idx;
      setSelectionMode(false);
    }
  }, [sortedTracks, playTrack]); // no dependency on selectedTrackIds

  const clearSelection = useCallback(() => {
    setSelectedTrackIds([]);
    setSelectionMode(false);
    lastClickedIdxRef.current = null;
  }, []);

  const playSelectedTracks = useCallback(() => {
    if (selectedTrackIds.length === 0) return;
    const firstSelected = sortedTracks.find(t => t.id === selectedTrackIds[0]);
    if (firstSelected) playTrack(firstSelected);
    clearSelection();
  }, [selectedTrackIds, sortedTracks, playTrack, clearSelection]);

  const handleOpenFile = useCallback(async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('open-file-dialog');
      if (result) {
        const metadata = await ipcRenderer.invoke('extract-metadata', result);
        const track = { id: `track-${Date.now()}`, ...metadata, location: result };
        playTrack(track);
      }
    } catch (e) { console.error('Open file failed:', e); }
  }, [playTrack]);

  const queueSelectedTracks = useCallback(() => {
    if (selectedTrackIds.length === 0) return;
    const selected = sortedTracks.filter(t => selectedTrackIds.includes(t.id));
    try {
      const { ipcRenderer } = window.require('electron');
      selected.forEach(t => ipcRenderer.send('add-to-queue', t));
    } catch (e) { console.error('Queue error:', e); }
    clearSelection();
  }, [selectedTrackIds, sortedTracks, clearSelection]);

  const deleteSelectedTracks = useCallback(async () => {
    if (selectedTrackIds.length === 0) return;
    if (!confirm(`${selectedTrackIds.length} müzik silinecek. Emin misiniz?`)) return;
    try {
      const { ipcRenderer } = window.require('electron');
      for (const id of selectedTrackIds) {
        if (dbEnabled) {
          await ipcRenderer.invoke('db-remove-track', id);
        } else {
          const library = await ipcRenderer.invoke('get-library-state');
          library.tracks = library.tracks.filter(t => t.id !== id);
          await ipcRenderer.invoke('save-library-state', library);
        }
      }
      refreshLibrary();
    } catch (e) { console.error(e); }
    clearSelection();
  }, [selectedTrackIds, dbEnabled, refreshLibrary, clearSelection]);

  const copyTrackName = (track) => {
    if (!track?.title) return;
    try {
      navigator.clipboard.writeText(track.title); showToast('Ad kopyalandı', 'copy');
    } catch {}
    setContextMenu(null);
    setShowMoreMenu(false);
  };

  const handleDeleteTrack = async (track) => {
    if (!track) return;
    try {
      const { ipcRenderer } = window.require('electron');
      if (!ipcRenderer) return;
      // Send file to recycle bin first
      if (track.location) {
        await ipcRenderer.invoke('delete-track-file', track.location).catch(() => {});
      }
      // Remove from database
      if (dbEnabled) {
        await ipcRenderer.invoke('db-remove-track', track.id);
      } else {
        const library = await ipcRenderer.invoke('get-library-state');
        library.tracks = library.tracks.filter(t => t.id !== track.id);
        await ipcRenderer.invoke('save-library-state', library);
      }
      refreshLibrary();
    } catch (e) { console.error(e); }
    setContextMenu(null);
  };

  const handleRenameTrack = async (track) => {
    const newName = prompt('Yeni ad girin:', track?.title || '');
    if (newName && newName.trim()) {
      try {
        const { ipcRenderer } = window.require('electron');
        if (!ipcRenderer) return;
        if (dbEnabled) {
          ipcRenderer.invoke('db-update-track', track.id, { title: newName.trim() });
        } else {
          const lib = await ipcRenderer.invoke('get-library-state');
          const idx = lib.tracks.findIndex(t => t.id === track.id);
          if (idx >= 0) {
            lib.tracks[idx].title = newName.trim();
            ipcRenderer.invoke('save-library-state', lib);
            refreshLibrary();
          }
        }
        refreshLibrary();
      } catch (e) { console.error(e); }
    }
    setContextMenu(null);
  };

  // Theme
  useEffect(() => {
    try { document.documentElement.setAttribute('data-theme', theme); } catch {}
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      try {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const pressedKeys = [];
        if (e.ctrlKey) pressedKeys.push(e.code === 'ControlLeft' ? 'ControlLeft' : 'ControlRight');
        if (e.shiftKey) pressedKeys.push(e.code === 'ShiftLeft' ? 'ShiftLeft' : 'ShiftRight');
        if (e.altKey) pressedKeys.push(e.code === 'AltLeft' ? 'AltLeft' : 'AltRight');
        if (!['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight'].includes(e.code)) {
          pressedKeys.push(e.code);
        }
        const pressedStr = pressedKeys.join('+');
        
        const actions = {
          'play-pause': () => { e.preventDefault(); togglePlay(); },
          'prev': () => { e.preventDefault(); previousTrack(); },
          'next': () => { e.preventDefault(); nextTrack(); },
          'seek-back': () => { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5); },
          'seek-fwd': () => { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5); },
          'vol-up': () => { e.preventDefault(); setVolume(Math.min(100, volume + 5)); },
          'vol-down': () => { e.preventDefault(); setVolume(Math.max(0, volume - 5)); },
          'mute': () => { e.preventDefault(); setVolume(volume === 0 ? 80 : 0); },
          'visualizer': () => { e.preventDefault(); setShowVisualizer(!useStore.getState().showVisualizer); },
          'waveform': () => { e.preventDefault(); setShowWaveform(!useStore.getState().showWaveform); },
          'lyrics': () => { e.preventDefault(); setShowLyrics(!useStore.getState().showLyrics); },
          'rename': () => { e.preventDefault(); if (contextMenu?.track) handleRenameTrack(contextMenu.track); },
          'delete': () => { e.preventDefault(); if (contextMenu?.track) handleDeleteTrack(contextMenu.track); },
          'settings': () => { e.preventDefault(); setActiveTab('settings'); },
          'search': () => { e.preventDefault(); setActiveTab('search'); },
        };
        
        // Escape clears multi-selection
        if (e.key === 'Escape' && selectedTrackIds.length > 0) {
          clearSelection();
          return;
        }

        // ? or F1 shows shortcut help
        if (e.key === '?' || e.key === 'F1' || (e.key === '/' && e.shiftKey)) {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            setShowShortcutsHelp((v) => !v);
            return;
          }
        }

        // C key toggles subtitles (YouTube-style)
        if (e.key === 'c' || e.key === 'C') {
          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            setShowLyrics(!useStore.getState().showLyrics);
            return;
          }
        }
        
        for (const [actionId, shortcut] of Object.entries(keyboardShortcuts)) {
          if (shortcut === pressedStr && actions[actionId]) {
            actions[actionId]();
            break;
          }
        }
      } catch {}
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, volume, setVolume, audioRef, contextMenu, keyboardShortcuts]);

  // Mini mode always-on-top + size save/restore
  const prevWindowSizeRef = useRef(null);
  useEffect(() => {
    try {
      const ipcRenderer = window.require('electron').ipcRenderer;
      if (layoutMode === 'mini') {
        // Save current size first, then set mini size
        ipcRenderer.invoke('get-window-size').then((size) => {
          prevWindowSizeRef.current = size;
        }).catch(() => {});
        ipcRenderer.invoke('set-always-on-top', true).catch(() => {});
        ipcRenderer.invoke('window-set-size', { width: 320, height: 200, resizable: false }).catch(() => {});
      } else if (prevWindowSizeRef.current) {
        // Restore saved size and re-enable resize
        ipcRenderer.invoke('set-always-on-top', false).catch(() => {});
        ipcRenderer.invoke('window-set-size', {
          width: prevWindowSizeRef.current.width,
          height: prevWindowSizeRef.current.height,
          resizable: true
        }).catch(() => {});
        // Also update main window bounds via set-window-size for persisted settings
        ipcRenderer.invoke('set-window-size', {
          width: prevWindowSizeRef.current.width,
          height: prevWindowSizeRef.current.height
        }).catch(() => {});
        prevWindowSizeRef.current = null;
      } else {
        ipcRenderer.invoke('set-always-on-top', false).catch(() => {});
      }
    } catch {}
  }, [layoutMode]);

  // Sleep Timer — pause playback when timer expires
  useEffect(() => {
    if (!sleepTimer) return;
    const interval = setInterval(() => {
      if (sleepTimerEnd && Date.now() >= sleepTimerEnd) {
        togglePlay();
        setSleepTimer(null);
        showToast('😴 Uyku zamanlayıcı: Çalma duraklatıldı', 'info');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer, sleepTimerEnd, togglePlay, setSleepTimer]);

  // Volume Boost — apply multiplied volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.min((volume / 100) * (volumeBoost || 1), 1);
    }
  }, [volume, volumeBoost, audioRef]);

  // Mini mode
  if (layoutMode === 'mini') {
    return (
      <ErrorBoundary>
      <div className="h-full w-full relative overflow-hidden group" style={{backgroundColor:'var(--color-bg-primary)'}}>
         <div className="absolute inset-0">
            {currentTrack?.picture ? (
              <img src={currentTrack.picture} className="w-full h-full object-cover blur-[1px] brightness-[0.4] scale-110" />
            ) : (
              <div className="w-full h-full bg-black" />
            )}
         </div>
         <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
           <div className="h-full bg-blue-500 transition-all" style={{ width: `${(progress/duration)*100 || 0}%` }} />
         </div>
         <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 text-white" style={{backgroundColor:'rgba(0,0,0,0.2)'}}>
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <button onClick={() => { setLayoutMode('normal'); setActiveTab('home'); }} className="text-white/50 hover:text-white transition p-1" title="Ana Sayfa">
                   <Activity size={14} />
                 </button>
                 <button onClick={() => { setLayoutMode('normal'); setActiveTab('library'); }} className="text-white/50 hover:text-white transition p-1" title="Kütüphane">
                   <ListMusic size={14} />
                 </button>
                 <button onClick={() => { setLayoutMode('normal'); setActiveTab('settings'); }} className="text-white/50 hover:text-white transition p-1" title="Ayarlar">
                   <Settings size={14} />
                 </button>
               </div>
               <button onClick={() => window.require('electron').ipcRenderer.invoke('window-close')} className="hover:text-red-500 transition"><X size={14} /></button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-center">
                <div className="text-sm font-bold truncate max-w-[200px]">{currentTrack?.title || 'Hazır'}</div>
                <div className="text-[10px] opacity-60 truncate max-w-[200px]">{currentTrack?.artist || ''}</div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-1">
                <SkipBack size={20} className="hover:text-primary cursor-pointer transition" onClick={previousTrack} />
                <button onClick={togglePlay} className="p-3 rounded-full hover:scale-110 transition shadow-lg" style={{backgroundColor:'var(--color-primary)'}}>
                  {isPlaying ? <Pause fill="white" size={20} /> : <Play fill="white" size={20} />}
                </button>
                <SkipForward size={20} className="hover:text-primary cursor-pointer transition" onClick={nextTrack} />
              </div>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black tracking-tighter" style={{color:'var(--color-primary)'}}>PLAYER</span>
               <button onClick={() => setLayoutMode('normal')} className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition">
                 <Maximize2 size={12} />
                 Tam Uygulama
               </button>
            </div>
         </div>
      </div>
      </ErrorBoundary>
    );
  }

  // Fullscreen Media Mode — only album art/video visible
  if (mediaFullscreen) {
    const fsExit = () => { setMediaFullscreen(false); setShowFSMenu(false); };
    // If no track, show a placeholder instead of black screen
    if (!currentTrack) {
      return (
        <ErrorBoundary>
        <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white/40" onDoubleClick={fsExit}>
          <Music size={80} className="opacity-20 mb-4" />
          <p className="text-sm">Oynatılacak müzik seçilmedi</p>
          <button onClick={fsExit} className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 text-sm transition">
            Tam Ekrandan Çık
          </button>
        </div>
    </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
      <div className="h-full w-full relative overflow-hidden bg-black" onDoubleClick={fsExit}>
        {/* Media content */}
        {currentTrack?.isVideo ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Suspense fallback={<div className="text-white/60 text-sm">Video yükleniyor...</div>}>
              <VideoPlayer track={currentTrack} audioRef={audioRef} />
            </Suspense>
          </div>
        ) : (
          <>
            {/* Blurred album art background */}
            <div className="absolute inset-0 overflow-hidden" style={{backgroundColor:'var(--color-bg-primary)'}}>
              {currentTrack?.picture ? (
                <img src={currentTrack.picture} className="w-full h-full object-cover blur-xl scale-110 opacity-60" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/30" />
              )}
            </div>
            {/* Clean foreground album art */}
            {currentTrack?.picture ? (
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <img src={currentTrack.picture} className="w-full h-full object-contain rounded-3xl shadow-2xl" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{color:'var(--text-secondary)'}}>
                <Music size={120} className="opacity-20" />
              </div>
            )}
          </>
        )}
        {/* Visualizer on top */}
        {(showVisualizer || showWaveform || visualizerMode === 'waveform') && (
          <div
            className="absolute bottom-8 left-0 right-0 flex items-end justify-center"
            style={{
              height: '180px',
              pointerEvents: (showWaveform || visualizerMode === 'waveform') ? 'auto' : 'none',
              opacity: currentTrack ? visualizerOpacity : 0.4,
              transition: 'opacity 0.4s ease-in-out',
            }}
          >
            <Suspense fallback={null}>
              {currentTrack ? (
                <>
                  {(showWaveform || visualizerMode === 'waveform') && <Waveform audioRef={audioRef} />}
                  {showVisualizer && visualizerMode === '3dsphere' && <Visualizer3DSphere analyserRef={analyserRef} />}
                  {showVisualizer && visualizerMode === 'spectrum' && <SpectrumAnalyzer analyserRef={analyserRef} />}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/30">
                  <Activity size={28} className="opacity-40" />
                  <span className="text-xs font-semibold tracking-wide">Ses çalmıyor</span>
                </div>
              )}
            </Suspense>
          </div>
        )}
        {/* Minimal controls overlay (auto-hide) */}
        <div className="absolute inset-0 z-10 opacity-0 hover:opacity-100 transition-opacity duration-300">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center" style={{background:'linear-gradient(rgba(0,0,0,0.6), transparent)'}}>
            <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Tam Ekran</span>
            <div className="flex items-center gap-3">
              {/* Window controls in fullscreen */}
              {isElectron() && (
                <>
                  <button onClick={() => window.require('electron').ipcRenderer.invoke('window-minimize')} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition" title="Küçült">
                    <Minus size={18} />
                  </button>
                  <button onClick={() => window.require('electron').ipcRenderer.invoke('window-maximize')} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition" title="Tam Ekran (Pencere)">
                    <Maximize2 size={18} />
                  </button>
                </>
              )}
              {/* Three-dot menu in fullscreen */}
              <div className="relative">
                <button onClick={() => setShowFSMenu(!showFSMenu)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition">
                  <MoreHorizontal size={18} />
                </button>
                {showFSMenu && (
                  <div className="absolute bottom-full right-0 mb-2 border rounded-2xl py-1 w-48 shadow-2xl z-50 text-xs" style={{backgroundColor:'rgba(0,0,0,0.95)', borderColor:'rgba(255,255,255,0.1)'}}>
                    <MenuItem icon={<Sliders size={13}/>} label="Ekolayzer" onClick={() => { setShowEqualizer(true); setShowFSMenu(false); }} />
                    <MenuItem icon={<Video size={13}/>} label="Efektler" onClick={() => { setShowEffects(true); setShowFSMenu(false); }} />
                    <MenuItem icon={<Activity size={13}/>} label={`Hız: ${playbackRate}x`} onClick={() => { setShowPlaybackRate(true); setShowFSMenu(false); }} />
                    <div className="h-px my-1" style={{backgroundColor:'rgba(255,255,255,0.1)'}} />
                    <MenuItem icon={<Eye size={13}/>} label={showVisualizer ? "✓ Görselleştirici" : "Görselleştirici"} onClick={() => { setShowVisualizer(!showVisualizer); setShowFSMenu(false); }} />
                    <MenuItem icon={<Radio size={13}/>} label={showWaveform ? "✓ Ses Dalgası" : "Ses Dalgası"} onClick={() => { setShowWaveform(!showWaveform); setShowFSMenu(false); }} />
                    <MenuItem icon={<Subtitles size={13}/>} label={showLyrics ? "✓ Altyazı" : "Altyazı"} onClick={() => { setShowLyrics(!showLyrics); setShowFSMenu(false); }} />
                    <div className="h-px my-1" style={{backgroundColor:'rgba(255,255,255,0.1)'}} />
                    <MenuItem icon={<Copy size={13}/>} label="Adı Kopyala" onClick={() => { if(currentTrack?.title) { navigator.clipboard.writeText(currentTrack.title); showToast('Ad kopyalandı', 'copy'); } setShowFSMenu(false); }} />
                  </div>
                )}
              </div>
              <button onClick={fsExit} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition" title="Tam Ekrandan Çık">
                <Minimize2 size={18} />
              </button>
              {/* Close button in fullscreen */}
              {isElectron() && (
                <button onClick={() => window.require('electron').ipcRenderer.invoke('window-close')} className="bg-white/10 hover:bg-red-500/40 text-white p-2 rounded-lg transition" title="Kapat">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center" style={{background:'linear-gradient(transparent, rgba(0,0,0,0.8))'}}>
            {/* Progress bar */}
            <div className="w-full mb-4 h-1 bg-white/10 rounded-full cursor-pointer" onClick={handleSeek}>
              <div className="h-full bg-blue-500 rounded-full" style={{width:`${(progress/duration)*100 || 0}%`}} />
            </div>
            {/* Title */}
            <div className="text-white text-lg font-bold mb-4 truncate max-w-full">{currentTrack?.title || ''}</div>
            {/* Buttons */}
            <div className="flex items-center gap-6">
              <SkipBack size={22} className="text-white/60 hover:text-white cursor-pointer transition" onClick={previousTrack} />
              <button onClick={togglePlay} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition shadow-lg">
                {isPlaying ? <Pause fill="white" size={24} /> : <Play fill="white" size={24} />}
              </button>
              <SkipForward size={22} className="text-white/60 hover:text-white cursor-pointer transition" onClick={nextTrack} />
            </div>
            <div className="text-white/40 text-[10px] mt-2 font-mono">{formatTime(progress)} / {formatTime(duration)}</div>
          </div>
        </div>
        {/* Escape to exit */}
        <div tabIndex={0} className="absolute inset-0" onKeyDown={(e) => { if (e.key === 'Escape') fsExit(); }} />
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen w-full overflow-hidden" style={{backgroundColor:'var(--color-bg-primary)', color:'var(--text-primary)'}}>
       {/* Desktop sidebar — hidden on mobile */}
       {!isMobileViewport && (
         <Sidebar
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sidebarWidth={sidebarWidth}
            setSidebarWidth={setSidebarWidth}
            isResizingSidebar={isResizingSidebar}
            setIsResizingSidebar={setIsResizingSidebar}
            sidebarResizeRef={sidebarResizeRef}
          />
       )}

      <div className="flex-1 flex flex-col min-w-0" style={{backgroundColor:'var(--color-bg-primary)'}}>
        <TitleBar
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          sidebarToggleBehavior={sidebarToggleBehavior}
          isMobileViewport={isMobileViewport}
          showMobileSidebar={showMobileSidebar}
          setShowMobileSidebar={setShowMobileSidebar}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
              <main className={cn("flex-1 overflow-y-auto relative custom-scrollbar", "tab-animate")}>
                 {activeTab === 'home' && (
                    <>
                       {currentTrack ? (
                        <div className="w-full h-full relative">
                          {/* Background - Blurred Album Art (always blurred for atmosphere) */}
                          {currentTrack.isVideo ? (
                            <div className="absolute inset-0">
                              <VideoPlayer track={currentTrack} audioRef={audioRef} />
                            </div>
                          ) : (
                            <div className="absolute inset-0 overflow-hidden" style={{backgroundColor:'var(--color-bg-primary)'}}>
                              {currentTrack.picture ? (
                                <img src={currentTrack.picture} className="w-full h-full object-cover blur-xl scale-110 opacity-50" />
                              ) : (
                                <div className="w-full h-full" />
                              )}
                            </div>
                          )}
                         
                           {/* Visualizer/Waveform — moved to global overlay below PlayerBar */}
                         
                         {/* Track Info Overlay */}
                         <div className="absolute bottom-0 left-0 right-0 p-6" style={{background:'linear-gradient(transparent, rgba(0,0,0,0.8))'}}>
                           <div className="flex items-center gap-5">
                             {/* Foreground album art — clean, original size, no blur */}
                             {currentTrack.picture && !currentTrack.isVideo && (
                               <img src={currentTrack.picture} className="w-28 h-28 rounded-xl shadow-2xl flex-shrink-0 object-cover border border-white/10" />
                             )}
                               <div className="min-w-0 flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                   {currentTrack.isVideo && (
                                     <>
                                       <Film size={14} style={{color:'var(--color-primary)'}} />
                                       <span className="text-xs font-bold" style={{color:'var(--color-primary)'}}>VİDEO</span>
                                     </>
                                   )}
                                 </div>
                                 <div className="text-2xl font-black truncate">{currentTrack.title}</div>
                                 <div className="text-sm" style={{color:'var(--text-secondary)'}}>{currentTrack.artist}</div>
                               </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                       <div className="w-full h-full flex items-center justify-center" style={{backgroundColor:'var(--color-bg-primary)'}}>
                         <div className="text-center p-12">
                           <Activity size={56} className="mx-auto mb-3 opacity-20" />
                           <h2 className="text-xl font-bold mb-1">Müzik Çalmaya Hazır</h2>
                           <p style={{color:'var(--text-secondary)'}} className="mb-4 text-sm">Kütüphaneden bir müzik seçin veya YouTube'dan indirin</p>
                           <div className="flex justify-center gap-3">
                             <button
                               onClick={async () => {
                                 try {
                                   const { ipcRenderer } = window.require('electron');
                                   const result = await ipcRenderer.invoke('open-file-dialog');
                                   if (result) {
                                     const metadata = await ipcRenderer.invoke('extract-metadata', result);
                                     const track = { id: `track-${Date.now()}`, ...metadata, location: result };
                                     playTrack(track);
                                   }
                                 } catch (e) { console.error('Open file failed:', e); }
                               }}
                               className="px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition shadow-lg text-white"
                               style={{backgroundColor:'var(--color-primary)'}}
                             >
                               <FileAudio size={16} />
                               <span>Aç</span>
                             </button>
                             <button
                               onClick={() => setActiveTab('library')}
                               className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition"
                               style={{backgroundColor:'var(--color-bg-tertiary)'}}
                             >
                               <ListMusic size={16} />
                               <span>Kütüphane</span>
                             </button>
                           </div>
                         </div>
                       </div>
                     )}
                   </>
                )}

                {activeTab === 'library' && (
                  !libraryReady ? (
                    <div className="w-full h-[60vh] flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor: 'var(--color-primary) transparent transparent transparent'}} />
                        <span className="text-xs font-bold" style={{color:'var(--text-secondary)'}}>Kütüphane Yükleniyor...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 animate-fade-in">
                    {/* Playlist Sidebar */}
                    {showPlaylistSidebar && (
                    <div className="flex flex-col w-52 shrink-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between px-2 py-1.5">
                         <span className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Çalma Listeleri</span>
                         <div className="flex items-center gap-1">
                           <button onClick={() => setShowPlaylistSidebar(false)} className="p-1 rounded hover:bg-white/10 transition" style={{color:'var(--text-secondary)'}} title="Daralt">
                             <X size={12} />
                           </button>
                           <button onClick={importM3U} className="p-1 rounded hover:bg-white/10 transition" style={{color:'var(--text-secondary)'}} title="M3U içe aktar">
                             <Download size={12} />
                           </button>
                           <button onClick={async () => {
                             const name = prompt('Yeni çalma listesi adı:');
                             if (name && name.trim()) await createPlaylist(name.trim());
                           }} className="p-1 rounded hover:bg-white/10 transition" style={{color:'var(--color-primary)'}} title="Yeni çalma listesi">
                             <Plus size={14} />
                           </button>
                         </div>
                       </div>
                      <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[50vh] custom-scrollbar">
                        <div
                          onClick={() => setActivePlaylist('all')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition ${
                            activePlaylist === 'all' ? 'font-bold' : ''
                          }`}
                          style={{
                            backgroundColor: activePlaylist === 'all' ? 'var(--color-primary)' : 'transparent',
                            color: activePlaylist === 'all' ? 'white' : 'var(--text-primary)'
                          }}
                        >
                          <ListMusic size={14} />
                          <span>Tüm Müzikler</span>
                          <span className="ml-auto opacity-50">{safeTracks.length}</span>
                        </div>
                        {playlists.map(pl => (
                          <div key={pl.id} className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition hover:bg-white/5" style={{
                            backgroundColor: activePlaylist === pl.id ? 'var(--color-primary)' : 'transparent',
                            color: activePlaylist === pl.id ? 'white' : 'var(--text-primary)'
                          }}>
                            <div className="flex-1 flex items-center gap-2 min-w-0" onClick={() => setActivePlaylist(pl.id)}>
                              <Music size={14} className="shrink-0 opacity-50" />
                              <span className="truncate">{pl.name}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); exportPlaylistAsM3U(pl.id, pl.name); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
                              style={{color:'var(--text-secondary)'}}
                              title="M3U olarak dışa aktar"
                            ><Download size={10} /></button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = prompt('Yeni ad:', pl.name);
                                if (newName && newName.trim() && newName.trim() !== pl.name) {
                                  renamePlaylist(pl.id, newName.trim());
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
                              style={{color:'var(--text-secondary)'}}
                              title="Yeniden adlandır"
                            ><Edit3 size={10} /></button>
                            <button
                              onClick={(e) => { e.stopPropagation(); if (confirm(`"${pl.name}" silinsin mi?`)) deletePlaylist(pl.id); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition"
                              style={{color:'rgb(239,68,68)'}}
                              title="Sil"
                            ><X size={12} /></button>
                          </div>
                        ))}
                        {playlists.length === 0 && (
                          <div className="px-3 py-4 text-center text-[10px]" style={{color:'var(--text-secondary)'}}>
                            Henüz çalma listesi yok
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0 gap-3">
                    {/* Expand playlist sidebar button when collapsed */}
                    {!showPlaylistSidebar && (
                      <button onClick={() => setShowPlaylistSidebar(true)} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition hover:bg-white/10" style={{color:'var(--text-secondary)'}}>
                        <ListMusic size={12} /> Çalma Listeleri
                      </button>
                    )}
                    {/* Scanning progress bar — non-blocking */}
                    {scanProgress && scanProgress.total > 0 && (
                      <div className="flex flex-col gap-1 px-1">
                        <div className="flex items-center justify-between text-xs" style={{color:'var(--text-secondary)'}}>
                          <span>{scanProgress.status || 'Kütüphane taranıyor...'}</span>
                          <span>{scanProgress.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{backgroundColor:'var(--color-bg-tertiary)'}}>
                          <div className="h-full rounded-full transition-all duration-300 ease-out" style={{width:`${scanProgress.progress}%`, backgroundColor:'var(--color-primary)'}} />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-3" style={{borderColor:'var(--border-color)'}}>
                      {/* Search Bar on the Left */}
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={14} style={{color:'var(--text-secondary)'}} />
                        <input 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          placeholder="Ad, sanatçı, albüm, tür, yıl..." 
                          className="border rounded-xl py-2 pl-9 pr-4 text-xs w-full focus:outline-none transition" 
                          style={{backgroundColor:'var(--color-bg-tertiary)', borderColor:'var(--border-color)', color:'var(--text-primary)'}} 
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10" style={{color:'var(--text-secondary)'}}>
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Controls Grouped on the Right */}
                      <div className="flex items-center flex-wrap gap-3">
                        {isLoading && <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'var(--color-primary) transparent transparent transparent'}} />}
                        
                        {/* Category Filter */}
                        <div className="flex items-center gap-1.5">
                          <select 
                            value={selectedCategory} 
                            onChange={(e) => {
                              if (e.target.value === '__add_category__') {
                                setShowNewCategoryInput(true);
                                setSelectedCategory('all');
                                return;
                              }
                              setSelectedCategory(e.target.value);
                            }} 
                            className={`text-xs px-2.5 py-1.5 rounded-xl focus:outline-none transition-all duration-200 ${
                              showNewCategoryInput ? 'w-24 opacity-60' : 'w-36'
                            }`}
                            style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)', border:'1px solid var(--border-color)'}}
                          >
                            <option value="all">Tüm Kategoriler</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                            {Array.from(new Set(safeTracks.map(t => t.category).filter(Boolean).filter(c => !categories.find(cat => cat.name === c)))).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="__add_category__">+ Yeni Kategori</option>
                          </select>
                          {showNewCategoryInput && (
                            <div className="flex items-center gap-1">
                              <input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newCategoryName.trim()) {
                                    addCategory(newCategoryName.trim());
                                    setNewCategoryName('');
                                    setShowNewCategoryInput(false);
                                  }
                                  if (e.key === 'Escape') {
                                    setNewCategoryName('');
                                    setShowNewCategoryInput(false);
                                  }
                                }}
                                placeholder="Kategori adı..."
                                className="text-xs px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-2 w-28"
                                style={{backgroundColor:'rgba(255,255,255,0.07)', color:'var(--text-primary)', border:'1.5px solid var(--color-primary)', outline:'none'}}
                                autoFocus
                              />
                              <button
                                onClick={() => { if (newCategoryName.trim()) { addCategory(newCategoryName.trim()); setNewCategoryName(''); setShowNewCategoryInput(false); } }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition"
                                style={{color:'var(--color-primary)'}}
                                title="Kategoriyi ekle"
                              ><Check size={14} /></button>
                              <button
                                onClick={() => { setNewCategoryName(''); setShowNewCategoryInput(false); }}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition"
                                style={{color:'var(--text-secondary)'}}
                                title="İptal"
                              ><X size={14} /></button>
                            </div>
                          )}
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center rounded-xl overflow-hidden border" style={{borderColor:'var(--border-color)'}}>
                          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs px-2.5 py-1.5 focus:outline-none" style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)', border:'none'}}>
                            <option value="name">İsme Göre</option>
                            <option value="artist">Sanatçıya Göre</option>
                            <option value="category">Kategoriye Göre</option>
                            <option value="date">Tarihe Göre</option>
                            <option value="duration">Süreye Göre</option>
                            <option value="playcount">En Çok Dinlenen</option>
                            <option value="lastplayed">Son Dinlenen</option>
                          </select>
                          <button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} className="p-1.5 hover:bg-white/10 transition" style={{color:'var(--text-secondary)'}} title={sortDir === 'asc' ? 'Artan' : 'Azalan'}>
                            {sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          </button>
                        </div>

                        {/* View Modes */}
                        <div className="flex rounded-xl overflow-hidden border" style={{borderColor:'var(--border-color)'}}>
                          <button onClick={() => setLibraryViewMode('grid')} className="p-2 transition" style={libraryViewMode === 'grid' ? {backgroundColor:'var(--color-primary)', color:'white'} : {backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-secondary)'}}><Grid size={14} /></button>
                          <button onClick={() => setLibraryViewMode('list')} className="p-2 transition" style={libraryViewMode === 'list' ? {backgroundColor:'var(--color-primary)', color:'white'} : {backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-secondary)'}}><List size={14} /></button>
                          <button onClick={() => setLibraryViewMode('compact')} className="p-2 transition" style={libraryViewMode === 'compact' ? {backgroundColor:'var(--color-primary)', color:'white'} : {backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-secondary)'}}><LayoutList size={14} /></button>
                        </div>

                        {/* Queue Toggle */}
                        <button onClick={() => setShowQueuePanel(!showQueuePanel)} className="p-2 rounded-xl transition border hover:bg-white/5" style={{backgroundColor: showQueuePanel ? 'var(--color-primary)' : 'var(--color-bg-tertiary)', borderColor: 'var(--border-color)', color: showQueuePanel ? 'white' : 'var(--text-secondary)'}} title="Sıra">
                          <ListMusic size={14} />
                          {queueTracks.length > 0 && <span className="ml-1 text-[10px] font-bold" style={{color: showQueuePanel ? 'white' : 'var(--color-primary)'}}>{queueTracks.length}</span>}
                        </button>
                      </div>
                    </div>

                    {/* Library info bar — total tracks, artists, duration, and quick filters */}
                    {libraryLoaded && safeTracks.length > 0 && !scanProgress && (
                      <div className="flex items-center justify-between flex-wrap gap-2 px-1 py-1.5">
                        <div className="flex items-center gap-3 text-[11px]" style={{color:'var(--text-secondary)'}}>
                          <span className="font-medium" style={{color:'var(--text-primary)'}}>{safeTracks.length} müzik</span>
                          <span className="w-px h-3" style={{backgroundColor:'var(--border-color)'}} />
                          <span>{new Set(safeTracks.filter(t=>t.artist).map(t=>t.artist)).size} sanatçı</span>
                          <span className="w-px h-3" style={{backgroundColor:'var(--border-color)'}} />
                          <span>{(() => {
                            const totalSec = safeTracks.reduce((a,t) => a + (t.duration || 0), 0);
                            const hh = Math.floor(totalSec / 3600);
                            const mm = Math.floor((totalSec % 3600) / 60);
                            return hh > 0 ? `${h}s ${mm}dk` : `${mm}dk`;
                          })()}</span>
                          {searchQuery && sortedTracks.length > 0 && (
                            <>
                              <span className="w-px h-3" style={{backgroundColor:'var(--border-color)'}} />
                              <span className="text-primary">{sortedTracks.length} sonuç</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {['all', 'recent', 'mostplayed'].map(filter => {
                            const labels = { all: 'Tümü', recent: 'Yeni Eklenen', mostplayed: 'En Çok Dinlenen' };
                            const isActive = selectedCategory === filter || (selectedCategory === filter);
                            return (
                              <button
                                key={filter}
                                onClick={() => {
                                  if (filter === 'all') { setSelectedCategory('all'); setSortBy('name'); setSortDir('asc'); }
                                  else if (filter === 'recent') { setSelectedCategory('all'); setSortBy('date'); setSortDir('desc'); }
                                  else if (filter === 'mostplayed') { setSelectedCategory('all'); setSortBy('playcount'); setSortDir('desc'); }
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition",
                                  (filter === 'all' && sortBy === 'name') ||
                                  (filter === 'recent' && sortBy === 'date') ||
                                  (filter === 'mostplayed' && sortBy === 'playcount')
                                    ? "text-white" : ""
                                )}
                                style={(filter === 'all' && sortBy === 'name') ||
                                  (filter === 'recent' && sortBy === 'date') ||
                                  (filter === 'mostplayed' && sortBy === 'playcount')
                                  ? {backgroundColor:'var(--color-primary)'}
                                  : {backgroundColor:'var(--color-bg-tertiary)'}
                                }
                              >
                                {labels[filter]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  
                  {/* Loading state — compact spinner when library loading (no scan progress) */}
                  {!libraryLoaded && !scanProgress && (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                  
                  {/* Scanning progress below controls (when library not loaded) */}
                  {!libraryLoaded && scanProgress && scanProgress.total > 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <div className="w-64 max-w-full">
                        <div className="flex items-center justify-between text-xs mb-1" style={{color:'var(--text-secondary)'}}>
                          <span>{scanProgress.status || 'Kütüphane taranıyor...'}</span>
                          <span>{scanProgress.progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{backgroundColor:'var(--color-bg-tertiary)'}}>
                          <div className="h-full rounded-full transition-all duration-300 ease-out" style={{width:`${scanProgress.progress}%`, backgroundColor:'var(--color-primary)'}} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state */}
                  {libraryLoaded && safeTracks.length === 0 && (
                    <div className="text-center py-20" style={{color:'var(--text-secondary)'}}>
                      <ListMusic size={48} className="mx-auto mb-4 opacity-30" />
                      <p>Henüz müzik eklenmemiş.</p>
                    </div>
                  )}
                  
                  {/* Track list */}
                  {libraryLoaded && safeTracks.length > 0 && (
                    <>
                      {!searchQuery && <RecentlyPlayed onPlay={(t) => playTrack(t)} searchQuery={searchQuery} />}
                      {libraryViewMode === 'grid' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {displayTracks.map((track, idx) => (
                            <GridTrack key={track.id} track={track} selected={selectedTrackIds.includes(track.id)} onPlay={(e) => handleTrackClick(e, track, idx)} onCtx={(e) => handleCtxMenu(e, track)} searchQuery={searchQuery} />
                          ))}
                        </div>
                      )}
                      {libraryViewMode === 'list' && (
                        <div className="rounded-xl overflow-hidden border" style={{borderColor:'var(--border-color)'}}>
                          <div className="flex items-center px-4 py-2 text-[10px] font-bold uppercase tracking-wider" style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-secondary)'}}>
                            <div className="w-10">#</div>
                            <div className="flex-1">Başlık</div>
                            <div className="w-40">Sanatçı</div>
                            <div className="w-24">Süre</div>
                          </div>
                          {displayTracks.map((track, idx) => (
                            <ListTrack key={track.id} track={track} index={idx} selected={selectedTrackIds.includes(track.id)} onPlay={(e) => handleTrackClick(e, track, idx)} onCtx={(e) => handleCtxMenu(e, track)} formatTime={formatTime} searchQuery={searchQuery} />
                          ))}
                        </div>
                      )}
                      {libraryViewMode === 'compact' && (
                        <div className="flex flex-col gap-1">
                          {displayTracks.map((track, idx) => (
                            <CompactTrack key={track.id} track={track} index={idx} selected={selectedTrackIds.includes(track.id)} onPlay={(e) => handleTrackClick(e, track, idx)} onCtx={(e) => handleCtxMenu(e, track)} formatTime={formatTime} searchQuery={searchQuery} />
                          ))}
                        </div>
                      )}
                      {hasMoreTracks && (
                        <div className="text-center py-4">
                          <button 
                            onClick={loadMoreTracks}
                            className="px-6 py-2 rounded-lg text-sm font-bold transition hover:scale-105"
                            style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)'}}
                          >
                            Daha Fazla Göster ({sortedTracks.length - displayCount} müzik daha)
                          </button>
                        </div>
                      )}
                      {/* Batch action bar */}
                      {selectedTrackIds.length > 0 && (
                        <div className="sticky bottom-0 z-30 -mx-6 px-6 py-3 border-t flex items-center justify-between text-sm animate-slide-up" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)'}}>
                          <span style={{color:'var(--text-secondary)'}}>{selectedTrackIds.length} müzik seçildi</span>
                          <div className="flex items-center gap-2">
                            <button onClick={playSelectedTracks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition hover:scale-105 text-white" style={{backgroundColor:'var(--color-primary)'}}>
                              <Play size={14} fill="white" /> <span>Oynat</span>
                            </button>
                            <button onClick={queueSelectedTracks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition hover:bg-white/10" style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)'}}>
                              <ListMusic size={14} /> <span>Sıraya Ekle</span>
                            </button>
                            <button onClick={async () => {
                              const name = prompt('Yeni çalma listesi adı:');
                              if (name && name.trim()) {
                                await createPlaylist(name.trim());
                                // Add all selected tracks to the new playlist
                                const pls = await useStore.getState().loadPlaylists();
                                const pl = useStore.getState().playlists.find(p => p.name === name.trim());
                                if (pl) {
                                  const selectedTracks = safeTracks.filter(t => selectedTrackIds.includes(t.id));
                                  for (const t of selectedTracks) await addToPlaylist(pl.id, t.id);
                                }
                                showToast(`"${name.trim()}" listesine kaydedildi`, 'success');
                              }
                            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition hover:bg-white/10" style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)'}}>
                              <Plus size={14} /> <span>Listeye Kaydet</span>
                            </button>
                            <button onClick={deleteSelectedTracks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition hover:bg-red-500/20" style={{backgroundColor:'rgba(239,68,68,0.1)', color:'rgb(239,68,68)'}}>
                              <Trash2 size={14} /> <span>Sil</span>
                            </button>
                            <button onClick={clearSelection} className="px-3 py-1.5 rounded-lg font-bold transition hover:bg-white/10" style={{color:'var(--text-secondary)'}}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Queue Panel */}
                {showQueuePanel && (
                  <div className="w-64 shrink-0 border-l overflow-y-auto custom-scrollbar" style={{borderColor:'var(--border-color)'}} role="region" aria-label="Çalma Sırası">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{borderColor:'var(--border-color)'}}>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>
                        Sıra ({queueTracks.length})
                        {(() => {
                          const totalSec = queueTracks.reduce((a, t) => a + (t.duration || 0), 0) + (currentTrack?.duration || 0);
                          if (totalSec <= 0) return '';
                          const min = Math.floor(totalSec / 60);
                          return ` · ${min}dk`;
                        })()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={refreshLibrary} className="text-[10px] px-2 py-0.5 rounded hover:bg-white/10 transition" style={{color:'var(--color-primary)'}} title="Yenile" aria-label="Sırayı yenile">
                          <RotateCcw size={12} />
                        </button>
                        {queueTracks.length > 0 && (
                          <button onClick={clearQueue} className="text-[10px] px-2 py-0.5 rounded hover:bg-white/10 transition" style={{color:'rgb(239,68,68)'}}>Temizle</button>
                        )}
                      </div>
                    </div>
                    {queueTracks.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{borderColor:'var(--border-color)'}}>
                        <button onClick={() => { if (queueTracks.length > 0) playTrack(queueTracks[0]); }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition hover:bg-white/10" style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)'}}>
                          <Play size={10} fill="currentColor" /> Tümünü Oynat
                        </button>
                        <button onClick={async () => {
                          const name = prompt('Yeni çalma listesi adı:');
                          if (name && name.trim()) {
                            await createPlaylist(name.trim());
                            const pls = await useStore.getState().loadPlaylists();
                            const pl = useStore.getState().playlists.find(p => p.name === name.trim());
                            if (pl) {
                              for (const t of queueTracks) await addToPlaylist(pl.id, t.id);
                              showToast(`Sıra "${name.trim()}" listesine kaydedildi`, 'success');
                            }
                          }
                        }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition hover:bg-white/10" style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)'}}>
                          <Plus size={10} /> Listeye Kaydet
                        </button>
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 p-2">
                      {currentTrack && (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs" style={{backgroundColor:'var(--color-primary)', color:'white'}} role="status" aria-label="Şu an çalıyor">
                          <div className="shrink-0 w-3 h-3 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-bold">{currentTrack.title}</div>
                            <div className="truncate opacity-70">{currentTrack.artist}</div>
                          </div>
                          <Play fill="white" size={10} />
                        </div>
                      )}
                      {queueTracks.map((t, idx) => {
                        const isNextUp = idx === 0 && !currentTrack;
                        return (
                        <div
                          key={t.id + '-' + idx}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); e.currentTarget.style.opacity = '0.5'; }}
                          onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderTop = '2px solid var(--color-primary)'; }}
                          onDragLeave={(e) => { e.currentTarget.style.borderTop = ''; }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderTop = '';
                            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                            reorderQueue(fromIdx, idx);
                          }}
                          className={cn("group flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition hover:bg-white/5", isNextUp && "border border-primary/30")}
                        >
                          <span className="shrink-0 w-4 text-center text-[9px] cursor-grab active:cursor-grabbing" style={{color:'var(--text-secondary)'}} title="Sürükle">
                            <GripVertical size={10} />
                          </span>
                          <div className="min-w-0 flex-1" onClick={() => playTrack(t)} role="button" tabIndex={0} aria-label={`${t.title} - ${t.artist}`}>
                            <div className="truncate flex items-center gap-1">
                              {isNextUp && <span className="text-[8px] font-bold text-primary">SIRADA</span>}
                              <span>{t.title}</span>
                            </div>
                            <div className="truncate text-[9px]" style={{color:'var(--text-secondary)'}}>{t.artist}</div>
                          </div>
                          <button onClick={() => removeFromQueue(t.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition shrink-0" style={{color:'var(--text-secondary)'}} aria-label="Sıradan çıkar">
                            <X size={10} />
                          </button>
                        </div>
                      );})}
                      {queueTracks.length === 0 && !currentTrack && (
                        <div className="px-2 py-8 text-center" style={{color:'var(--text-secondary)'}}>
                          <ListMusic size={32} className="mx-auto mb-2 opacity-30" />
                          <p className="text-[11px] font-medium mb-1">Sırada şarkı yok</p>
                          <p className="text-[9px] opacity-60">Müziklere sağ tıklayarak <br />sıraya ekleyebilirsiniz</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
              )
            )}

              {activeTab === 'search' && <Suspense fallback={<div className="p-4 text-center text-sm opacity-50">Yükleniyor...</div>}><Downloader /></Suspense>}
              {activeTab === 'settings' && <Suspense fallback={<div className="p-4 text-center text-sm opacity-50">Yükleniyor...</div>}><SettingsPage /></Suspense>}
            </main>

        <PlayerBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          progress={progress}
          duration={duration}
          previousTrack={previousTrack}
          nextTrack={nextTrack}
          shuffleMode={shuffleMode}
          setShuffleMode={setShuffleMode}
          repeatMode={repeatMode}
          setRepeatMode={setRepeatMode}
          playbackRate={playbackRate}
          setPlaybackRate={setPlaybackRate}
          volume={volume}
          setVolume={setVolume}
          audioRef={audioRef}
          showVisualizer={showVisualizer}
          setShowVisualizer={setShowVisualizer}
          showWaveform={showWaveform}
          setShowWaveform={setShowWaveform}
          showLyrics={showLyrics}
          setShowLyrics={setShowLyrics}
          visualizerMode={visualizerMode}
          setVisualizerMode={setVisualizerMode}
          showMoreMenu={showMoreMenu}
          setShowMoreMenu={setShowMoreMenu}
          hoverTime={hoverTime}
          setHoverTime={setHoverTime}
          isSeeking={isSeeking}
          setIsSeeking={setIsSeeking}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          setShowEqualizer={setShowEqualizer}
          setShowEffects={setShowEffects}
           setShowPlaybackRate={setShowPlaybackRate}
           handleSeek={handleSeek}
           setMediaFullscreen={setMediaFullscreen}
           handleOpenFile={handleOpenFile}
           sleepTimer={sleepTimer}
           setSleepTimer={setSleepTimer}
           volumeBoost={volumeBoost}
           setVolumeBoost={setVolumeBoost}
           crossfadeDuration={crossfadeDuration}
           setCrossfadeDuration={setCrossfadeDuration}
          />
           
          {/* Mobile Bottom Navigation */}
          {isMobileViewport && (
            <BottomNav
              activeTab={activeTab}
              setActiveTab={(tab) => { setActiveTab(tab); setShowMobileSidebar(false); }}
            />
          )}

          {/* Global Visualizer/Waveform Overlay — renders above PlayerBar on ALL tabs */}
          {(showVisualizer || showWaveform) && (
            <div
              className="absolute bottom-28 left-0 right-0 flex items-end justify-center z-10 pointer-events-none"
              style={{
                height: '160px',
                opacity: currentTrack ? visualizerOpacity : 0.4,
                transition: 'opacity 0.4s ease-in-out',
              }}
            >
              <div className="pointer-events-auto w-full h-full flex items-center justify-center">
                <Suspense fallback={null}>
                  {currentTrack ? (
                    <>
                      {showWaveform && <Waveform audioRef={audioRef} />}
                      {showVisualizer && visualizerMode === 'spectrum' && <SpectrumAnalyzer analyserRef={analyserRef} />}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/30 pointer-events-none">
                      <Activity size={28} className="opacity-40" />
                      <span className="text-xs font-semibold tracking-wide">Ses çalmıyor</span>
                    </div>
                  )}
                </Suspense>
              </div>
            </div>
          )}
          
          {/* Subtitle Timeline Panel (replaces old lyrics) */}
          {showLyrics && (
            <div className="w-full max-w-md border-l overflow-y-auto flex flex-col" style={{backgroundColor:'var(--color-bg-secondary)', borderColor:'var(--border-color)'}}>
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{borderColor:'var(--border-color)'}}>
                <h3 className="font-bold text-sm">Altyazı Zaman Çizelgesi</h3>
                <button onClick={() => setShowLyrics(false)} className="hover:text-red-500 transition p-1"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Suspense fallback={<div className="text-center text-sm opacity-50 p-4">Altyazı yükleniyor...</div>}>
                  <LyricsPanel track={currentTrack} progress={progress} audioRef={audioRef} />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileViewport && showMobileSidebar && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
          {/* Drawer */}
          <div className="relative w-72 h-full flex flex-col shadow-2xl animate-slide-in-left overflow-y-auto" style={{backgroundColor:'var(--color-bg-secondary)'}}>
            <div className="flex items-center gap-3 p-6" style={{color:'var(--color-primary)'}}>
              <img src={appIcon} className="w-9 h-9 rounded-xl" />
              <span className="font-black tracking-tighter text-2xl">PLAYER</span>
            </div>
            <nav className="flex-1 px-4 gap-1 flex flex-col">
              {[
                { id: 'home', icon: Activity, label: 'Ana Sayfa' },
                { id: 'library', icon: ListMusic, label: 'Kütüphane' },
                { id: 'search', icon: Download, label: 'Müzik İndir' },
                { id: 'settings', icon: Settings, label: 'Ayarlar' },
              ].map(({ id, icon: Icon, label }) => (
                <div
                  key={id}
                  onClick={() => { setActiveTab(id); setShowMobileSidebar(false); }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all text-sm font-bold tracking-tight"
                  style={activeTab === id ? {backgroundColor:'var(--color-primary)', color:'white'} : {color:'var(--text-secondary)'}}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </div>
              ))}
            </nav>
            <div className="p-4 text-center text-[10px] opacity-30 font-mono">Player v1.0</div>
          </div>
        </div>
      )}
      {/* Dev Console kaldırıldı — log ayarları Settings > Gelişmiş Ayarlar'dan yönetilir */}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          ref={ctxRef}
          x={contextMenu.x}
          y={contextMenu.y}
          track={contextMenu.track}
          onClose={() => setContextMenu(null)}
          onPlay={() => { playTrack(contextMenu.track); setContextMenu(null); }}
          onRename={() => handleRenameTrack(contextMenu.track)}
          onToggleFavorite={() => {
            const wasFav = favorites.includes(contextMenu.track.id);
            toggleFavorite(contextMenu.track.id);
            showToast(wasFav ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi', 'success');
          }}
          onDelete={() => handleDeleteTrack(contextMenu.track)}
          onShowInfo={() => { 
            const t = contextMenu.track;
            alert(`Başlık: ${t.title}\nSanatçı: ${t.artist}\nSüre: ${t.duration ? Math.floor(t.duration/60)+':'+String(Math.floor(t.duration%60)).padStart(2,'0') : '0:00'}\nBPM: ${t.bpm || '-'}\nAnahtar: ${t.key || '-'}\nYıl: ${t.year || '-'}`);
            setContextMenu(null);
          }}
          onShowLocation={() => { 
            try {
              const { ipcRenderer } = window.require('electron');
              if (contextMenu.track?.location) ipcRenderer.invoke('open-folder', contextMenu.track.location);
            } catch {}
            setContextMenu(null);
          }}
          onToggleVisualizer={() => { setShowVisualizer(v => { if (!v) setVisualizerMode('spectrum'); return !v; }); setContextMenu(null); }}
          onToggleWaveform={() => { setShowWaveform(!showWaveform); setContextMenu(null); }}
          categories={categories}
          onAssignCategory={(categoryId, trackId) => addTrackToCategory(categoryId, trackId)}
          onAddToQueue={() => { addToQueue(contextMenu.track); showToast('Sıraya eklendi', 'success'); }}
          onPlayNext={() => playNext(contextMenu.track)}
          playlists={playlists}
          onAddToPlaylist={(plId, tId) => { addToPlaylist(plId, tId); const pl = playlists.find(p => p.id === plId); showToast(`"${pl?.name || 'Liste'}" eklendi`, 'success'); setContextMenu(null); }}
        />
      )}
      
      {/* Playback Rate Modal */}
      {showPlaybackRate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPlaybackRate(false)}>
          <div className="p-6 rounded-2xl w-96" style={{backgroundColor:'var(--color-bg-secondary)'}} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Oynatma Hızı</h3>
              <button onClick={() => setShowPlaybackRate(false)}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                <button key={rate} onClick={() => setPlaybackRate(rate)} className="px-4 py-3 rounded-xl font-bold transition" style={playbackRate === rate ? {backgroundColor:'var(--color-primary)', color:'white'} : {backgroundColor:'rgba(255,255,255,0.05)'}}>
                  {rate}x
                </button>
              ))}
            </div>
            <div>
              <input type="range" min="0.25" max="2" step="0.05" value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="w-full" />
              <div className="text-center text-sm mt-2" style={{color:'var(--text-secondary)'}}>{playbackRate.toFixed(2)}x</div>
            </div>
          </div>
        </div>
      )}
      
      {showEqualizer && <Suspense fallback={null}><EqualizerModal onClose={() => setShowEqualizer(false)} /></Suspense>}
      {showEffects && <Suspense fallback={null}><EffectsModal onClose={() => setShowEffects(false)} /></Suspense>}
      <ToastContainer />
      {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
    </div>
  </ErrorBoundary>
  );
};

export default App;
