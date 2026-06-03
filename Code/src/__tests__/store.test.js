import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store.js';

describe('store', () => {
  beforeEach(() => {
    // Reset store to defaults via setState
    useStore.setState({
      theme: 'dark',
      language: 'tr',
      layoutMode: 'normal',
      accentColor: '#0f6cbd',
      transparencyLevel: 0,
      sidebarMode: 'full',
      sidebarToggleBehavior: 'fullToggle',
      sidebarWidth: 256,
      tracks: [],
      playlists: [],
      activePlaylist: 'all',
      searchQuery: '',
      isLoading: false,
      scanProgress: null,
      activeTab: 'home',
      currentTrack: null,
      lastPlayedTrack: null,
      lastPlayedPosition: 0,
      lastPlayedAt: null,
      playId: 0,
      isPlaying: false,
      volume: 80,
      progress: 0,
      duration: 0,
      shuffleMode: false,
      repeatMode: 'off',
      playbackRate: 1.0,
      minimized: false,
      queue: [],
      playHistory: [],
      currentIndex: -1,
      showLyrics: false,
      showVisualizer: false,
      showWaveform: false,
      visualizerMode: 'spectrum',
      visualizerOpacity: 1,
      equalizerEnabled: false,
      equalizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      audioEffects: {
        clarity: 0, ambience: 0, surround: 0, dynamicBoost: 0, bassBoost: 0,
      },
      videoEffects: {
        brightness: 100, contrast: 100, saturation: 100, gamma: 100, sharpness: 0,
        cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
        rotate: 0, flipH: false, flipV: false, zoom: 100,
        threshold: 0, posterize: 0, oldPhoto: false,
        psychedelic: false, waterRipple: false, anaglyph: false, tiles: 0, puzzle: 0,
        logoImage: null, logoOpacity: 100, logoX: 50, logoY: 50, logoSize: 15,
        textContent: '', textX: 50, textY: 90, textSize: 24, textColor: '#ffffff',
        motionBlur: 0,
      },
      audioV2: {
        compressor: { threshold: 0, ratio: 1, knee: 30, attack: 0.003, release: 0.25, makeupGain: 0 },
        spatial: { enabled: false, positionX: 0, positionY: 0, positionZ: 0, coneInnerAngle: 360, coneOuterAngle: 360, coneOuterGain: 0, distanceModel: 'inverse', reverbMix: 0 },
        delay: { enabled: false, time: 0.3, feedback: 0.3, wetDry: 0.5 },
        expander: { enabled: false, threshold: -40, ratio: 2, attack: 0.01, release: 0.1 },
      },
      effectsBypassed: false,
      mapping: { avSyncOffset: 0, subtitleFile: null, subtitleTracks: [], activeSubtitle: null, subtitleOffset: 0, subtitleSize: 100, subtitleColor: '#ffffff' },
      eqPresets: {},
      customPresets: {},
      selectedPreset: 'Düz',
      perTrackEq: {},
      perTrackEffects: {},
      perTrackVideoEffects: {},
      perTrackMapping: {},
      searchHistory: [],
      aiProviders: [],
      aiChatMessages: [],
      installedPlugins: [],
      pluginSkillsPath: null,
      categories: [],
      libraryViewMode: 'grid',
      showNotifications: false,
      closeToTray: false,
      lastfmSessionKey: null,
      scrobbleEnabled: false,
      dbEnabled: 0,
      contextMenu: null,
      logs: [],
    });
  });

  it('has correct initial default values', () => {
    const state = useStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.language).toBe('tr');
    expect(state.volume).toBe(80);
    expect(state.shuffleMode).toBe(false);
    expect(state.repeatMode).toBe('off');
    expect(state.playbackRate).toBe(1.0);
    expect(state.tracks).toEqual([]);
    expect(state.currentTrack).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.activeTab).toBe('home');
    expect(state.accentColor).toBe('#0f6cbd');
    expect(state.sidebarMode).toBe('full');
    expect(state.libraryViewMode).toBe('grid');
  });

  it('updates theme', () => {
    useStore.getState().setTheme('light');
    expect(useStore.getState().theme).toBe('light');
  });

  it('updates language', () => {
    useStore.setState({ language: 'en' });
    expect(useStore.getState().language).toBe('en');
  });

  it('updates accent color', () => {
    useStore.setState({ accentColor: '#ff0000' });
    expect(useStore.getState().accentColor).toBe('#ff0000');
  });

  it('toggles play state', () => {
    expect(useStore.getState().isPlaying).toBe(false);
    useStore.getState().togglePlay();
    expect(useStore.getState().isPlaying).toBe(true);
    useStore.getState().togglePlay();
    expect(useStore.getState().isPlaying).toBe(false);
  });

  it('sets volume', () => {
    useStore.getState().setVolume(50);
    expect(useStore.getState().volume).toBe(50);
  });

  it('sets playback rate', () => {
    useStore.getState().setPlaybackRate(1.5);
    expect(useStore.getState().playbackRate).toBe(1.5);
    useStore.getState().setPlaybackRate(2.0);
    expect(useStore.getState().playbackRate).toBe(2.0);
  });

  it('sets current track via playTrack', () => {
    const track = { id: '1', title: 'Test', artist: 'Tester', duration: 120 };
    useStore.setState({ tracks: [track] });
    useStore.getState().playTrack(track);
    const state = useStore.getState();
    expect(state.currentTrack).not.toBeNull();
    expect(state.currentTrack.id).toBe('1');
    expect(state.currentTrack.playCount).toBe(1);
    expect(state.currentTrack.lastPlayedAt).toBeGreaterThan(0);
    expect(state.playId).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(state.activeTab).toBe('home');
  });

  it('manages queue: add, remove, clear', () => {
    const t1 = { id: '1', title: 'A' };
    const t2 = { id: '2', title: 'B' };
    // Set a currentTrack so addToQueue doesn't auto-play
    useStore.setState({ currentTrack: { id: '0' } });
    
    useStore.getState().addToQueue(t1);
    useStore.getState().addToQueue(t2);
    expect(useStore.getState().queue).toHaveLength(2);
    
    // removeFromQueue takes a trackId
    useStore.getState().removeFromQueue('1');
    expect(useStore.getState().queue).toHaveLength(1);
    expect(useStore.getState().queue[0].id).toBe('2');
    
    useStore.getState().clearQueue();
    expect(useStore.getState().queue).toHaveLength(0);
  });

  it('addToQueue deduplicates by id', () => {
    useStore.setState({ currentTrack: { id: '0' } });
    const track = { id: '1', title: 'A' };
    useStore.getState().addToQueue(track);
    useStore.getState().addToQueue(track); // Same track again
    expect(useStore.getState().queue).toHaveLength(1);
  });

  it('sets scan progress', () => {
    const progress = { current: 5, total: 10, progress: 50, status: 'scanning' };
    useStore.setState({ scanProgress: progress });
    expect(useStore.getState().scanProgress).toEqual(progress);
  });
});
