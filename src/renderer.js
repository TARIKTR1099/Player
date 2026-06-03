const { ipcRenderer, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DIRECT_MEDIA_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.flac',
  '.m4a',
  '.ogg',
  '.wma',
  '.aac',
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.webm'
]);

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm']);
const DEFAULT_AUDIO_EFFECTS = {
  clarity: 0,
  ambience: 0,
  surround: 0,
  dynamicBoost: 0,
  bassBoost: 0
};
const DEFAULT_AUDIO_PROFILES = {
  default: {
    id: 'default',
    name: 'Default',
    ...DEFAULT_AUDIO_EFFECTS
  },
  soundplus: {
    id: 'soundplus',
    name: 'Sound+',
    clarity: 100,
    ambience: 50,
    surround: 50,
    dynamicBoost: 5,
    bassBoost: 2
  }
};
const PLAYBACK_RATE_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;
const LIBRARY_REFRESH_BATCH_SIZE = 8;
const media = document.getElementById('audio-player');

const state = {
  settings: {
    theme: 'dark',
    itemsPerPage: 30,
    layoutMode: 'normal',
    language: 'system',
    audioEffects: { ...DEFAULT_AUDIO_EFFECTS },
    audioProfiles: JSON.parse(JSON.stringify(DEFAULT_AUDIO_PROFILES)),
    selectedAudioProfile: 'default',
    customPlaybackRate: 1,
    lastSession: null
  },
  library: {
    sources: [],
    tracks: [],
    favorites: [],
    playlists: [],
    viewMode: 'list',
    sortBy: 'custom',
    sortDirection: 'asc',
    currentListId: 'all',
    globalOrder: []
  },
  locale: 'tr',
  currentTab: 'home',
  currentTrackId: null,
  lastLibraryTrackId: null,
  currentTrackLoadId: 0,
  isPlaying: false,
  isShuffle: false,
  repeatMode: 'none',
  playbackRate: 1,
  previousVolume: 100,
  isMuted: false,
  isCompactMenuOpen: false,
  progressDragPointerId: null,
  searchQuery: '',
  sourceModalType: 'files',
  playlistModalMode: 'create',
  editingPlaylistId: null,
  editingTrackId: null,
  onlineResults: [],
  onlineTracks: [],
  onlineSearchLoading: false,
  onlineSearchError: '',
  lastWebQuery: '',
  modalWebCustomName: '',
  selectedTrackIds: [],
  toastTimer: null,
  seekFeedbackTimer: null,
  seekFeedbackValue: 0,
  librarySearchTimer: null,
  librarySaveTimer: null,
  settingsSaveTimer: null,
  lastSessionSaveAt: 0,
  lastWindowLayoutKey: '',
  vlcAvailable: false,
  shuffleOrder: []
};

const elements = {
  titleTabs: document.querySelectorAll('.title-tab'),
  brandSubtitle: document.querySelector('.brand-subtitle'),
  playerShell: document.getElementById('player-shell'),
  currentSongName: document.getElementById('current-song-name'),
  currentSongArtist: document.getElementById('current-song-artist'),
  currentSourceLabel: document.getElementById('current-source-label'),
  coverDisplay: document.getElementById('cover-display'),
  playerListSelect: document.getElementById('player-list-select'),
  currentTime: document.getElementById('current-time'),
  totalTime: document.getElementById('total-time'),
  markerSummary: document.getElementById('marker-summary'),
  progressBarWrapper: document.getElementById('progress-bar-wrapper'),
  progressBar: document.getElementById('progress-bar'),
  progressThumb: document.getElementById('progress-thumb'),
  progressSlider: document.getElementById('progress-slider'),
  rangeHighlight: document.getElementById('range-highlight'),
  markerA: document.getElementById('marker-a'),
  markerB: document.getElementById('marker-b'),
  seekFeedback: document.getElementById('seek-feedback'),
  playerToast: document.getElementById('player-toast'),
  playBtn: document.getElementById('play-btn'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  transportMeta: document.getElementById('transport-meta'),
  compactMoreBtn: document.getElementById('compact-more-btn'),
  shuffleBtn: document.getElementById('shuffle-btn'),
  repeatBtn: document.getElementById('repeat-btn'),
  compactShuffleBtn: document.getElementById('compact-shuffle-btn'),
  compactRepeatBtn: document.getElementById('compact-repeat-btn'),
  favoriteBtn: document.getElementById('favorite-btn'),
  cutStartBtn: document.getElementById('cut-start-btn'),
  cutEndBtn: document.getElementById('cut-end-btn'),
  clearLoopBtn: document.getElementById('clear-loop-btn'),
  openVlcBtn: document.getElementById('open-vlc-btn'),
  volumeIcon: document.getElementById('volume-icon'),
  volumeSlider: document.getElementById('volume-slider'),
  speedSelect: document.getElementById('speed-select'),
  compactSpeedSelect: document.getElementById('compact-speed-select'),
  compactModeBtn: document.getElementById('compact-mode-btn'),
  normalModeBtn: document.getElementById('normal-mode-btn'),
  sourceList: document.getElementById('source-list'),
  playlistList: document.getElementById('playlist-list'),
  openAddSourceBtn: document.getElementById('open-add-source-btn'),
  onlineSearchInput: document.getElementById('online-search-input'),
  onlineSearchBtn: document.getElementById('online-search-btn'),
  onlineSearchStatus: document.getElementById('online-search-status'),
  onlineResults: document.getElementById('online-results'),
  createPlaylistBtn: document.getElementById('create-playlist-btn'),
  searchInput: document.getElementById('library-search'),
  sortSelect: document.getElementById('sort-select'),
  sortAscBtn: document.getElementById('sort-order-asc'),
  sortDescBtn: document.getElementById('sort-order-desc'),
  viewListBtn: document.getElementById('view-list-btn'),
  viewGridBtn: document.getElementById('view-grid-btn'),
  currentListTitle: document.getElementById('current-list-title'),
  renamePlaylistBtn: document.getElementById('rename-playlist-btn'),
  deletePlaylistBtn: document.getElementById('delete-playlist-btn'),
  selectionToolbar: document.getElementById('selection-toolbar'),
  selectionCount: document.getElementById('selection-count'),
  selectVisibleBtn: document.getElementById('select-visible-btn'),
  bulkPlaylistSelect: document.getElementById('bulk-playlist-select'),
  bulkAddPlaylistBtn: document.getElementById('bulk-add-playlist-btn'),
  bulkRemoveBtn: document.getElementById('bulk-remove-btn'),
  clearSelectionBtn: document.getElementById('clear-selection-btn'),
  emptyState: document.getElementById('empty-state'),
  libraryList: document.getElementById('library-list'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsPanel: document.getElementById('settings-panel'),
  closeSettings: document.getElementById('close-settings'),
  startupToggle: document.getElementById('startup-toggle'),
  itemsPerPage: document.getElementById('items-per-page'),
  audioProfileSelect: document.getElementById('audio-profile-select'),
  saveDefaultAudioBtn: document.getElementById('save-default-audio-btn'),
  effectClarity: document.getElementById('effect-clarity'),
  effectAmbience: document.getElementById('effect-ambience'),
  effectSurround: document.getElementById('effect-surround'),
  effectDynamic: document.getElementById('effect-dynamic'),
  effectBass: document.getElementById('effect-bass'),
  restartAudioBtn: document.getElementById('restart-audio-btn'),
  themeButtons: document.querySelectorAll('.theme-btn'),
  languageButtons: document.querySelectorAll('.language-btn'),
  sourceModal: document.getElementById('source-modal'),
  closeSourceModal: document.getElementById('close-source-modal'),
  sourceChoices: document.querySelectorAll('.source-choice'),
  sourceFormContent: document.getElementById('source-form-content'),
  playlistModal: document.getElementById('playlist-modal'),
  playlistModalTitle: document.getElementById('playlist-modal-title'),
  closePlaylistModal: document.getElementById('close-playlist-modal'),
  playlistNameInput: document.getElementById('playlist-name-input'),
  savePlaylistBtn: document.getElementById('save-playlist-btn'),
  trackModal: document.getElementById('track-modal'),
  trackModalTitle: document.getElementById('track-modal-title'),
  closeTrackModal: document.getElementById('close-track-modal'),
  trackNameInput: document.getElementById('track-name-input'),
  trackStartInput: document.getElementById('track-start-input'),
  trackEndInput: document.getElementById('track-end-input'),
  trackPlaylistSelect: document.getElementById('track-playlist-select'),
  removeTrackBtn: document.getElementById('remove-track-btn'),
  saveTrackBtn: document.getElementById('save-track-btn'),
  minimizeBtn: document.getElementById('minimize-btn'),
  closeBtn: document.getElementById('close-btn')
};

let audioContext = null;
let mediaSourceNode = null;
let bassFilterNode = null;
let ambienceFilterNode = null;
let clarityFilterNode = null;
let compressorNode = null;
let enhancerGainNode = null;
let convolverNode = null;
let reverbWetNode = null;
let reverbDryNode = null;
let masterGainNode = null;

function cloneAudioProfiles() {
  return JSON.parse(JSON.stringify(DEFAULT_AUDIO_PROFILES));
}

function normalizeAudioEffects(effects = {}) {
  return {
    ...DEFAULT_AUDIO_EFFECTS,
    ...(effects || {})
  };
}

function mergeAudioProfiles(savedProfiles = {}) {
  const merged = cloneAudioProfiles();
  if (!savedProfiles || typeof savedProfiles !== 'object') {
    return merged;
  }

  Object.entries(savedProfiles).forEach(([id, profile]) => {
    if (!profile || typeof profile !== 'object') {
      return;
    }
    merged[id] = {
      id,
      name: profile.name || merged[id]?.name || id,
      ...normalizeAudioEffects(profile)
    };
  });

  return merged;
}

function formatPlaybackRate(rate) {
  const normalized = Number(rate) || 1;
  return String(Number(normalized.toFixed(2)));
}

function parsePlaybackRate(value, fallback = 1) {
  const normalized = Number(String(value || '').trim().replace(',', '.').replace(/x$/i, ''));
  if (!Number.isFinite(normalized)) {
    return fallback;
  }
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, normalized));
}

function syncPlaybackRateInputs() {
  const formattedRate = formatPlaybackRate(state.playbackRate);
  elements.speedSelect.value = formattedRate;
  elements.compactSpeedSelect.value = formattedRate;
}

function getSelectedAudioProfileId() {
  if (state.settings.selectedAudioProfile === 'soundplus' || state.settings.selectedAudioProfile === 'default') {
    return state.settings.selectedAudioProfile;
  }
  return getMatchingAudioProfileId(state.settings.audioEffects);
}

const STRINGS = {
  tr: {
    addSource: 'Kaynak ekle',
    addToLibrary: 'Kütüphaneye ekle',
    addToPlaylist: 'Listeye ekle',
    all: 'Hepsi',
    ambience: 'Ortam',
    appSubtitle: 'Modern masaüstü medya oynatıcı',
    audioDefaultSave: 'Varsayılan olarak kaydet',
    audioDefaultSaved: 'Ses güçlendirme varsayılanı kaydedildi.',
    audioProfile: 'Ses profili',
    audioProfileCustom: 'Özel',
    audioProfileDefault: 'Varsayılan',
    audioRestart: 'Ses sürücüsünü yeniden başlat',
    audioRestarted: 'Ses sürücüsü yeniden başlatıldı.',
    audioRestartFailed: 'Ses sürücüsü yeniden başlatılamadı.',
    bassBoost: 'Bass güçlendirme',
    clearMarkers: 'İşaretleri temizle',
    clearSelection: 'Temizle',
    close: 'Kapat',
    compactView: 'Kompakt görünüm',
    createPlaylist: 'Liste oluştur',
    currentList: 'Açık liste',
    customOrder: 'Özel sıra',
    delete: 'Sil',
    deletePlaylist: 'Listeyi sil',
    download: 'İndir',
    downloadDone: 'İndirme tamamlandı ve kütüphaneye eklendi.',
    downloadStarted: 'Parça indiriliyor...',
    dynamicBoost: 'Dinamik güçlendirme',
    edit: 'Düzenle',
    editTrack: 'Parça düzenle',
    effectClarity: 'Netlik',
    emptyLibraryBody: 'Dosya, klasör, URL, konum veya web kaynağı ekleyerek başlayabilirsin.',
    emptyLibraryTitle: 'Kütüphane boş',
    end: 'Bitiş',
    favorite: 'Favori',
    favorites: 'Favoriler',
    files: 'Dosya(lar)',
    folder: 'Klasör',
    language: 'Dil',
    languageEn: 'English',
    languageTr: 'Türkçe',
    leaveEmptyForEnd: 'sona kadar',
    library: 'Kütüphane',
    libraryTab: 'Kütüphane',
    link: 'Bağlantı',
    list: 'Liste',
    listView: 'Liste görünümü',
    location: 'Konum',
    markerNone: 'İşaret yok',
    minimize: 'Küçült',
    more: 'Daha fazla',
    newSource: 'Yeni kaynak',
    next: 'Sonraki',
    noDownloadUrl: 'İndirilebilir bağlantı bulunamadı.',
    noMatch: 'Bu görünümde eşleşen parça yok.',
    noSourceYet: 'Henüz kaynak yok. Yukarıdaki + ile ekleyebilirsin.',
    noVlc: 'Gömülü VLC paketi bulunamadı.',
    noVlcTrack: 'VLC için önce bir medya seç.',
    normalView: 'Normal görünüm',
    onlineEmpty: 'Burada çevrim içi sonuç listesi göreceksin.',
    onlineError: 'Arama başarısız oldu.',
    onlineOpenError: 'Web kaynağı açılamadı.',
    onlinePrepare: 'Web kaynağı hazırlanıyor...',
    onlineReady: 'Hazır',
    onlineSearching: 'Aranıyor',
    onlineTitle: 'Web ve bağlantı sonuçları',
    onlineUseDownload: 'Geçici web sonucunu favori yapmak yerine önce kütüphaneye ekle.',
    openInVlc: 'VLC ile aç',
    play: 'Oynat',
    playPause: 'Oynat veya duraklat',
    player: 'Oynatıcı',
    playlist: 'Liste',
    playlistCreate: 'Yeni liste oluştur',
    playlistName: 'Liste adı',
    playlistNone: 'Liste seçme',
    playlistRename: 'Listeyi yeniden adlandır',
    playlists: 'Listeler',
    previous: 'Önceki',
    repeat: 'Tekrar',
    removeFromLibrary: 'Kütüphaneden kaldır',
    removeFromPlaylist: 'Listeden çıkar',
    removeSelected: 'Seçileni kaldır',
    removeSource: 'Kaynağı sil',
    rename: 'Ad değiştir',
    restartAudioButton: 'Yeniden başlat',
    save: 'Kaydet',
    saveTrack: 'Parçayı kaydet',
    search: 'Ara',
    searchFailed: 'Arama başarısız oldu.',
    searchPlaceholder: 'Parça, sanatçı veya yol ara',
    searchWebPlaceholder: 'Şarkı adı veya bağlantı gir',
    selectTrack: 'Bir medya seç',
    selectTrackHelp: 'Kaynak ekleyip oynatmaya başlayabilirsin.',
    selectVisible: 'Görünenleri seç',
    selectedTracks: '{count} parça seçili',
    settings: 'Ayarlar',
    settingsTitle: 'Player ayarları',
    shuffle: 'Karıştır',
    sort: 'Sırala',
    sortAscending: 'Artan',
    sortByArtist: 'Yapana göre',
    sortByDate: 'Tarihe göre',
    sortByDuration: 'Süreye göre',
    sortByName: 'Ada göre',
    sortBySource: 'Kaynağa göre',
    sortByType: 'Türe göre',
    sortDescending: 'Azalan',
    sourceRenamed: 'Kaynak adı güncellendi.',
    sourceRenamePrompt: 'Kaynağın yeni adı',
    sourceTypeFiles: 'Dosya',
    sourceTypeFolder: 'Klasör',
    sourceTypeLocation: 'Konum',
    sourceTypeUrl: 'URL',
    sourceTypeWeb: 'Web',
    sources: 'Kaynaklar',
    speed: 'Hız',
    speedInvalid: 'Geçersiz hız. 0.25 ile 4 arasında bir değer gir.',
    start: 'Başlangıç',
    startMarker: 'Başlangıç işareti',
    startup: 'Açılışta çalışsın',
    successReady: 'Hazır',
    surround: 'Çevresel ses',
    theme: 'Tema',
    themeDark: 'Koyu',
    themeLight: 'Açık',
    trackDetails: 'Parça bilgileri',
    trackDisplayName: 'Görünecek ad',
    trackTypeWeb: 'WEB',
    tracksPerPage: 'Sayfa başına parça',
    unknownArtist: 'Bilinmeyen sanatçı',
    viewGrid: 'Kart görünümü',
    web: "Web'den ekle",
    webAddName: 'Kaydedilecek ad',
    webSearch: 'Web araması',
    whatToAdd: 'Neyi eklemek istiyorsun?',
    ytOpen: 'Bağlantıyı aç'
  },
  en: {
    addSource: 'Add source',
    addToLibrary: 'Add to library',
    addToPlaylist: 'Add to playlist',
    all: 'All',
    ambience: 'Ambience',
    appSubtitle: 'Modern desktop media player',
    audioDefaultSave: 'Save as default',
    audioDefaultSaved: 'Default audio enhancement saved.',
    audioProfile: 'Audio profile',
    audioProfileCustom: 'Custom',
    audioProfileDefault: 'Default',
    audioRestart: 'Restart audio driver',
    audioRestarted: 'Audio driver restarted.',
    audioRestartFailed: 'Audio driver could not be restarted.',
    bassBoost: 'Bass boost',
    clearMarkers: 'Clear markers',
    clearSelection: 'Clear',
    close: 'Close',
    compactView: 'Compact view',
    createPlaylist: 'Create playlist',
    currentList: 'Current list',
    customOrder: 'Custom order',
    delete: 'Delete',
    deletePlaylist: 'Delete playlist',
    download: 'Download',
    downloadDone: 'Download completed and added to the library.',
    downloadStarted: 'Downloading track...',
    dynamicBoost: 'Dynamic boost',
    edit: 'Edit',
    editTrack: 'Edit track',
    effectClarity: 'Clarity',
    emptyLibraryBody: 'Add files, folders, URLs, locations or web sources to get started.',
    emptyLibraryTitle: 'Library is empty',
    end: 'End',
    favorite: 'Favorite',
    favorites: 'Favorites',
    files: 'File(s)',
    folder: 'Folder',
    language: 'Language',
    languageEn: 'English',
    languageTr: 'Turkish',
    leaveEmptyForEnd: 'to end',
    library: 'Library',
    libraryTab: 'Library',
    link: 'Link',
    list: 'List',
    listView: 'List view',
    location: 'Location',
    markerNone: 'No markers',
    minimize: 'Minimize',
    more: 'More',
    newSource: 'New source',
    next: 'Next',
    noDownloadUrl: 'No downloadable link was found.',
    noMatch: 'No matching tracks in this view.',
    noSourceYet: 'No sources yet. Add one with the + button above.',
    noVlc: 'Bundled VLC package was not found.',
    noVlcTrack: 'Select media first for VLC.',
    normalView: 'Normal view',
    onlineEmpty: 'Online results will appear here.',
    onlineError: 'Search failed.',
    onlineOpenError: 'Web media could not be opened.',
    onlinePrepare: 'Preparing web media...',
    onlineReady: 'Ready',
    onlineSearching: 'Searching',
    onlineTitle: 'Web and link results',
    onlineUseDownload: 'Add the temporary web result to your library first.',
    openInVlc: 'Open in VLC',
    play: 'Play',
    playPause: 'Play or pause',
    player: 'Player',
    playlist: 'Playlist',
    playlistCreate: 'Create playlist',
    playlistName: 'Playlist name',
    playlistNone: 'No playlist',
    playlistRename: 'Rename playlist',
    playlists: 'Playlists',
    previous: 'Previous',
    repeat: 'Repeat',
    removeFromLibrary: 'Remove from library',
    removeFromPlaylist: 'Remove from playlist',
    removeSelected: 'Remove selected',
    removeSource: 'Remove source',
    rename: 'Rename',
    restartAudioButton: 'Restart',
    save: 'Save',
    saveTrack: 'Save track',
    search: 'Search',
    searchFailed: 'Search failed.',
    searchPlaceholder: 'Search track, artist or path',
    searchWebPlaceholder: 'Enter a song name or link',
    selectTrack: 'Select media',
    selectTrackHelp: 'Add a source and start playback.',
    selectVisible: 'Select visible',
    selectedTracks: '{count} tracks selected',
    settings: 'Settings',
    settingsTitle: 'Player settings',
    shuffle: 'Shuffle',
    sort: 'Sort',
    sortAscending: 'Ascending',
    sortByArtist: 'By artist',
    sortByDate: 'By date',
    sortByDuration: 'By duration',
    sortByName: 'By name',
    sortBySource: 'By source',
    sortByType: 'By type',
    sortDescending: 'Descending',
    sourceRenamed: 'Source name updated.',
    sourceRenamePrompt: 'New source name',
    sourceTypeFiles: 'File',
    sourceTypeFolder: 'Folder',
    sourceTypeLocation: 'Location',
    sourceTypeUrl: 'URL',
    sourceTypeWeb: 'Web',
    sources: 'Sources',
    speed: 'Speed',
    speedInvalid: 'Invalid speed. Enter a value between 0.25 and 4.',
    start: 'Start',
    startMarker: 'Start marker',
    startup: 'Run at startup',
    successReady: 'Ready',
    surround: 'Surround',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    trackDetails: 'Track details',
    trackDisplayName: 'Display name',
    trackTypeWeb: 'WEB',
    tracksPerPage: 'Tracks per page',
    unknownArtist: 'Unknown artist',
    viewGrid: 'Card view',
    web: 'Add from web',
    webAddName: 'Saved name',
    webSearch: 'Web search',
    whatToAdd: 'What do you want to add?',
    ytOpen: 'Open link'
  }
};

function t(key, vars = {}) {
  const dictionary = STRINGS[state.locale] || STRINGS.tr;
  const template = dictionary[key] || STRINGS.tr[key] || key;
  return Object.entries(vars).reduce((output, [name, value]) => output.replaceAll(`{${name}}`, String(value)), template);
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), state.locale === 'tr' ? 'tr' : 'en', { sensitivity: 'base' });
}

function sanitizeTrackId(candidate) {
  return String(candidate).replace(/[^\w\-:.]/g, '_');
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createTrackId(sourceType, locator) {
  return sanitizeTrackId(`${sourceType}:${String(locator).toLowerCase()}`);
}

function detectLocale(systemLocale, languagePreference) {
  if (languagePreference === 'tr' || languagePreference === 'en') {
    return languagePreference;
  }
  return String(systemLocale || navigator.language || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function parseTimeInput(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) {
    return null;
  }
  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(value)) {
    const parts = value.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + parts[1];
  }
  const numericValue = Number(value.replace(',', '.'));
  return Number.isFinite(numericValue) ? numericValue : null;
}

function isVideoPath(locator = '') {
  const cleanPath = String(locator).split('?')[0].split('#')[0];
  return VIDEO_EXTENSIONS.has(path.extname(cleanPath).toLowerCase());
}

function shouldTreatUrlAsWeb(url = '') {
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }
  const cleanUrl = String(url).split('?')[0].split('#')[0];
  const extension = path.extname(cleanUrl).toLowerCase();
  return !DIRECT_MEDIA_EXTENSIONS.has(extension);
}

function getTrackDisplayName(track) {
  return track?.customTitle || track?.title || t('selectTrack');
}

function getTrackArtist(track) {
  return track?.artist || t('unknownArtist');
}

function getTrackTypeLabel(track) {
  if (!track) {
    return t('successReady');
  }
  if (track.sourceType === 'url') {
    return 'URL';
  }
  if (track.sourceType === 'web' || track.sourceType === 'online') {
    return t('trackTypeWeb');
  }
  const cleanLocator = String(track.location || track.url || '').split('?')[0].split('#')[0];
  const extension = path.extname(cleanLocator).replace('.', '').toUpperCase();
  if (extension) {
    return extension;
  }
  return track.isVideo ? 'VIDEO' : t('sourceTypeFiles').toUpperCase();
}

function getTrackSegment(track) {
  return {
    start: Number.isFinite(track?.cutStart) ? track.cutStart : null,
    end: Number.isFinite(track?.cutEnd) ? track.cutEnd : null
  };
}

function formatSegmentBadge(track) {
  const segment = getTrackSegment(track);
  if (!(segment.start || segment.start === 0)) {
    return '';
  }
  return segment.end || segment.end === 0
    ? `${formatTime(segment.start)} - ${formatTime(segment.end)}`
    : `${formatTime(segment.start)} - ${t('leaveEmptyForEnd')}`;
}

function requiresResolution(track) {
  return track?.sourceType === 'web' || track?.sourceType === 'online';
}

function isEphemeralOnlineTrack(track) {
  return track?.sourceType === 'online';
}

function getBuiltInLists() {
  return [
    { id: 'all', name: t('all'), system: true },
    { id: 'favorites', name: t('favorites'), system: true }
  ];
}

function getCustomPlaylists() {
  return Array.isArray(state.library.playlists) ? state.library.playlists : [];
}

function getAllLists() {
  return [...getBuiltInLists(), ...getCustomPlaylists()];
}

function getCurrentList() {
  return getAllLists().find((item) => item.id === state.library.currentListId) || getBuiltInLists()[0];
}

function getTrackById(trackId) {
  return state.library.tracks.find((track) => track.id === trackId) || state.onlineTracks.find((track) => track.id === trackId) || null;
}

function ensureGlobalOrder() {
  const trackIds = new Set(state.library.tracks.map((track) => track.id));
  const nextOrder = (state.library.globalOrder || []).filter((trackId) => trackIds.has(trackId));
  state.library.tracks.forEach((track) => {
    if (!nextOrder.includes(track.id)) {
      nextOrder.push(track.id);
    }
  });
  state.library.globalOrder = nextOrder;
}

function cleanupSelection() {
  const validTrackIds = new Set(state.library.tracks.map((track) => track.id));
  state.selectedTrackIds = state.selectedTrackIds.filter((trackId) => validTrackIds.has(trackId));
}

function ensureLibraryConsistency() {
  const trackIds = new Set(state.library.tracks.map((track) => track.id));
  state.library.favorites = (state.library.favorites || []).filter((trackId) => trackIds.has(trackId));
  state.library.playlists = (state.library.playlists || []).map((playlist) => ({
    ...playlist,
    itemIds: (playlist.itemIds || []).filter((trackId) => trackIds.has(trackId)),
    updatedAt: playlist.updatedAt || Date.now()
  }));
  ensureGlobalOrder();
  cleanupSelection();
  if (!getAllLists().some((list) => list.id === state.library.currentListId)) {
    state.library.currentListId = 'all';
  }
}

function getTracksForList(listId) {
  if (listId === 'favorites') {
    return state.library.tracks.filter((track) => state.library.favorites.includes(track.id));
  }
  const customList = getCustomPlaylists().find((playlist) => playlist.id === listId);
  if (customList) {
    const itemIds = new Set(customList.itemIds || []);
    return state.library.tracks.filter((track) => itemIds.has(track.id));
  }
  return [...state.library.tracks];
}

function getPlaylistStats(listId) {
  const tracks = getTracksForList(listId);
  const totalDuration = tracks.reduce((sum, track) => sum + (Number(track.duration) || 0), 0);
  return {
    count: tracks.length,
    durationLabel: formatTime(totalDuration)
  };
}

function sortTracks(tracks) {
  const direction = state.library.sortDirection === 'desc' ? -1 : 1;
  const currentList = getCurrentList();

  if (state.library.sortBy === 'custom') {
    const orderedIds =
      currentList.id === 'favorites'
        ? state.library.globalOrder.filter((trackId) => state.library.favorites.includes(trackId))
        : currentList.system
        ? state.library.globalOrder
        : currentList.itemIds || [];
    const indexMap = new Map(orderedIds.map((trackId, index) => [trackId, index]));
    const sorted = [...tracks].sort((a, b) => (indexMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (indexMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    return direction === -1 ? sorted.reverse() : sorted;
  }

  const typeCounts = new Map();
  if (state.library.sortBy === 'type') {
    tracks.forEach((track) => {
      const type = getTrackTypeLabel(track);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
  }

  return [...tracks].sort((a, b) => {
    let comparison = 0;
    if (state.library.sortBy === 'name') {
      comparison = compareText(getTrackDisplayName(a), getTrackDisplayName(b));
    } else if (state.library.sortBy === 'artist') {
      comparison = compareText(getTrackArtist(a), getTrackArtist(b));
    } else if (state.library.sortBy === 'duration') {
      comparison = (Number(a.duration) || 0) - (Number(b.duration) || 0);
    } else if (state.library.sortBy === 'date') {
      comparison = (Number(a.addedAt) || 0) - (Number(b.addedAt) || 0);
    } else if (state.library.sortBy === 'source') {
      comparison = compareText(a.sourceLabel || '', b.sourceLabel || '');
    } else if (state.library.sortBy === 'type') {
      const typeA = getTrackTypeLabel(a);
      const typeB = getTrackTypeLabel(b);
      comparison = (typeCounts.get(typeA) || 0) - (typeCounts.get(typeB) || 0);
      if (comparison === 0) {
        comparison = compareText(typeA, typeB);
      }
    }
    if (comparison === 0) {
      comparison = compareText(getTrackDisplayName(a), getTrackDisplayName(b));
    }
    return comparison * direction;
  });
}

function getFilteredTracks() {
  let tracks = getTracksForList(state.library.currentListId);
  const query = state.searchQuery.trim().toLowerCase();

  if (query) {
    tracks = tracks.filter((track) => {
      const haystack = [
        getTrackDisplayName(track),
        getTrackArtist(track),
        getTrackTypeLabel(track),
        track.sourceLabel,
        track.location,
        track.url
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  return sortTracks(tracks);
}

function rebuildShuffleOrder(anchorTrackId = state.currentTrackId) {
  const visibleIds = getFilteredTracks().map((track) => track.id);
  const remaining = visibleIds.filter((trackId) => trackId !== anchorTrackId);
  for (let index = remaining.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
  }
  state.shuffleOrder = anchorTrackId && visibleIds.includes(anchorTrackId) ? [anchorTrackId, ...remaining] : remaining;
}

function getPlayableTracks() {
  const currentTrack = getTrackById(state.currentTrackId);
  if (isEphemeralOnlineTrack(currentTrack) && state.onlineTracks.length) {
    return state.onlineTracks;
  }
  const visibleTracks = getFilteredTracks();
  if (!state.isShuffle) {
    return visibleTracks;
  }
  const visibleIds = new Set(visibleTracks.map((track) => track.id));
  if (!Array.isArray(state.shuffleOrder) || !state.shuffleOrder.length || state.shuffleOrder.some((trackId) => !visibleIds.has(trackId))) {
    rebuildShuffleOrder(state.currentTrackId);
  }
  const trackMap = new Map(visibleTracks.map((track) => [track.id, track]));
  return state.shuffleOrder.map((trackId) => trackMap.get(trackId)).filter(Boolean);
}

function getCurrentTrack() {
  return getTrackById(state.currentTrackId);
}

function getAudioSource(track) {
  if (!track) return '';
  if (track.url) {
    return track.url;
  }
  if (!track.location) {
    console.error('getAudioSource: track location is empty', track);
    return '';
  }
  try {
    return pathToFileURL(track.location).href;
  } catch (err) {
    console.error('getAudioSource error converting location to URL:', err, track.location);
    return '';
  }
}

function createOnlineTrackFromResult(result) {
  return {
    id: result.id,
    sourceId: result.id,
    sourceType: 'online',
    location: result.pageUrl || result.streamUrl || '',
    url: result.streamUrl || '',
    title: result.title || '',
    artist: result.artist || '',
    duration: Number(result.duration) || 0,
    picture: result.thumbnail || null,
    addedAt: Date.now(),
    sourceLabel: result.sourceLabel || t('trackTypeWeb'),
    isVideo: Boolean(result.isVideo),
    provider: result.provider || 'youtube',
    pageUrl: result.pageUrl || '',
    audioProxyUrl: result.audioProxyUrl || '',
    spotifyUrl: result.spotifyUrl || '',
    resolvedAt: result.streamUrl ? Date.now() : null
  };
}

function createSourceFromUrl(label, url) {
  if (shouldTreatUrlAsWeb(url)) {
    return {
      id: generateId('source'),
      type: 'web',
      label,
      provider: 'youtube',
      pageUrl: url,
      audioProxyUrl: '',
      artist: t('link'),
      duration: 0,
      thumbnail: null,
      streamUrl: '',
      createdAt: Date.now()
    };
  }
  return {
    id: generateId('source'),
    type: 'url',
    label,
    url,
    createdAt: Date.now()
  };
}

function sourceToTrackCandidates(source) {
  if (source.type === 'url') {
    return [
      {
        id: createTrackId('url', source.url),
        sourceId: source.id,
        sourceType: 'url',
        url: source.url,
        location: source.url,
        title: source.label,
        artist: t('link'),
        duration: 0,
        picture: null,
        addedAt: source.createdAt || Date.now(),
        sourceLabel: source.label,
        isVideo: isVideoPath(source.url)
      }
    ];
  }

  if (source.type === 'web') {
    return [
      {
        id: createTrackId('web', source.pageUrl || source.label),
        sourceId: source.id,
        sourceType: 'web',
        provider: source.provider || 'youtube',
        pageUrl: source.pageUrl || '',
        audioProxyUrl: source.audioProxyUrl || '',
        url: source.streamUrl || '',
        location: source.pageUrl || source.streamUrl || '',
        title: source.label,
        artist: source.artist || t('trackTypeWeb'),
        duration: Number(source.duration) || 0,
        picture: source.thumbnail || null,
        addedAt: source.createdAt || Date.now(),
        sourceLabel: source.label,
        isVideo: false,
        resolvedAt: source.streamUrl ? Date.now() : null
      }
    ];
  }

  return [];
}

async function mapInBatches(items, mapper, batchSize = LIBRARY_REFRESH_BATCH_SIZE) {
  const results = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const mappedBatch = await Promise.all(batch.map(mapper));
    results.push(...mappedBatch);
  }
  return results;
}

function getTrackPersistenceSignature(track) {
  return [
    track.id,
    track.sourceId,
    track.sourceType,
    track.location,
    track.title,
    track.artist,
    Number(track.duration) || 0,
    track.picture || '',
    track.addedAt || 0,
    track.sourceLabel || '',
    track.isVideo ? 1 : 0,
    track.fileMtimeMs || 0,
    track.fileSize || 0,
    track.customTitle || '',
    track.cutStart ?? '',
    track.cutEnd ?? '',
    track.pageUrl || '',
    track.url || '',
    track.audioProxyUrl || '',
    track.resolvedAt || 0
  ].join('|');
}

function haveTrackCollectionsChanged(currentTracks, nextTracks) {
  if (currentTracks.length !== nextTracks.length) {
    return true;
  }

  for (let index = 0; index < currentTracks.length; index += 1) {
    if (getTrackPersistenceSignature(currentTracks[index]) !== getTrackPersistenceSignature(nextTracks[index])) {
      return true;
    }
  }

  return false;
}

async function createTrackFromFile(filePath, source, existingMap) {
  let fileStats = { size: 0, mtimeMs: 0 };
  try {
    const stat = await fs.promises.stat(filePath);
    fileStats = { size: stat.size, mtimeMs: stat.mtimeMs };
  } catch (error) {
    fileStats = { size: 0, mtimeMs: 0 };
  }

  const baseTrack = {
    id: createTrackId(source.type, filePath),
    sourceId: source.id,
    sourceType: source.type,
    location: filePath,
    title: path.basename(filePath, path.extname(filePath)),
    artist: t('unknownArtist'),
    duration: 0,
    picture: null,
    addedAt: Date.now(),
    sourceLabel: source.label,
    isVideo: isVideoPath(filePath),
    fileMtimeMs: fileStats.mtimeMs,
    fileSize: fileStats.size
  };

  const existing = existingMap.get(baseTrack.id);
  if (existing && existing.fileMtimeMs === baseTrack.fileMtimeMs && existing.fileSize === baseTrack.fileSize) {
    return {
      ...existing,
      sourceId: source.id,
      sourceType: source.type,
      sourceLabel: source.label
    };
  }

  try {
    const metadata = await ipcRenderer.invoke('get-metadata', filePath);
    return {
      ...baseTrack,
      title: metadata.title || baseTrack.title,
      artist: metadata.artist || baseTrack.artist,
      duration: Number(metadata.duration) || 0,
      picture: metadata.picture || null,
      addedAt: existing?.addedAt || baseTrack.addedAt,
      customTitle: existing?.customTitle || null,
      cutStart: existing?.cutStart ?? null,
      cutEnd: existing?.cutEnd ?? null
    };
  } catch (error) {
    return {
      ...baseTrack,
      addedAt: existing?.addedAt || baseTrack.addedAt,
      customTitle: existing?.customTitle || null,
      cutStart: existing?.cutStart ?? null,
      cutEnd: existing?.cutEnd ?? null
    };
  }
}

async function refreshLibraryFromSources(options = {}) {
  const existingMap = new Map(state.library.tracks.map((track) => [track.id, track]));
  const previousTracks = state.library.tracks;
  const nextTracks = [];

  for (const source of state.library.sources) {
    if (source.type === 'url' || source.type === 'web') {
      nextTracks.push(
        ...sourceToTrackCandidates(source).map((track) => {
          const existing = existingMap.get(track.id);
          return {
            ...track,
            addedAt: existing?.addedAt || track.addedAt,
            customTitle: existing?.customTitle || null,
            cutStart: existing?.cutStart ?? null,
            cutEnd: existing?.cutEnd ?? null
          };
        })
      );
      continue;
    }

    const filePaths = await ipcRenderer.invoke('scan-source', source);
    nextTracks.push(
      ...(await mapInBatches(filePaths, (filePath) => createTrackFromFile(filePath, source, existingMap)))
    );
  }

  const tracksChanged = haveTrackCollectionsChanged(previousTracks, nextTracks);
  state.library.tracks = nextTracks;
  ensureLibraryConsistency();

  if (!getTrackById(state.currentTrackId)) {
    state.currentTrackId = null;
    state.isPlaying = false;
    media.pause();
    media.removeAttribute('src');
    media.load();
  }

  if (state.isShuffle) {
    rebuildShuffleOrder(state.currentTrackId);
  }

  if (tracksChanged) {
    persistLibrary();
  }
  if (!options.silent || tracksChanged) {
    renderAll();
  }
}

function persistSettings() {
  ipcRenderer.invoke('save-settings', state.settings);
}

function persistLibrary(force = false) {
  if (state.librarySaveTimer) {
    clearTimeout(state.librarySaveTimer);
    state.librarySaveTimer = null;
  }

  if (force) {
    ipcRenderer.invoke('save-library-state', state.library);
    return;
  }

  state.librarySaveTimer = setTimeout(() => {
    state.librarySaveTimer = null;
    ipcRenderer.invoke('save-library-state', state.library);
  }, 220);
}

function flushLibrarySave() {
  if (state.librarySaveTimer) {
    clearTimeout(state.librarySaveTimer);
    state.librarySaveTimer = null;
  }
  ipcRenderer.invoke('save-library-state', state.library);
}

function queueSettingsSave(delay = 250) {
  if (state.settingsSaveTimer) {
    clearTimeout(state.settingsSaveTimer);
  }
  state.settingsSaveTimer = setTimeout(() => {
    state.settingsSaveTimer = null;
    persistSettings();
  }, delay);
}

function saveSessionState(force = false) {
  const now = Date.now();
  if (!force && now - state.lastSessionSaveAt < 2500) {
    return;
  }

  const currentTrack = getCurrentTrack();
  state.settings.lastSession = currentTrack
    ? {
        track: {
          id: currentTrack.id,
          sourceType: currentTrack.sourceType,
          title: currentTrack.title,
          artist: currentTrack.artist,
          duration: currentTrack.duration,
          picture: currentTrack.picture || null,
          sourceLabel: currentTrack.sourceLabel,
          pageUrl: currentTrack.pageUrl || '',
          provider: currentTrack.provider || '',
          url: currentTrack.url || '',
          audioProxyUrl: currentTrack.audioProxyUrl || '',
          isVideo: Boolean(currentTrack.isVideo)
        },
        currentListId: state.library.currentListId,
        position: Number(media.currentTime) || 0,
        playbackRate: state.playbackRate,
        wasPlaying: state.isPlaying,
        savedAt: now
      }
    : null;

  state.lastSessionSaveAt = now;
  if (force) {
    persistSettings();
  } else {
    queueSettingsSave();
  }
}

async function restoreLastSession() {
  const session = state.settings.lastSession;
  if (!session?.track) {
    return;
  }

  if (session.currentListId) {
    state.library.currentListId = session.currentListId;
  }

  if (session.playbackRate) {
    setPlaybackRate(Number(session.playbackRate) || 1);
  }

  if (session.track.sourceType === 'online') {
    const restoredTrack = createOnlineTrackFromResult({
      id: session.track.id,
      provider: session.track.provider,
      title: session.track.title,
      artist: session.track.artist,
      duration: session.track.duration,
      thumbnail: session.track.picture,
      pageUrl: session.track.pageUrl,
      streamUrl: session.track.url,
      audioProxyUrl: session.track.audioProxyUrl,
      sourceLabel: session.track.sourceLabel,
      isVideo: session.track.isVideo
    });
    state.onlineTracks = [restoredTrack];
    await playTrack(restoredTrack.id, {
      autoplay: Boolean(session.wasPlaying),
      initialTime: Number(session.position) || 0
    });
    return;
  }

  const track = getTrackById(session.track.id);
  if (!track) {
    return;
  }

  await playTrack(track.id, {
    autoplay: Boolean(session.wasPlaying),
    initialTime: Number(session.position) || 0
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  elements.themeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === theme);
  });
}

function applyLocalization() {
  document.documentElement.lang = state.locale;
  elements.brandSubtitle.textContent = t('appSubtitle');
  document.getElementById('home-tab-btn').title = t('player');
  document.getElementById('library-tab-btn').title = t('libraryTab');
  elements.compactModeBtn.title = t('compactView');
  elements.normalModeBtn.title = t('normalView');
  elements.settingsBtn.title = t('settings');
  elements.minimizeBtn.title = t('minimize');
  elements.closeBtn.title = t('close');
  elements.shuffleBtn.title = t('shuffle');
  elements.repeatBtn.title = t('repeat');
  elements.compactShuffleBtn.title = t('shuffle');
  elements.compactRepeatBtn.title = elements.repeatBtn.title;
  elements.favoriteBtn.title = t('favorite');
  elements.cutStartBtn.title = t('startMarker');
  elements.cutEndBtn.title = t('end');
  elements.clearLoopBtn.title = t('clearMarkers');
  elements.openVlcBtn.title = t('openInVlc');
  elements.prevBtn.title = t('previous');
  elements.playBtn.title = t('playPause');
  elements.nextBtn.title = t('next');
  elements.compactMoreBtn.title = t('more');
  document.getElementById('player-list-label').textContent = t('list');
  document.getElementById('speed-label').textContent = t('speed');
  document.getElementById('compact-speed-label').textContent = t('speed');
  document.getElementById('sort-label').textContent = t('sort');
  elements.sortAscBtn.title = t('sortAscending');
  elements.sortDescBtn.title = t('sortDescending');
  elements.viewListBtn.title = t('listView');
  elements.viewGridBtn.title = t('viewGrid');
  elements.openAddSourceBtn.title = t('addSource');
  elements.createPlaylistBtn.title = t('createPlaylist');
  elements.renamePlaylistBtn.textContent = t('rename');
  elements.deletePlaylistBtn.textContent = t('deletePlaylist');
  elements.searchInput.placeholder = t('searchPlaceholder');
  elements.onlineSearchInput.placeholder = t('searchWebPlaceholder');
  elements.onlineSearchBtn.querySelector('span').textContent = t('search');
  document.getElementById('online-eyebrow').textContent = t('webSearch');
  document.getElementById('online-title').textContent = t('onlineTitle');
  document.getElementById('current-list-eyebrow').textContent = t('currentList');
  document.getElementById('sources-eyebrow').textContent = t('sources');
  document.getElementById('sources-title').textContent = t('library');
  document.getElementById('playlists-eyebrow').textContent = t('playlists');
  document.getElementById('playlists-title').textContent = state.locale === 'tr' ? 'Seç ve düzenle' : 'Select and edit';
  document.querySelector('#empty-state h3').textContent = t('emptyLibraryTitle');
  document.querySelector('#empty-state p').textContent = t('emptyLibraryBody');
  elements.selectionCount.textContent = t('selectedTracks', { count: state.selectedTrackIds.length });
  elements.selectVisibleBtn.textContent = t('selectVisible');
  elements.bulkAddPlaylistBtn.textContent = t('addToPlaylist');
  elements.bulkRemoveBtn.textContent = t('removeSelected');
  elements.clearSelectionBtn.textContent = t('clearSelection');
  document.getElementById('settings-eyebrow').textContent = t('settings');
  document.getElementById('settings-title').textContent = t('settingsTitle');
  document.getElementById('theme-label').textContent = t('theme');
  document.getElementById('language-label').textContent = t('language');
  document.getElementById('startup-label').textContent = t('startup');
  document.getElementById('items-per-page-label').textContent = t('tracksPerPage');
  document.getElementById('audio-profile-label').textContent = t('audioProfile');
  document.getElementById('save-default-audio-label').textContent = t('audioDefaultSave');
  document.getElementById('effect-clarity-label').textContent = t('effectClarity');
  document.getElementById('effect-ambience-label').textContent = t('ambience');
  document.getElementById('effect-surround-label').textContent = t('surround');
  document.getElementById('effect-dynamic-label').textContent = t('dynamicBoost');
  document.getElementById('effect-bass-label').textContent = t('bassBoost');
  document.getElementById('restart-audio-label').textContent = t('audioRestart');
  elements.saveDefaultAudioBtn.textContent = t('audioDefaultSave');
  elements.restartAudioBtn.textContent = t('restartAudioButton');
  const themeButtons = Array.from(elements.themeButtons);
  if (themeButtons[0]) themeButtons[0].textContent = t('themeDark');
  if (themeButtons[1]) themeButtons[1].textContent = t('themeLight');
  const languageButtons = Array.from(elements.languageButtons);
  if (languageButtons[0]) languageButtons[0].textContent = t('languageTr');
  if (languageButtons[1]) languageButtons[1].textContent = t('languageEn');
  document.getElementById('source-modal-eyebrow').textContent = t('newSource');
  document.getElementById('source-modal-title').textContent = t('whatToAdd');
  document.getElementById('playlist-modal-eyebrow').textContent = t('playlist');
  elements.playlistModalTitle.textContent = state.playlistModalMode === 'rename' ? t('playlistRename') : t('playlistCreate');
  document.getElementById('playlist-name-label').textContent = t('playlistName');
  elements.playlistNameInput.placeholder = state.locale === 'tr' ? 'Örn. Akşam listesi' : 'Example: Evening mix';
  elements.savePlaylistBtn.textContent = t('save');
  document.getElementById('track-modal-eyebrow').textContent = t('editTrack');
  elements.trackModalTitle.textContent = state.editingTrackId ? getTrackDisplayName(getTrackById(state.editingTrackId)) : t('trackDetails');
  document.getElementById('track-name-label').textContent = t('trackDisplayName');
  document.getElementById('track-start-label').textContent = t('start');
  document.getElementById('track-end-label').textContent = t('end');
  document.getElementById('track-playlist-label').textContent = t('addToPlaylist');
  elements.trackEndInput.placeholder = state.locale === 'tr' ? 'Boşsa sona kadar' : 'Leave empty for end';
  elements.removeTrackBtn.textContent = t('removeFromLibrary');
  elements.saveTrackBtn.textContent = t('saveTrack');

  const sourceChoiceLabels = [t('files'), t('folder'), 'URL', t('location'), t('web')];
  document.querySelectorAll('.source-choice span').forEach((node, index) => {
    if (sourceChoiceLabels[index]) {
      node.textContent = sourceChoiceLabels[index];
    }
  });

  const sortTextMap = {
    custom: t('customOrder'),
    name: t('sortByName'),
    artist: t('sortByArtist'),
    duration: t('sortByDuration'),
    date: t('sortByDate'),
    source: t('sortBySource'),
    type: t('sortByType')
  };
  Array.from(elements.sortSelect.options).forEach((option) => {
    option.textContent = sortTextMap[option.value] || option.textContent;
  });

  const audioProfileTextMap = {
    default: t('audioProfileDefault'),
    soundplus: 'Sound+',
    custom: t('audioProfileCustom')
  };
  Array.from(elements.audioProfileSelect.options).forEach((option) => {
    option.textContent = audioProfileTextMap[option.value] || option.textContent;
  });

  elements.languageButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.language === state.locale);
  });
}

function getAudioProfile(profileId) {
  if (!profileId || profileId === 'custom') {
    return null;
  }
  return state.settings.audioProfiles?.[profileId] || null;
}

function getMatchingAudioProfileId(effects = state.settings.audioEffects) {
  const normalizedEffects = normalizeAudioEffects(effects);
  for (const [profileId, profile] of Object.entries(state.settings.audioProfiles || {})) {
    const normalizedProfile = normalizeAudioEffects(profile);
    const isMatch = Object.keys(DEFAULT_AUDIO_EFFECTS).every(
      (key) => Number(normalizedEffects[key] || 0) === Number(normalizedProfile[key] || 0)
    );
    if (isMatch) {
      return profileId;
    }
  }
  return 'custom';
}

function syncAudioProfileSelect() {
  elements.audioProfileSelect.value = getSelectedAudioProfileId();
}

function syncAudioEffectInputs() {
  elements.effectClarity.value = String(state.settings.audioEffects.clarity);
  elements.effectAmbience.value = String(state.settings.audioEffects.ambience);
  elements.effectSurround.value = String(state.settings.audioEffects.surround);
  elements.effectDynamic.value = String(state.settings.audioEffects.dynamicBoost);
  elements.effectBass.value = String(state.settings.audioEffects.bassBoost);
  syncAudioProfileSelect();
}

function applyAudioProfile(profileId, options = {}) {
  const profile = getAudioProfile(profileId);
  if (!profile) {
    syncAudioProfileSelect();
    return;
  }

  state.settings.selectedAudioProfile = profileId;
  state.settings.audioEffects = normalizeAudioEffects(profile);
  syncAudioEffectInputs();
  ensureAudioGraph();
  updateAudioEffects();

  if (options.persist !== false) {
    queueSettingsSave();
  }
}

function updateAudioEffectsFromInputs() {
  state.settings.audioEffects = normalizeAudioEffects({
    clarity: Number(elements.effectClarity.value),
    ambience: Number(elements.effectAmbience.value),
    surround: Number(elements.effectSurround.value),
    dynamicBoost: Number(elements.effectDynamic.value),
    bassBoost: Number(elements.effectBass.value)
  });
  state.settings.selectedAudioProfile = getMatchingAudioProfileId(state.settings.audioEffects);
  syncAudioProfileSelect();
  ensureAudioGraph();
  updateAudioEffects();
  queueSettingsSave();
}

function saveCurrentAudioProfileAsDefault() {
  state.settings.audioProfiles.default = {
    ...(state.settings.audioProfiles.default || { id: 'default', name: 'Default' }),
    ...normalizeAudioEffects(state.settings.audioEffects)
  };
  state.settings.selectedAudioProfile = 'default';
  syncAudioProfileSelect();
  queueSettingsSave();
  showToast(t('audioDefaultSaved'));
}

function createImpulseResponse(context, durationSeconds = 1.8, decay = 2.2) {
  const sampleRate = context.sampleRate;
  const length = sampleRate * durationSeconds;
  const impulse = context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const channelData = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const n = index / length;
      channelData[index] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
  }
  return impulse;
}

function ensureAudioGraph() {
  if (audioContext) {
    return;
  }

  const ContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!ContextCtor) {
    return;
  }

  audioContext = new ContextCtor();
  mediaSourceNode = audioContext.createMediaElementSource(media);
  bassFilterNode = audioContext.createBiquadFilter();
  ambienceFilterNode = audioContext.createBiquadFilter();
  clarityFilterNode = audioContext.createBiquadFilter();
  compressorNode = audioContext.createDynamicsCompressor();
  enhancerGainNode = audioContext.createGain();
  convolverNode = audioContext.createConvolver();
  reverbWetNode = audioContext.createGain();
  reverbDryNode = audioContext.createGain();
  masterGainNode = audioContext.createGain();

  bassFilterNode.type = 'lowshelf';
  bassFilterNode.frequency.value = 140;
  ambienceFilterNode.type = 'peaking';
  ambienceFilterNode.frequency.value = 950;
  ambienceFilterNode.Q.value = 0.9;
  clarityFilterNode.type = 'highshelf';
  clarityFilterNode.frequency.value = 3400;
  convolverNode.buffer = createImpulseResponse(audioContext);

  mediaSourceNode.connect(bassFilterNode);
  bassFilterNode.connect(ambienceFilterNode);
  ambienceFilterNode.connect(clarityFilterNode);
  clarityFilterNode.connect(compressorNode);
  compressorNode.connect(enhancerGainNode);
  enhancerGainNode.connect(reverbDryNode);
  enhancerGainNode.connect(convolverNode);
  convolverNode.connect(reverbWetNode);
  reverbDryNode.connect(masterGainNode);
  reverbWetNode.connect(masterGainNode);
  masterGainNode.connect(audioContext.destination);

  updateAudioEffects();
}

function updateAudioEffects() {
  if (!audioContext) {
    return;
  }
  const effects = state.settings.audioEffects || {};
  bassFilterNode.gain.value = Number(effects.bassBoost || 0) * 0.16;
  ambienceFilterNode.gain.value = Number(effects.ambience || 0) * 0.12;
  clarityFilterNode.gain.value = Number(effects.clarity || 0) * 0.15;
  compressorNode.threshold.value = -32 + Number(effects.dynamicBoost || 0) * 0.18;
  compressorNode.ratio.value = 1 + Number(effects.dynamicBoost || 0) * 0.08;
  compressorNode.attack.value = 0.01;
  compressorNode.release.value = 0.18;
  enhancerGainNode.gain.value = 1 + Number(effects.dynamicBoost || 0) * 0.012;
  reverbWetNode.gain.value = Number(effects.surround || 0) * 0.012;
  reverbDryNode.gain.value = 1;
  masterGainNode.gain.value = 1;
}

async function restartAudioDriver() {
  try {
    const currentTrack = getCurrentTrack();
    const resumePlayback = state.isPlaying;
    const resumeTime = Number(media.currentTime) || 0;

    if (currentTrack) {
      if (!(await ensureTrackReady(currentTrack))) {
        throw new Error(t('audioRestartFailed'));
      }

      const loadId = Date.now();
      state.currentTrackLoadId = loadId;
      media.pause();
      media.removeAttribute('src');
      media.load();
      media.src = getAudioSource(currentTrack);
      media.load();
      await waitForTrackLoad(loadId);
      applyTrackSegmentOnLoad(currentTrack, resumeTime);
      if (resumePlayback) {
        await media.play().catch(() => {
          state.isPlaying = false;
        });
      }
    }

    ensureAudioGraph();
    await audioContext?.resume?.();
    showToast(t('audioRestarted'));
  } catch (error) {
    showToast(error?.message || t('audioRestartFailed'));
  }
}

function updateCurrentTrack(patch) {
  const track = getCurrentTrack();
  if (!track) {
    return;
  }
  Object.assign(track, patch);
  if (!isEphemeralOnlineTrack(track)) {
    persistLibrary();
  }
  renderAll();
  saveSessionState();
}

function renderMarkerSummary(track) {
  const segment = getTrackSegment(track);
  if (!(segment.start || segment.start === 0)) {
    elements.markerSummary.textContent = t('markerNone');
    return;
  }
  elements.markerSummary.textContent =
    segment.end || segment.end === 0
      ? `A ${formatTime(segment.start)} • B ${formatTime(segment.end)}`
      : `A ${formatTime(segment.start)} • B ${t('leaveEmptyForEnd')}`;
}

function updateProgressVisuals() {
  const track = getCurrentTrack();
  const segment = getTrackSegment(track);
  const duration = Number(media.duration) || Number(track?.duration) || 0;
  const currentTime = Number(media.currentTime) || 0;
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));

  elements.progressBar.style.width = `${clampedPercent}%`;
  elements.progressThumb.style.left = `${clampedPercent}%`;
  elements.progressSlider.value = String(Number.isFinite(progressPercent) ? progressPercent : 0);
  elements.currentTime.textContent = formatTime(currentTime);
  elements.totalTime.textContent = formatTime(duration);

  if (!duration || !(segment.start || segment.start === 0)) {
    elements.rangeHighlight.style.left = '0%';
    elements.rangeHighlight.style.width = '0%';
    elements.markerA.classList.add('hidden');
    elements.markerB.classList.add('hidden');
    return;
  }

  const startPct = (segment.start / duration) * 100;
  const endPct = ((segment.end || segment.end === 0 ? segment.end : duration) / duration) * 100;
  elements.rangeHighlight.style.left = `${startPct}%`;
  elements.rangeHighlight.style.width = `${Math.max(0, endPct - startPct)}%`;
  elements.markerA.style.left = `${startPct}%`;
  elements.markerA.classList.remove('hidden');

  if (segment.end || segment.end === 0) {
    elements.markerB.style.left = `${endPct}%`;
    elements.markerB.classList.remove('hidden');
  } else {
    elements.markerB.classList.add('hidden');
  }
}

function showSeekFeedback(delta) {
  state.seekFeedbackValue += delta;
  const prefix = state.seekFeedbackValue > 0 ? '+' : '';
  elements.seekFeedback.textContent = `${prefix}${state.seekFeedbackValue} sn`;
  elements.seekFeedback.classList.remove('hidden');

  if (state.seekFeedbackTimer) {
    clearTimeout(state.seekFeedbackTimer);
  }

  state.seekFeedbackTimer = setTimeout(() => {
    state.seekFeedbackValue = 0;
    elements.seekFeedback.classList.add('hidden');
  }, 900);
}

function showToast(message) {
  if (!message) {
    return;
  }
  elements.playerToast.textContent = message;
  elements.playerToast.classList.remove('hidden');

  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }

  state.toastTimer = setTimeout(() => {
    elements.playerToast.classList.add('hidden');
  }, 2300);
}

function updateFavoriteButton() {
  const track = getCurrentTrack();
  const isFavorite = track ? state.library.favorites.includes(track.id) : false;
  elements.favoriteBtn.disabled = !track;
  elements.favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
  elements.favoriteBtn.classList.toggle('active-heart', isFavorite);
}

function updateCompactMenuState() {
  const isCompact = state.settings.layoutMode === 'compact';
  elements.playerShell.classList.toggle('compact-menu-open', isCompact && state.isCompactMenuOpen);
}

function renderPlaybackControls() {
  elements.playBtn.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
  elements.shuffleBtn.classList.toggle('active', state.isShuffle);
  elements.repeatBtn.classList.toggle('active', state.repeatMode === 'one');
  elements.repeatBtn.title = state.repeatMode === 'one' ? (state.locale === 'tr' ? 'Tekrar: Açık (1)' : 'Repeat: One (1)') : (state.locale === 'tr' ? 'Tekrar: Kapalı' : 'Repeat: Off');
  elements.compactShuffleBtn.classList.toggle('active', state.isShuffle);
  elements.compactRepeatBtn.classList.toggle('active', state.repeatMode === 'one');
  elements.compactRepeatBtn.title = elements.repeatBtn.title;
  elements.openVlcBtn.disabled = !state.vlcAvailable || !getCurrentTrack();
  updateFavoriteButton();

  const volumeValue = Number(elements.volumeSlider.value) || 0;
  let volumeIcon = 'fa-volume-high';
  if (volumeValue === 0) {
    volumeIcon = 'fa-volume-xmark';
  } else if (volumeValue < 45) {
    volumeIcon = 'fa-volume-low';
  }
  elements.volumeIcon.innerHTML = `<i class="fas ${volumeIcon}"></i>`;
  updateCompactMenuState();
}

function renderNowPlaying() {
  const track = getCurrentTrack();
  const hasVideo = Boolean(track?.isVideo);

  elements.playerShell.classList.toggle('has-video', hasVideo);
  elements.coverDisplay.classList.toggle('hidden', hasVideo);
  media.classList.toggle('hidden', !hasVideo);

  if (!track) {
    elements.currentSongName.textContent = t('selectTrack');
    elements.currentSongArtist.textContent = t('selectTrackHelp');
    elements.currentSourceLabel.textContent = t('successReady');
    elements.coverDisplay.innerHTML = '<i class="fas fa-music"></i>';
    renderMarkerSummary(null);
    updateProgressVisuals();
    return;
  }

  elements.currentSongName.textContent = getTrackDisplayName(track);
  elements.currentSongArtist.textContent = getTrackArtist(track);
  elements.currentSourceLabel.textContent = getTrackTypeLabel(track);
  if (!hasVideo) {
    elements.coverDisplay.innerHTML = track.picture
      ? `<img src="${track.picture}" alt="${escapeHtml(getTrackDisplayName(track))}">`
      : '<i class="fas fa-compact-disc"></i>';
  }
  renderMarkerSummary(track);
  updateProgressVisuals();
}

function updateTrackActiveState() {
  document.querySelectorAll('.track-row, .track-card').forEach((node) => {
    node.classList.toggle('active', node.dataset.trackId === state.currentTrackId);
  });
}

function updateSortButtons() {
  elements.sortAscBtn.classList.toggle('active', state.library.sortDirection === 'asc');
  elements.sortDescBtn.classList.toggle('active', state.library.sortDirection === 'desc');
}

function updateViewButtons() {
  elements.viewListBtn.classList.toggle('active', state.library.viewMode === 'list');
  elements.viewGridBtn.classList.toggle('active', state.library.viewMode === 'grid');
}

function updateOnlineStatus() {
  if (state.onlineSearchLoading) {
    elements.onlineSearchStatus.textContent = t('onlineSearching');
    return;
  }
  if (state.onlineSearchError) {
    elements.onlineSearchStatus.textContent = t('onlineError');
    return;
  }
  elements.onlineSearchStatus.textContent = state.onlineResults.length
    ? `${state.onlineResults.length} ${state.locale === 'tr' ? 'sonuç' : 'results'}`
    : t('onlineReady');
}

function renderPlayerListSelect() {
  elements.playerListSelect.innerHTML = getAllLists()
    .map((list) => `<option value="${list.id}">${escapeHtml(list.name)}</option>`)
    .join('');
  elements.playerListSelect.value = state.library.currentListId;
}

function getSourceTypeLabel(type) {
  const map = {
    files: t('sourceTypeFiles'),
    folder: t('sourceTypeFolder'),
    url: t('sourceTypeUrl'),
    location: t('sourceTypeLocation'),
    web: t('sourceTypeWeb')
  };
  return map[type] || t('sourceTypeFiles');
}

function getSourceIconClass(type) {
  if (type === 'url') return 'fa-link';
  if (type === 'web') return 'fa-globe';
  if (type === 'files') return 'fa-file-audio';
  return 'fa-folder-tree';
}

function renderSourceList() {
  if (!state.library.sources.length) {
    elements.sourceList.innerHTML = `<div class="helper-card">${escapeHtml(t('noSourceYet'))}</div>`;
    return;
  }

  elements.sourceList.innerHTML = state.library.sources
    .map((source) => `
      <div class="source-card">
        <div class="source-meta">
          <span class="source-icon"><i class="fas ${getSourceIconClass(source.type)}"></i></span>
          <div>
            <strong>${escapeHtml(source.label)}</strong>
            <small>${escapeHtml(getSourceTypeLabel(source.type))}</small>
          </div>
        </div>
        <div class="track-actions">
          <button class="icon-action" data-action="rename-source" data-source-id="${source.id}" title="${escapeHtml(t('rename'))}">
            <i class="fas fa-pen"></i>
          </button>
          <button class="icon-action danger-text" data-action="remove-source" data-source-id="${source.id}" title="${escapeHtml(t('removeSource'))}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `)
    .join('');
}

function renderPlaylistList() {
  elements.playlistList.innerHTML = getAllLists()
    .map((playlist) => {
      const stats = getPlaylistStats(playlist.id);
      return `
        <button class="playlist-card ${playlist.id === state.library.currentListId ? 'active' : ''}" data-action="select-playlist" data-playlist-id="${playlist.id}">
          <div>
            <strong>${escapeHtml(playlist.name)}</strong>
            <span class="playlist-count">${escapeHtml(getTrackCountLabel(stats.count))}</span>
            <small>${stats.count} • ${stats.durationLabel}</small>
          </div>
          ${playlist.system ? '' : '<i class="fas fa-chevron-right"></i>'}
        </button>
      `;
    })
    .join('');
}

function getOnlineResultMarkup(result, mode = 'panel') {
  const providerLabel = result.provider === 'musicapi' ? 'MusicAPI' : 'YouTube';
  const buttons =
    mode === 'modal'
      ? `
          <button class="ghost-btn" data-action="play-online-result" data-online-id="${result.id}">${escapeHtml(t('play'))}</button>
          <button class="ghost-btn" data-action="add-web-source" data-online-id="${result.id}">${escapeHtml(t('addToLibrary'))}</button>
        `
      : `
          <button class="ghost-btn" data-action="play-online-result" data-online-id="${result.id}">${escapeHtml(t('play'))}</button>
          <button class="ghost-btn" data-action="add-web-source-inline" data-online-id="${result.id}">${escapeHtml(t('addToLibrary'))}</button>
          <button class="ghost-btn" data-action="download-online-result" data-online-id="${result.id}">${escapeHtml(t('download'))}</button>
          ${
            result.pageUrl
              ? `<button class="icon-action" data-action="open-online-page" data-online-id="${result.id}" title="${escapeHtml(t('ytOpen'))}"><i class="fas fa-up-right-from-square"></i></button>`
              : ''
          }
        `;

  return `
    <div class="online-result">
      ${
        result.thumbnail
          ? `<img src="${result.thumbnail}" alt="${escapeHtml(result.title)}">`
          : '<div class="online-result-cover"><i class="fas fa-music"></i></div>'
      }
      <div class="online-result-meta">
        <div class="online-result-copy">
          <strong>${escapeHtml(result.title || '')}</strong>
          <p>${escapeHtml(result.artist || t('unknownArtist'))}</p>
          <small>${escapeHtml(providerLabel)} • ${formatTime(Number(result.duration) || 0)}</small>
        </div>
        <span class="provider-pill">${escapeHtml(providerLabel)}</span>
      </div>
      <div class="online-result-actions">
        ${buttons}
      </div>
    </div>
  `;
}

function renderOnlineResults() {
  updateOnlineStatus();

  if (state.onlineSearchLoading) {
    elements.onlineResults.innerHTML = `<div class="helper-card">${escapeHtml(t('onlineSearching'))}...</div>`;
    return;
  }

  if (state.onlineSearchError) {
    elements.onlineResults.innerHTML = `<div class="helper-card">${escapeHtml(state.onlineSearchError)}</div>`;
    return;
  }

  if (!state.onlineResults.length) {
    elements.onlineResults.innerHTML = `<div class="helper-card">${escapeHtml(t('onlineEmpty'))}</div>`;
    return;
  }

  elements.onlineResults.innerHTML = state.onlineResults.map((result) => getOnlineResultMarkup(result, 'panel')).join('');
}

function renderModalWebResults() {
  const host = document.getElementById('source-web-results');
  if (!host) {
    return;
  }

  if (state.onlineSearchLoading) {
    host.innerHTML = `<div class="helper-card">${escapeHtml(t('onlineSearching'))}...</div>`;
    return;
  }

  if (state.onlineSearchError) {
    host.innerHTML = `<div class="helper-card">${escapeHtml(state.onlineSearchError)}</div>`;
    return;
  }

  if (!state.onlineResults.length) {
    host.innerHTML = `<div class="helper-card">${escapeHtml(t('onlineEmpty'))}</div>`;
    return;
  }

  host.innerHTML = state.onlineResults.map((result) => getOnlineResultMarkup(result, 'modal')).join('');
}

function renderTrackActions(track, currentList) {
  const favoriteActive = state.library.favorites.includes(track.id);
  const buttons = [
    `<button class="icon-action ${favoriteActive ? 'active-heart' : ''}" data-action="toggle-favorite" data-track-id="${track.id}" title="${escapeHtml(t('favorite'))}"><i class="${favoriteActive ? 'fas' : 'far'} fa-heart"></i></button>`,
    `<button class="icon-action" data-action="edit-track" data-track-id="${track.id}" title="${escapeHtml(t('edit'))}"><i class="fas fa-pen"></i></button>`,
    `<button class="icon-action" data-action="open-in-vlc-track" data-track-id="${track.id}" title="${escapeHtml(t('openInVlc'))}" ${state.vlcAvailable ? '' : 'disabled'}><i class="fas fa-clapperboard"></i></button>`
  ];

  if (!currentList.system) {
    buttons.push(`<button class="icon-action" data-action="remove-from-playlist" data-track-id="${track.id}" data-playlist-id="${currentList.id}" title="${escapeHtml(t('removeFromPlaylist'))}"><i class="fas fa-list-check"></i></button>`);
  }

  buttons.push(`<button class="icon-action danger-text" data-action="remove-track" data-track-id="${track.id}" title="${escapeHtml(t('removeFromLibrary'))}"><i class="fas fa-trash"></i></button>`);
  return buttons.join('');
}

function renderTrackCover(track, className = 'track-art') {
  const icon = track.isVideo ? 'fa-film' : 'fa-music';
  return track.picture
    ? `<span class="${className}"><img src="${track.picture}" alt="${escapeHtml(getTrackDisplayName(track))}"></span>`
    : `<span class="${className}"><i class="fas ${icon}"></i></span>`;
}

function getTrackCountLabel(count) {
  if (state.locale === 'tr') {
    return `${count} adet`;
  }
  return `${count} ${count === 1 ? 'track' : 'tracks'}`;
}

function renderBulkPlaylistOptions() {
  elements.bulkPlaylistSelect.innerHTML = [`<option value="">${escapeHtml(t('playlistNone'))}</option>`]
    .concat(getCustomPlaylists().map((playlist) => `<option value="${playlist.id}">${escapeHtml(playlist.name)}</option>`))
    .join('');
}

function renderSelectionToolbar() {
  const count = state.selectedTrackIds.length;
  elements.selectionToolbar.classList.toggle('hidden', count === 0);
  elements.selectionCount.textContent = t('selectedTracks', { count });
  renderBulkPlaylistOptions();
  elements.bulkAddPlaylistBtn.disabled = count === 0 || !getCustomPlaylists().length;
  elements.bulkRemoveBtn.disabled = count === 0;
  elements.clearSelectionBtn.disabled = count === 0;
}

function renderLibrary() {
  const tracks = getFilteredTracks();
  const currentList = getCurrentList();

  elements.libraryList.className = `music-list-container ${state.library.viewMode === 'grid' ? 'grid-view' : 'list-view'}`;
  elements.currentListTitle.textContent = currentList.name;
  document.getElementById('current-list-eyebrow').textContent = getTrackCountLabel(tracks.length);
  elements.renamePlaylistBtn.disabled = currentList.system;
  elements.deletePlaylistBtn.disabled = currentList.system;
  elements.emptyState.classList.toggle('hidden', state.library.tracks.length > 0);
  renderSelectionToolbar();

  if (!tracks.length) {
    elements.libraryList.innerHTML = `<div class="helper-card">${escapeHtml(t('noMatch'))}</div>`;
    return;
  }

  if (state.library.viewMode === 'grid') {
    elements.libraryList.innerHTML = tracks
      .map((track) => {
        const segmentLabel = formatSegmentBadge(track);
        const selected = state.selectedTrackIds.includes(track.id);
        return `
          <article class="track-card ${track.id === state.currentTrackId ? 'active' : ''}" data-track-id="${track.id}">
            <div class="track-card-top">
              <label class="track-check">
                <input type="checkbox" data-action="toggle-track-selection" data-track-id="${track.id}" ${selected ? 'checked' : ''}>
                <span></span>
              </label>
              <div class="track-actions">${renderTrackActions(track, currentList)}</div>
            </div>
            <button class="track-visual" data-action="play-track" data-track-id="${track.id}">
              ${track.picture ? `<img src="${track.picture}" alt="${escapeHtml(getTrackDisplayName(track))}">` : `<i class="fas ${track.isVideo ? 'fa-film' : 'fa-music'}"></i>`}
            </button>
            <div class="track-card-body">
              <h3>${escapeHtml(getTrackDisplayName(track))}</h3>
              <p>${escapeHtml(getTrackArtist(track))}</p>
              <small>${escapeHtml(getTrackTypeLabel(track))}</small>
            </div>
            <div class="track-card-footer">
              <span class="track-badge">${escapeHtml(segmentLabel || getTrackTypeLabel(track))}</span>
              <span class="track-duration">${formatTime(Number(track.duration) || 0)}</span>
            </div>
          </article>
        `;
      })
      .join('');
    return;
  }

  elements.libraryList.innerHTML = tracks
    .map((track) => {
      const segmentLabel = formatSegmentBadge(track);
      const typeLabel = segmentLabel ? `${getTrackTypeLabel(track)} • ${segmentLabel}` : getTrackTypeLabel(track);
      const selected = state.selectedTrackIds.includes(track.id);
      return `
        <div class="track-row ${track.id === state.currentTrackId ? 'active' : ''}" data-track-id="${track.id}">
          <label class="track-check">
            <input type="checkbox" data-action="toggle-track-selection" data-track-id="${track.id}" ${selected ? 'checked' : ''}>
            <span></span>
          </label>
          <button class="track-row-main" data-action="play-track" data-track-id="${track.id}">
            ${renderTrackCover(track)}
            <span class="track-copy">
              <span class="track-title-wrap">
                <strong>${escapeHtml(getTrackDisplayName(track))}</strong>
              </span>
              <span class="track-meta-line">
                <span class="track-artist">${escapeHtml(getTrackArtist(track))}</span>
                <small class="track-inline-badge">${escapeHtml(typeLabel)}</small>
              </span>
            </span>
            <span class="track-duration">${formatTime(Number(track.duration) || 0)}</span>
          </button>
          <div class="track-actions">${renderTrackActions(track, currentList)}</div>
        </div>
      `;
    })
    .join('');
}

function applyLayoutMode() {
  document.body.classList.toggle('compact-mode', state.settings.layoutMode === 'compact');
  if (state.settings.layoutMode !== 'compact') {
    state.isCompactMenuOpen = false;
  }
  elements.compactModeBtn.classList.toggle('active', state.settings.layoutMode === 'compact');
  elements.normalModeBtn.classList.toggle('active', state.settings.layoutMode !== 'compact');
  updateCompactMenuState();
}

function renderPlayerState() {
  renderNowPlaying();
  renderPlaybackControls();
  updateTrackActiveState();
}

function renderAll() {
  ensureLibraryConsistency();
  applyLocalization();
  renderPlayerListSelect();
  renderSourceList();
  renderPlaylistList();
  renderPlayerState();
  renderLibrary();
  renderOnlineResults();
  updateSortButtons();
  updateViewButtons();
  syncWindowLayout();
}

function syncWindowLayout(force = false) {
  const nextLayout = {
    tab: state.currentTab,
    layoutMode: state.settings.layoutMode,
    hasVideo: Boolean(getCurrentTrack()?.isVideo && state.currentTab === 'home')
  };
  const layoutKey = `${nextLayout.tab}:${nextLayout.layoutMode}:${nextLayout.hasVideo ? 'video' : 'audio'}`;
  if (!force && state.lastWindowLayoutKey === layoutKey) {
    return;
  }
  state.lastWindowLayoutKey = layoutKey;
  ipcRenderer.invoke('set-window-layout', nextLayout);
}

function syncPlaybackState() {
  const queue = getPlayableTracks();
  const currentTrack = getCurrentTrack();
  ipcRenderer.invoke('playback-updated', {
    isPlaying: state.isPlaying,
    title: currentTrack ? getTrackDisplayName(currentTrack) : t('successReady'),
    artist: currentTrack ? getTrackArtist(currentTrack) : '',
    canGoPrev: queue.length > 1,
    canGoNext: queue.length > 1
  });
}

function stopPlaybackState() {
  state.currentTrackId = null;
  state.onlineTracks = [];
  state.isPlaying = false;
  media.pause();
  media.removeAttribute('src');
  media.load();
  persistLibrary();
  renderAll();
  syncPlaybackState();
  saveSessionState(true);
}

function applyTrackSegmentOnLoad(track, initialTime = null) {
  const segment = getTrackSegment(track);
  if (Number.isFinite(initialTime)) {
    media.currentTime = Math.max(0, Math.min(initialTime, media.duration || initialTime));
  } else if (segment.start || segment.start === 0) {
    media.currentTime = Math.min(segment.start, media.duration || segment.start);
  }
  updateProgressVisuals();
}

function waitForTrackLoad(loadId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (handler, value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      media.removeEventListener('loadedmetadata', handleReady);
      media.removeEventListener('canplay', handleReady);
      media.removeEventListener('error', handleError);
      handler(value);
    };

    const handleReady = () => {
      if (loadId !== state.currentTrackLoadId) {
        done(resolve, false);
        return;
      }
      done(resolve, true);
    };

    const handleError = () => done(reject, new Error(t('onlineOpenError')));
    const timeoutId = setTimeout(handleReady, 2200);
    media.addEventListener('loadedmetadata', handleReady);
    media.addEventListener('canplay', handleReady);
    media.addEventListener('error', handleError);
  });
}

async function ensureTrackReady(track) {
  if (!requiresResolution(track)) {
    return true;
  }

  const isExpired = track.resolvedAt && Date.now() - track.resolvedAt > 1000 * 60 * 60 * 2;
  if (track.url && !isExpired) {
    return true;
  }

  showToast(t('onlinePrepare'));
  const resolved = await ipcRenderer.invoke('resolve-online-track', {
    provider: track.provider,
    pageUrl: track.pageUrl,
    url: track.url,
    streamUrl: track.url,
    audioProxyUrl: track.audioProxyUrl,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    thumbnail: track.picture,
    sourceLabel: track.sourceLabel
  });

  if (!resolved?.ok) {
    showToast(resolved?.error || t('onlineOpenError'));
    return false;
  }

  track.url = resolved.streamUrl;
  track.title = resolved.title || track.title;
  track.artist = resolved.artist || track.artist;
  track.duration = Number(resolved.duration) || Number(track.duration) || 0;
  track.picture = resolved.thumbnail || track.picture;
  track.isVideo = Boolean(resolved.isVideo);
  track.resolvedAt = Date.now();

  if (!isEphemeralOnlineTrack(track)) {
    persistLibrary();
  }

  return true;
}

async function playTrack(trackId, options = {}) {
  const track = getTrackById(trackId);
  if (!track) {
    return;
  }

  if (!(await ensureTrackReady(track))) {
    return;
  }

  if (!isEphemeralOnlineTrack(track)) {
    state.onlineTracks = [];
    state.lastLibraryTrackId = track.id;
  }

  state.currentTrackId = track.id;
  if (state.isShuffle && !isEphemeralOnlineTrack(track)) {
    rebuildShuffleOrder(track.id);
  }

  const loadId = Date.now();
  state.currentTrackLoadId = loadId;
  media.pause();
  media.removeAttribute('src');
  media.load();
  media.currentTime = 0;
  media.preload = 'auto';
  media.playbackRate = state.playbackRate;
  media.src = getAudioSource(track);
  media.load();

  try {
    await waitForTrackLoad(loadId);
  } catch (error) {
    state.isPlaying = false;
    renderPlayerState();
    syncPlaybackState();
    showToast(error?.message || t('onlineOpenError'));
    return;
  }

  if (loadId !== state.currentTrackLoadId) {
    return;
  }

  applyTrackSegmentOnLoad(track, Number.isFinite(options.initialTime) ? options.initialTime : null);
  syncWindowLayout();

  if (options.autoplay === false) {
    media.pause();
    state.isPlaying = false;
  } else {
    try {
      await media.play();
      state.isPlaying = true;
    } catch (error) {
      state.isPlaying = false;
    }
  }

  renderPlayerState();
  syncPlaybackState();
  saveSessionState(true);
}

async function togglePlay() {
  if (!state.currentTrackId) {
    const firstTrack = getPlayableTracks()[0];
    if (firstTrack) {
      await playTrack(firstTrack.id);
    }
    return;
  }

  if (state.isPlaying) {
    media.pause();
    state.isPlaying = false;
  } else {
    try {
      await media.play();
      state.isPlaying = true;
    } catch (error) {
      state.isPlaying = false;
    }
  }

  renderPlayerState();
  syncPlaybackState();
  saveSessionState();
}

function getCurrentQueueIndex() {
  return getPlayableTracks().findIndex((track) => track.id === state.currentTrackId);
}

async function fallbackFromOnline(direction = 'next') {
  const libraryQueue = getFilteredTracks();
  if (!libraryQueue.length) {
    return false;
  }
  const baseIndex = Math.max(0, libraryQueue.findIndex((track) => track.id === state.lastLibraryTrackId));
  const offset = direction === 'prev' ? -1 : 1;
  const targetIndex = Math.max(0, Math.min(libraryQueue.length - 1, baseIndex + offset));
  await playTrack(libraryQueue[targetIndex]?.id || libraryQueue[0].id);
  return true;
}

async function playNext(options = {}) {
  const currentTrack = getCurrentTrack();
  if (isEphemeralOnlineTrack(currentTrack) && state.onlineTracks.length <= 1) {
    if (!(await fallbackFromOnline('next'))) {
      media.pause();
      state.isPlaying = false;
      renderPlayerState();
    }
    return;
  }

  const queue = getPlayableTracks();
  if (!queue.length) {
    return;
  }

  const currentIndex = getCurrentQueueIndex();
  if (currentIndex === -1) {
    await playTrack(queue[0].id);
    return;
  }

  if (currentIndex >= queue.length - 1) {
    // Her zaman başa dön (durdurma yok)
    await playTrack(queue[0].id);
    return;
  }

  await playTrack(queue[currentIndex + 1].id);
}

async function playPrev(options = {}) {
  const currentTrack = getCurrentTrack();
  if (isEphemeralOnlineTrack(currentTrack) && state.onlineTracks.length <= 1) {
    if (!(await fallbackFromOnline('prev'))) {
      media.pause();
      state.isPlaying = false;
      renderPlayerState();
    }
    return;
  }

  const queue = getPlayableTracks();
  if (!queue.length) {
    return;
  }

  const currentIndex = getCurrentQueueIndex();
  if (currentIndex <= 0) {
    // Her zaman sona sar (durdurma yok)
    await playTrack(queue[queue.length - 1].id);
    return;
  }

  await playTrack(queue[currentIndex - 1].id);
}

function toggleShuffle() {
  if (state.isShuffle) {
    state.isShuffle = false;
    state.shuffleOrder = [];
  } else {
    state.isShuffle = true;
    // Loop açıkken shuffle açılırsa loop kapansın
    if (state.repeatMode === 'one') {
      state.repeatMode = 'none';
    }
    rebuildShuffleOrder(state.currentTrackId);
  }
  renderAll();
  syncPlaybackState();
  saveSessionState();
}

function toggleRepeat() {
  if (state.repeatMode === 'one') {
    state.repeatMode = 'none';
  } else {
    state.repeatMode = 'one';
    // Shuffle açıkken loop açılırsa shuffle kapansın
    if (state.isShuffle) {
      state.isShuffle = false;
      state.shuffleOrder = [];
    }
  }
  renderAll();
  syncPlaybackState();
  saveSessionState();
}

async function openTrackInVlc(trackId = state.currentTrackId) {
  const track = getTrackById(trackId);
  if (!track) {
    showToast(t('noVlcTrack'));
    return;
  }
  if (!state.vlcAvailable) {
    showToast(t('noVlc'));
    return;
  }
  if (!(await ensureTrackReady(track))) {
    return;
  }

  const payload = {
    target: track.url || track.location,
    startTime: Number.isFinite(track.cutStart) ? track.cutStart : null,
    stopTime: Number.isFinite(track.cutEnd) ? track.cutEnd : null
  };
  const result = await ipcRenderer.invoke('open-in-vlc', payload);
  if (!result?.ok) {
    showToast(result?.error || t('noVlc'));
    return;
  }
  showToast(t('openInVlc'));
}

function seekToPercent(percent) {
  const track = getCurrentTrack();
  const duration = Number(media.duration) || Number(track?.duration) || 0;
  if (!duration) {
    return;
  }

  const segment = getTrackSegment(track);
  const maxEnd = segment.end || segment.end === 0 ? segment.end : duration;
  const minStart = segment.start || segment.start === 0 ? segment.start : 0;
  let target = (percent / 100) * duration;
  target = Math.min(maxEnd, Math.max(minStart, target));
  media.currentTime = target;
  updateProgressVisuals();
}

function seekFromPointer(clientX) {
  const rect = elements.progressBarWrapper.getBoundingClientRect();
  if (!rect.width) {
    return;
  }
  const percent = ((clientX - rect.left) / rect.width) * 100;
  seekToPercent(Math.max(0, Math.min(100, percent)));
}

function seekBy(delta) {
  const duration = Number(media.duration) || Number(getCurrentTrack()?.duration) || 0;
  if (!duration) {
    return;
  }
  const before = media.currentTime;
  seekToPercent(((media.currentTime + delta) / duration) * 100);
  const actualDelta = Math.round(media.currentTime - before);
  if (actualDelta) {
    showSeekFeedback(actualDelta);
  }
}

function changeVolume(delta) {
  const nextVolume = Math.max(0, Math.min(100, Number(elements.volumeSlider.value) + delta));
  elements.volumeSlider.value = String(nextVolume);
  media.volume = nextVolume / 100;
  state.isMuted = nextVolume === 0;
  if (!state.isMuted) {
    state.previousVolume = nextVolume;
  }
  renderPlaybackControls();
}

function toggleMute() {
  if (state.isMuted || Number(elements.volumeSlider.value) === 0) {
    const nextVolume = Math.max(5, state.previousVolume || 60);
    elements.volumeSlider.value = String(nextVolume);
    media.volume = nextVolume / 100;
    state.isMuted = false;
  } else {
    state.previousVolume = Number(elements.volumeSlider.value) || 60;
    elements.volumeSlider.value = '0';
    media.volume = 0;
    state.isMuted = true;
  }
  renderPlaybackControls();
}

function setPlaybackRate(rate) {
  state.playbackRate = parsePlaybackRate(rate, state.playbackRate || 1);
  state.settings.customPlaybackRate = state.playbackRate;
  media.playbackRate = state.playbackRate;
  syncPlaybackRateInputs();
  saveSessionState();
}

function commitPlaybackRateInput(inputElement) {
  const rawValue = String(inputElement.value || '').trim();
  if (!rawValue) {
    syncPlaybackRateInputs();
    return;
  }

  const parsedValue = Number(rawValue.replace(',', '.').replace(/x$/i, ''));
  if (!Number.isFinite(parsedValue)) {
    syncPlaybackRateInputs();
    showToast(t('speedInvalid'));
    return;
  }

  setPlaybackRate(parsedValue);
}

function setCutStart() {
  if (!getCurrentTrack()) {
    return;
  }
  updateCurrentTrack({
    cutStart: media.currentTime,
    cutEnd: null
  });
}

function setCutEnd() {
  const track = getCurrentTrack();
  if (!track) {
    return;
  }
  const start = track.cutStart || track.cutStart === 0 ? track.cutStart : 0;
  updateCurrentTrack({
    cutStart: start,
    cutEnd: Math.max(start, media.currentTime)
  });
}

function clearSegment() {
  if (!getCurrentTrack()) {
    return;
  }
  updateCurrentTrack({
    cutStart: null,
    cutEnd: null
  });
}

function handleSegmentDuringPlayback() {
  const track = getCurrentTrack();
  if (!track) {
    return;
  }
  const duration = Number(media.duration) || Number(track.duration) || 0;
  const segment = getTrackSegment(track);
  const hasStart = segment.start || segment.start === 0;
  const effectiveEnd = segment.end || segment.end === 0 ? segment.end : duration;

  if (hasStart && media.currentTime < segment.start - 0.2) {
    media.currentTime = segment.start;
  }
  if (hasStart && duration && effectiveEnd && media.currentTime >= effectiveEnd) {
    media.currentTime = segment.start;
    if (!media.paused) {
      media.play().catch(() => {});
    }
  }
}

function toggleFavorite(trackId = state.currentTrackId) {
  if (!trackId) {
    return;
  }

  const track = getTrackById(trackId);
  if (isEphemeralOnlineTrack(track)) {
    showToast(t('onlineUseDownload'));
    return;
  }

  const index = state.library.favorites.indexOf(trackId);
  if (index === -1) {
    state.library.favorites.push(trackId);
  } else {
    state.library.favorites.splice(index, 1);
  }

  persistLibrary();
  renderAll();
}

function addTrackToPlaylist(trackId, playlistId, options = {}) {
  const playlist = getCustomPlaylists().find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }

  if (options.exclusive) {
    state.library.playlists = state.library.playlists.map((item) => ({
      ...item,
      itemIds: (item.itemIds || []).filter((itemId) => itemId !== trackId)
    }));
  }

  const targetPlaylist = getCustomPlaylists().find((item) => item.id === playlistId);
  if (!targetPlaylist.itemIds.includes(trackId)) {
    targetPlaylist.itemIds.push(trackId);
  }
  targetPlaylist.updatedAt = Date.now();
  persistLibrary();
  renderAll();
}

function removeTrackFromPlaylist(trackId, playlistId) {
  const playlist = getCustomPlaylists().find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }
  playlist.itemIds = (playlist.itemIds || []).filter((itemId) => itemId !== trackId);
  playlist.updatedAt = Date.now();
  persistLibrary();
  renderAll();
}

function removeTracksBulk(trackIds) {
  const removedIds = new Set(trackIds);
  state.library.tracks = state.library.tracks.filter((track) => !removedIds.has(track.id));
  state.library.favorites = state.library.favorites.filter((trackId) => !removedIds.has(trackId));
  state.library.playlists = state.library.playlists.map((playlist) => ({
    ...playlist,
    itemIds: (playlist.itemIds || []).filter((trackId) => !removedIds.has(trackId))
  }));
  state.library.globalOrder = state.library.globalOrder.filter((trackId) => !removedIds.has(trackId));
  cleanupSelection();

  if (removedIds.has(state.currentTrackId)) {
    stopPlaybackState();
    return;
  }

  persistLibrary();
  renderAll();
}

function removeTrack(trackId) {
  removeTracksBulk([trackId]);
}

function clearSelection() {
  state.selectedTrackIds = [];
  renderLibrary();
}

function toggleTrackSelection(trackId) {
  const selection = new Set(state.selectedTrackIds);
  if (selection.has(trackId)) {
    selection.delete(trackId);
  } else {
    selection.add(trackId);
  }
  state.selectedTrackIds = [...selection];
  renderLibrary();
}

function selectVisibleTracks() {
  state.selectedTrackIds = getFilteredTracks().map((track) => track.id);
  renderLibrary();
}

function bulkAddSelectedToPlaylist() {
  const playlistId = elements.bulkPlaylistSelect.value;
  if (!playlistId) {
    return;
  }
  const playlist = getCustomPlaylists().find((item) => item.id === playlistId);
  if (!playlist) {
    return;
  }
  const nextIds = new Set(playlist.itemIds || []);
  state.selectedTrackIds.forEach((trackId) => nextIds.add(trackId));
  playlist.itemIds = [...nextIds];
  playlist.updatedAt = Date.now();
  persistLibrary();
  renderAll();
}

function removeSelectedTracks() {
  if (!state.selectedTrackIds.length) {
    return;
  }
  removeTracksBulk(state.selectedTrackIds);
}

function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  modal.classList.add('hidden');
}

async function addSourceFromSelection(sourceType) {
  if (sourceType === 'files') {
    const filePaths = await ipcRenderer.invoke('select-source-files');
    if (!filePaths.length) {
      return;
    }
    state.library.sources.push({
      id: generateId('source'),
      type: 'files',
      label: state.locale === 'tr' ? `${filePaths.length} dosya` : `${filePaths.length} files`,
      values: filePaths,
      createdAt: Date.now()
    });
  } else if (sourceType === 'folder') {
    const folderPath = await ipcRenderer.invoke('select-source-folder');
    if (!folderPath) {
      return;
    }
    state.library.sources.push({
      id: generateId('source'),
      type: 'folder',
      label: path.basename(folderPath) || folderPath,
      value: folderPath,
      createdAt: Date.now()
    });
  }

  persistLibrary();
  await refreshLibraryFromSources();
  closeModal(elements.sourceModal);
}

function renderSourceForm() {
  const templates = {
    files: `<div class="field-stack"><p class="helper-card">${escapeHtml(state.locale === 'tr' ? 'Bir veya birden fazla medya dosyası seç.' : 'Choose one or more media files.')}</p><button id="submit-source-btn" class="primary-btn">${escapeHtml(t('files'))}</button></div>`,
    folder: `<div class="field-stack"><p class="helper-card">${escapeHtml(state.locale === 'tr' ? 'Tüm desteklenen dosyaları taramak için klasör seç.' : 'Choose a folder to scan supported media files.')}</p><button id="submit-source-btn" class="primary-btn">${escapeHtml(t('folder'))}</button></div>`,
    url: `<div class="field-stack"><label class="field-label" for="source-url-name">${escapeHtml(state.locale === 'tr' ? 'Görünen ad' : 'Display name')}</label><input id="source-url-name" class="text-input" type="text" value="${escapeHtml(state.modalWebCustomName)}" placeholder="${escapeHtml(state.locale === 'tr' ? 'Örn. Canlı yayın' : 'Example: Live stream')}"></div><div class="field-stack"><label class="field-label" for="source-url-input">URL</label><input id="source-url-input" class="text-input" type="url" placeholder="https://..."></div><button id="submit-source-btn" class="primary-btn">${escapeHtml(t('addSource'))}</button>`,
    location: `<div class="field-stack"><label class="field-label" for="source-location-input">${escapeHtml(t('location'))}</label><input id="source-location-input" class="text-input" type="text" placeholder="${escapeHtml(state.locale === 'tr' ? 'C:\\\\Users\\\\...\\\\Müzik' : 'C:\\\\Users\\\\...\\\\Music')}"></div><button id="submit-source-btn" class="primary-btn">${escapeHtml(t('addSource'))}</button>`,
    web: `<div class="field-stack"><label class="field-label" for="source-web-name">${escapeHtml(t('webAddName'))}</label><input id="source-web-name" class="text-input" type="text" value="${escapeHtml(state.modalWebCustomName)}" placeholder="${escapeHtml(state.locale === 'tr' ? 'İstersen farklı bir ad ver' : 'Optional custom name')}"></div><div class="field-stack"><label class="field-label" for="source-web-input">${escapeHtml(t('webSearch'))}</label><input id="source-web-input" class="text-input" type="text" value="${escapeHtml(state.lastWebQuery)}" placeholder="${escapeHtml(t('searchWebPlaceholder'))}"></div><div class="modal-actions"><button id="submit-source-btn" class="primary-btn">${escapeHtml(t('search'))}</button></div><div id="source-web-results" class="online-results"></div>`
  };

  elements.sourceFormContent.innerHTML = templates[state.sourceModalType];
  const submitBtn = document.getElementById('submit-source-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitSourceForm);
  }

  const customNameInput = document.getElementById('source-url-name') || document.getElementById('source-web-name');
  if (customNameInput) {
    customNameInput.addEventListener('input', () => {
      state.modalWebCustomName = customNameInput.value;
    });
  }

  const webInput = document.getElementById('source-web-input');
  if (webInput) {
    webInput.addEventListener('input', () => {
      state.lastWebQuery = webInput.value;
    });
    webInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchOnlineMedia({ fromModal: true });
      }
    });
  }

  renderModalWebResults();
}

async function submitSourceForm() {
  const sourceType = state.sourceModalType;

  if (sourceType === 'files' || sourceType === 'folder') {
    await addSourceFromSelection(sourceType);
    return;
  }

  if (sourceType === 'web') {
    await searchOnlineMedia({ fromModal: true });
    return;
  }

  if (sourceType === 'url') {
    const name = document.getElementById('source-url-name')?.value?.trim();
    const url = document.getElementById('source-url-input')?.value?.trim();
    if (!name || !url) {
      return;
    }
    state.library.sources.push(createSourceFromUrl(name, url));
    persistLibrary();
    await refreshLibraryFromSources();
    closeModal(elements.sourceModal);
    return;
  }

  const input = document.getElementById('source-location-input');
  const validation = await ipcRenderer.invoke('validate-location', input?.value?.trim());
  if (!validation?.ok) {
    input?.setCustomValidity(validation?.reason || '');
    input?.reportValidity();
    return;
  }
  state.library.sources.push({
    id: generateId('source'),
    type: 'location',
    label: path.basename(validation.path) || validation.path,
    value: validation.path,
    createdAt: Date.now()
  });
  persistLibrary();
  await refreshLibraryFromSources();
  closeModal(elements.sourceModal);
}

function openSourceModal() {
  state.sourceModalType = 'files';
  state.modalWebCustomName = '';
  elements.sourceChoices.forEach((button) => {
    button.classList.toggle('active', button.dataset.sourceType === state.sourceModalType);
  });
  renderSourceForm();
  openModal(elements.sourceModal);
}

function openPlaylistModal(mode, playlistId = null) {
  state.playlistModalMode = mode;
  state.editingPlaylistId = playlistId;
  elements.playlistModalTitle.textContent = mode === 'rename' ? t('playlistRename') : t('playlistCreate');
  elements.playlistNameInput.value = mode === 'rename' ? getCustomPlaylists().find((item) => item.id === playlistId)?.name || '' : '';
  openModal(elements.playlistModal);
}

function savePlaylistFromModal() {
  const name = elements.playlistNameInput.value.trim();
  if (!name) {
    return;
  }
  if (state.playlistModalMode === 'rename' && state.editingPlaylistId) {
    const playlist = getCustomPlaylists().find((item) => item.id === state.editingPlaylistId);
    if (playlist) {
      playlist.name = name;
      playlist.updatedAt = Date.now();
    }
  } else {
    state.library.playlists.push({ id: generateId('playlist'), name, itemIds: [], createdAt: Date.now(), updatedAt: Date.now() });
  }
  persistLibrary();
  renderAll();
  closeModal(elements.playlistModal);
}

function openTrackModal(trackId) {
  const track = getTrackById(trackId);
  if (!track) {
    return;
  }
  state.editingTrackId = trackId;
  elements.trackModalTitle.textContent = getTrackDisplayName(track);
  elements.trackNameInput.value = getTrackDisplayName(track);
  elements.trackStartInput.value = track.cutStart || track.cutStart === 0 ? formatTime(track.cutStart) : '';
  elements.trackEndInput.value = track.cutEnd || track.cutEnd === 0 ? formatTime(track.cutEnd) : '';
  const selectedPlaylistId = getCustomPlaylists().find((playlist) => (playlist.itemIds || []).includes(track.id))?.id || '';
  elements.trackPlaylistSelect.innerHTML = [`<option value="">${escapeHtml(t('playlistNone'))}</option>`]
    .concat(getCustomPlaylists().map((playlist) => `<option value="${playlist.id}" ${playlist.id === selectedPlaylistId ? 'selected' : ''}>${escapeHtml(playlist.name)}</option>`))
    .join('');
  openModal(elements.trackModal);
}

function saveTrackFromModal() {
  const track = getTrackById(state.editingTrackId);
  if (!track) {
    return;
  }
  const name = elements.trackNameInput.value.trim();
  const cutStart = parseTimeInput(elements.trackStartInput.value);
  let cutEnd = parseTimeInput(elements.trackEndInput.value);
  if (Number.isFinite(cutStart) && Number.isFinite(cutEnd) && cutEnd < cutStart) {
    cutEnd = cutStart;
  }
  track.customTitle = name && name !== track.title ? name : null;
  track.cutStart = cutStart;
  track.cutEnd = cutEnd;

  const selectedPlaylistId = elements.trackPlaylistSelect.value;
  state.library.playlists = state.library.playlists.map((playlist) => ({
    ...playlist,
    itemIds: (playlist.itemIds || []).filter((trackId) => trackId !== track.id)
  }));
  if (selectedPlaylistId) {
    const playlist = getCustomPlaylists().find((item) => item.id === selectedPlaylistId);
    if (playlist && !playlist.itemIds.includes(track.id)) {
      playlist.itemIds.push(track.id);
      playlist.updatedAt = Date.now();
    }
  }

  persistLibrary();
  renderAll();
  closeModal(elements.trackModal);
}

function renameSource(sourceId) {
  const source = state.library.sources.find((item) => item.id === sourceId);
  if (!source) {
    return;
  }
  const nextName = window.prompt(t('sourceRenamePrompt'), source.label || '');
  if (nextName === null) {
    return;
  }
  const trimmed = nextName.trim();
  if (!trimmed || trimmed === source.label) {
    return;
  }
  source.label = trimmed;
  source.updatedAt = Date.now();
  state.library.tracks = state.library.tracks.map((track) => (
    track.sourceId === sourceId
      ? { ...track, sourceLabel: trimmed, title: track.sourceType === 'url' || track.sourceType === 'web' ? trimmed : track.title }
      : track
  ));
  persistLibrary();
  renderAll();
  showToast(t('sourceRenamed'));
}

function removeSource(sourceId) {
  const removedIds = new Set(state.library.tracks.filter((track) => track.sourceId === sourceId).map((track) => track.id));
  state.library.sources = state.library.sources.filter((source) => source.id !== sourceId);
  state.library.tracks = state.library.tracks.filter((track) => !removedIds.has(track.id));
  state.library.favorites = state.library.favorites.filter((trackId) => !removedIds.has(trackId));
  state.library.playlists = state.library.playlists.map((playlist) => ({
    ...playlist,
    itemIds: (playlist.itemIds || []).filter((trackId) => !removedIds.has(trackId))
  }));
  state.library.globalOrder = state.library.globalOrder.filter((trackId) => !removedIds.has(trackId));
  cleanupSelection();

  if (removedIds.has(state.currentTrackId)) {
    stopPlaybackState();
    return;
  }

  persistLibrary();
  renderAll();
}

function deleteCurrentPlaylist() {
  const currentList = getCurrentList();
  if (currentList.system) {
    return;
  }
  state.library.playlists = getCustomPlaylists().filter((playlist) => playlist.id !== currentList.id);
  state.library.currentListId = 'all';
  persistLibrary();
  renderAll();
}

async function ensureDownloadedFolderSource(filePath) {
  const folderPath = path.dirname(filePath);
  let source = state.library.sources.find((item) => item.type === 'location' && item.value === folderPath);
  if (!source) {
    source = {
      id: generateId('source'),
      type: 'location',
      label: path.basename(folderPath) || folderPath,
      value: folderPath,
      createdAt: Date.now()
    };
    state.library.sources.push(source);
  }
  persistLibrary();
  await refreshLibraryFromSources();
}

async function searchOnlineMedia(options = {}) {
  const rawQuery = options.fromModal ? document.getElementById('source-web-input')?.value : elements.onlineSearchInput.value;
  const query = String(rawQuery || '').trim();
  if (!query) {
    return;
  }

  state.onlineSearchLoading = true;
  state.onlineSearchError = '';
  state.lastWebQuery = query;
  elements.onlineSearchInput.value = query;
  renderOnlineResults();
  if (options.fromModal) {
    renderModalWebResults();
  }

  const response = await ipcRenderer.invoke('search-online-tracks', query);
  state.onlineSearchLoading = false;

  if (!response?.ok) {
    state.onlineResults = [];
    state.onlineSearchError = response?.error || t('searchFailed');
    renderOnlineResults();
    if (options.fromModal) {
      renderModalWebResults();
    }
    return;
  }

  state.onlineSearchError = '';
  state.onlineResults = response.results || [];
  renderOnlineResults();
  if (options.fromModal) {
    renderModalWebResults();
  }
}

async function playOnlineResult(resultId) {
  const result = state.onlineResults.find((item) => item.id === resultId);
  if (!result) {
    return;
  }
  state.onlineTracks = state.onlineResults.map((item) => createOnlineTrackFromResult(item));
  showTab('home');
  await playTrack(result.id);
}

async function downloadOnlineResult(resultId) {
  const result = state.onlineResults.find((item) => item.id === resultId);
  if (!result) {
    return;
  }
  const targetUrl = result.pageUrl || result.streamUrl;
  if (!targetUrl) {
    showToast(t('noDownloadUrl'));
    return;
  }
  showToast(t('downloadStarted'));
  const downloaded = await ipcRenderer.invoke('download-youtube', targetUrl, 'audio');
  if (downloaded?.error) {
    showToast(downloaded.error);
    return;
  }
  if (downloaded?.file) {
    await ensureDownloadedFolderSource(downloaded.file);
    showToast(t('downloadDone'));
  }
}

async function addWebSourceResult(resultId, options = {}) {
  const result = state.onlineResults.find((item) => item.id === resultId);
  if (!result) {
    return;
  }

  const customName =
    typeof options.customName === 'string' && options.customName.trim()
      ? options.customName.trim()
      : state.modalWebCustomName.trim();

  state.library.sources.push({
    id: generateId('source'),
    type: 'web',
    label: customName || result.title,
    provider: result.provider || 'youtube',
    pageUrl: result.pageUrl || result.url || '',
    audioProxyUrl: result.audioProxyUrl || '',
    artist: result.artist || t('trackTypeWeb'),
    duration: Number(result.duration) || 0,
    thumbnail: result.thumbnail || null,
    streamUrl: result.streamUrl || '',
    createdAt: Date.now()
  });

  persistLibrary();
  await refreshLibraryFromSources();
  if (options.closeModal) {
    closeModal(elements.sourceModal);
  }
}

function closeCompactMenu() {
  if (!state.isCompactMenuOpen) {
    return;
  }
  state.isCompactMenuOpen = false;
  updateCompactMenuState();
}

function toggleCompactMenu() {
  if (state.settings.layoutMode !== 'compact') {
    return;
  }
  state.isCompactMenuOpen = !state.isCompactMenuOpen;
  updateCompactMenuState();
}

function showTab(tabId) {
  if (tabId === 'library' && state.settings.layoutMode === 'compact') {
    state.settings.layoutMode = 'normal';
    applyLayoutMode();
    queueSettingsSave();
  }
  state.currentTab = tabId;
  document.getElementById('tab-home').classList.toggle('active', tabId === 'home');
  document.getElementById('tab-library').classList.toggle('active', tabId === 'library');
  elements.titleTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabId);
  });
  syncWindowLayout();
}

function handleSourceListClick(event) {
  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) {
    return;
  }
  const { action, sourceId } = actionNode.dataset;
  if (action === 'rename-source') renameSource(sourceId);
  else if (action === 'remove-source') removeSource(sourceId);
}

function handlePlaylistListClick(event) {
  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) {
    return;
  }
  const { action, playlistId } = actionNode.dataset;
  if (action === 'select-playlist') {
    state.library.currentListId = playlistId;
    if (state.isShuffle) rebuildShuffleOrder(state.currentTrackId);
    clearSelection();
    persistLibrary();
    saveSessionState();
    renderAll();
    syncPlaybackState();
  }
}

function handleLibraryClick(event) {
  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) {
    return;
  }
  const { action, trackId, playlistId } = actionNode.dataset;
  if (action === 'toggle-track-selection') toggleTrackSelection(trackId);
  else if (action === 'play-track') playTrack(trackId);
  else if (action === 'toggle-favorite') toggleFavorite(trackId);
  else if (action === 'edit-track') openTrackModal(trackId);
  else if (action === 'open-in-vlc-track') openTrackInVlc(trackId);
  else if (action === 'remove-track') removeTrack(trackId);
  else if (action === 'remove-from-playlist') removeTrackFromPlaylist(trackId, playlistId);
}

async function handleOnlineResultsClick(event) {
  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) {
    return;
  }
  const { action, onlineId } = actionNode.dataset;
  if (action === 'play-online-result') await playOnlineResult(onlineId);
  else if (action === 'download-online-result') await downloadOnlineResult(onlineId);
  else if (action === 'add-web-source-inline') await addWebSourceResult(onlineId, { closeModal: false });
  else if (action === 'open-online-page') {
    const result = state.onlineResults.find((item) => item.id === onlineId);
    if (result?.pageUrl) shell.openExternal(result.pageUrl);
  }
}

function setupEventListeners() {
  elements.titleTabs.forEach((button) => button.addEventListener('click', () => showTab(button.dataset.tab)));
  elements.playerListSelect.addEventListener('change', () => {
    state.library.currentListId = elements.playerListSelect.value;
    if (state.isShuffle) rebuildShuffleOrder(state.currentTrackId);
    clearSelection();
    persistLibrary();
    saveSessionState();
    renderAll();
    syncPlaybackState();
  });
  elements.playBtn.addEventListener('click', togglePlay);
  elements.prevBtn.addEventListener('click', () => playPrev({ manual: true }));
  elements.nextBtn.addEventListener('click', () => playNext({ manual: true }));
  elements.shuffleBtn.addEventListener('click', toggleShuffle);
  elements.repeatBtn.addEventListener('click', toggleRepeat);
  elements.compactShuffleBtn.addEventListener('click', toggleShuffle);
  elements.compactRepeatBtn.addEventListener('click', toggleRepeat);
  elements.favoriteBtn.addEventListener('click', () => toggleFavorite());
  elements.cutStartBtn.addEventListener('click', setCutStart);
  elements.cutEndBtn.addEventListener('click', setCutEnd);
  elements.clearLoopBtn.addEventListener('click', clearSegment);
  elements.openVlcBtn.addEventListener('click', () => openTrackInVlc());
  [elements.speedSelect, elements.compactSpeedSelect].forEach((input) => {
    input.addEventListener('change', () => commitPlaybackRateInput(input));
    input.addEventListener('blur', () => commitPlaybackRateInput(input));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitPlaybackRateInput(input);
      }
    });
  });
  elements.compactMoreBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleCompactMenu();
  });
  elements.volumeIcon.addEventListener('click', toggleMute);
  elements.volumeSlider.addEventListener('input', () => {
    media.volume = Number(elements.volumeSlider.value) / 100;
    state.isMuted = Number(elements.volumeSlider.value) === 0;
    if (!state.isMuted) state.previousVolume = Number(elements.volumeSlider.value);
    renderPlaybackControls();
  });
  elements.progressSlider.addEventListener('input', () => seekToPercent(Number(elements.progressSlider.value)));
  elements.progressBarWrapper.addEventListener('pointerdown', (event) => {
    state.progressDragPointerId = event.pointerId;
    elements.progressBarWrapper.setPointerCapture(event.pointerId);
    seekFromPointer(event.clientX);
  });
  elements.progressBarWrapper.addEventListener('pointermove', (event) => {
    if (state.progressDragPointerId === event.pointerId) seekFromPointer(event.clientX);
  });
  elements.progressBarWrapper.addEventListener('pointerup', (event) => {
    if (state.progressDragPointerId === event.pointerId) state.progressDragPointerId = null;
  });
  elements.progressBarWrapper.addEventListener('lostpointercapture', () => {
    state.progressDragPointerId = null;
  });
  elements.compactModeBtn.addEventListener('click', () => {
    state.settings.layoutMode = 'compact';
    state.isCompactMenuOpen = false;
    applyLayoutMode();
    persistSettings();
    showTab('home');
  });
  elements.normalModeBtn.addEventListener('click', () => {
    state.settings.layoutMode = 'normal';
    state.isCompactMenuOpen = false;
    applyLayoutMode();
    persistSettings();
  });
  elements.openAddSourceBtn.addEventListener('click', openSourceModal);
  elements.onlineSearchBtn.addEventListener('click', () => searchOnlineMedia());
  elements.onlineSearchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchOnlineMedia();
    }
  });
  elements.closeSourceModal.addEventListener('click', () => closeModal(elements.sourceModal));
  elements.sourceChoices.forEach((button) => {
    button.addEventListener('click', () => {
      state.sourceModalType = button.dataset.sourceType;
      elements.sourceChoices.forEach((choice) => choice.classList.toggle('active', choice === button));
      renderSourceForm();
    });
  });
  elements.createPlaylistBtn.addEventListener('click', () => openPlaylistModal('create'));
  elements.renamePlaylistBtn.addEventListener('click', () => !getCurrentList().system && openPlaylistModal('rename', getCurrentList().id));
  elements.deletePlaylistBtn.addEventListener('click', deleteCurrentPlaylist);
  elements.closePlaylistModal.addEventListener('click', () => closeModal(elements.playlistModal));
  elements.savePlaylistBtn.addEventListener('click', savePlaylistFromModal);
  elements.closeTrackModal.addEventListener('click', () => closeModal(elements.trackModal));
  elements.saveTrackBtn.addEventListener('click', saveTrackFromModal);
  elements.removeTrackBtn.addEventListener('click', () => {
    if (state.editingTrackId) {
      removeTrack(state.editingTrackId);
      closeModal(elements.trackModal);
    }
  });
  elements.searchInput.addEventListener('input', () => {
    state.searchQuery = elements.searchInput.value;
    if (state.librarySearchTimer) clearTimeout(state.librarySearchTimer);
    state.librarySearchTimer = setTimeout(() => {
      renderLibrary();
      syncPlaybackState();
    }, 120);
  });
  elements.sortSelect.addEventListener('change', () => {
    state.library.sortBy = elements.sortSelect.value;
    persistLibrary();
    renderLibrary();
  });
  elements.sortAscBtn.addEventListener('click', () => {
    state.library.sortDirection = 'asc';
    persistLibrary();
    renderLibrary();
    updateSortButtons();
  });
  elements.sortDescBtn.addEventListener('click', () => {
    state.library.sortDirection = 'desc';
    persistLibrary();
    renderLibrary();
    updateSortButtons();
  });
  elements.viewListBtn.addEventListener('click', () => {
    state.library.viewMode = 'list';
    persistLibrary();
    renderLibrary();
    updateViewButtons();
  });
  elements.viewGridBtn.addEventListener('click', () => {
    state.library.viewMode = 'grid';
    persistLibrary();
    renderLibrary();
    updateViewButtons();
  });
  elements.selectVisibleBtn.addEventListener('click', selectVisibleTracks);
  elements.bulkAddPlaylistBtn.addEventListener('click', bulkAddSelectedToPlaylist);
  elements.bulkRemoveBtn.addEventListener('click', removeSelectedTracks);
  elements.clearSelectionBtn.addEventListener('click', clearSelection);
  elements.sourceList.addEventListener('click', handleSourceListClick);
  elements.playlistList.addEventListener('click', handlePlaylistListClick);
  elements.libraryList.addEventListener('click', handleLibraryClick);
  elements.onlineResults.addEventListener('click', handleOnlineResultsClick);
  elements.sourceModal.addEventListener('click', async (event) => {
    const actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    const { action, onlineId } = actionNode.dataset;
    if (action === 'play-online-result') {
      closeModal(elements.sourceModal);
      await playOnlineResult(onlineId);
    }
    else if (action === 'add-web-source') await addWebSourceResult(onlineId, { closeModal: true });
  });
  elements.settingsBtn.addEventListener('click', () => openModal(elements.settingsPanel));
  elements.closeSettings.addEventListener('click', () => closeModal(elements.settingsPanel));
  elements.themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.settings.theme = button.dataset.theme;
      applyTheme(state.settings.theme);
      persistSettings();
    });
  });
  elements.languageButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.settings.language = button.dataset.language;
      state.locale = detectLocale(null, state.settings.language);
      queueSettingsSave();
      renderAll();
      if (!elements.sourceModal.classList.contains('hidden')) renderSourceForm();
    });
  });
  elements.startupToggle.addEventListener('change', () => ipcRenderer.invoke('set-startup', elements.startupToggle.checked));
  elements.itemsPerPage.addEventListener('change', () => {
    state.settings.itemsPerPage = Math.max(6, Math.min(200, Number(elements.itemsPerPage.value) || 30));
    elements.itemsPerPage.value = String(state.settings.itemsPerPage);
    persistSettings();
  });
  elements.audioProfileSelect.addEventListener('change', () => {
    if (elements.audioProfileSelect.value === 'custom') {
      syncAudioProfileSelect();
      return;
    }
    applyAudioProfile(elements.audioProfileSelect.value);
  });
  elements.saveDefaultAudioBtn.addEventListener('click', saveCurrentAudioProfileAsDefault);
  elements.restartAudioBtn.addEventListener('click', restartAudioDriver);
  elements.minimizeBtn.addEventListener('click', () => ipcRenderer.invoke('window-minimize'));
  elements.closeBtn.addEventListener('click', () => ipcRenderer.invoke('window-close'));
  [elements.effectClarity, elements.effectAmbience, elements.effectSurround, elements.effectDynamic, elements.effectBass].forEach((slider) => {
    slider.addEventListener('input', updateAudioEffectsFromInputs);
  });

  media.addEventListener('timeupdate', () => {
    handleSegmentDuringPlayback();
    updateProgressVisuals();
    saveSessionState();
  });
  media.addEventListener('ended', () => {
    const track = getCurrentTrack();
    // Segment markers (A/B) — loop within track
    const segment = getTrackSegment(track);
    if (segment.start || segment.start === 0) {
      media.currentTime = segment.start;
      media.play().catch(() => {});
      return;
    }
    // Repeat One: restart the same track
    if (state.repeatMode === 'one' && track) {
      media.currentTime = 0;
      media.play().catch(() => {});
      return;
    }
    // Normal: play next (sıra sonunda başa döner)
    playNext();
  });
  media.addEventListener('play', () => {
    ensureAudioGraph();
    audioContext?.resume?.();
    state.isPlaying = true;
    renderPlayerState();
    syncPlaybackState();
    saveSessionState();
  });
  media.addEventListener('pause', () => {
    state.isPlaying = false;
    renderPlayerState();
    syncPlaybackState();
    saveSessionState();
  });
  media.addEventListener('error', () => {
    showToast(t('onlineOpenError'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.closest('input, select, textarea')) return;
    if (event.code === 'Space') {
      event.preventDefault();
      togglePlay();
    } else if (event.shiftKey && event.code === 'ArrowRight') playNext({ manual: true });
    else if (event.shiftKey && event.code === 'ArrowLeft') playPrev({ manual: true });
    else if (event.code === 'ArrowRight' || event.code === 'KeyL') seekBy(5);
    else if (event.code === 'ArrowLeft' || event.code === 'KeyJ') seekBy(-5);
    else if (event.code === 'ArrowUp') changeVolume(5);
    else if (event.code === 'ArrowDown') changeVolume(-5);
    else if (event.code === 'KeyA') setCutStart();
    else if (event.code === 'KeyB') setCutEnd();
    else if (event.code === 'KeyC') clearSegment();
    else if (event.code === 'KeyV') openTrackInVlc();
    else if (event.code === 'Escape') closeCompactMenu();
  });

  document.addEventListener('click', (event) => {
    if (state.settings.layoutMode !== 'compact' || !state.isCompactMenuOpen) return;
    if (event.target.closest('#transport-meta') || event.target.closest('#compact-more-btn')) return;
    closeCompactMenu();
  });

  document.querySelectorAll('.overlay-panel').forEach((panel) => {
    panel.addEventListener('click', (event) => {
      if (event.target === panel) closeModal(panel);
    });
  });

  ipcRenderer.on('transport-action', (event, action) => {
    if (action === 'toggle-play') togglePlay();
    else if (action === 'next') playNext({ manual: true });
    else if (action === 'prev') playPrev({ manual: true });
  });

  window.addEventListener('beforeunload', () => {
    flushLibrarySave();
    saveSessionState(true);
  });
}

async function init() {
  const systemLocale = await ipcRenderer.invoke('get-locale').catch(() => navigator.language || 'tr');
  state.settings = {
    ...state.settings,
    ...(await ipcRenderer.invoke('get-settings'))
  };
  state.library = {
    ...state.library,
    ...(await ipcRenderer.invoke('get-library-state'))
  };
  state.locale = detectLocale(systemLocale, state.settings.language);
  state.settings.layoutMode = state.settings.layoutMode || 'normal';
  state.settings.audioProfiles = mergeAudioProfiles(state.settings.audioProfiles);
  state.settings.audioEffects = normalizeAudioEffects(state.settings.audioEffects);
  state.settings.selectedAudioProfile = getAudioProfile(state.settings.selectedAudioProfile)
    ? state.settings.selectedAudioProfile
    : getMatchingAudioProfileId(state.settings.audioEffects);
  state.playbackRate = parsePlaybackRate(
    state.settings.lastSession?.playbackRate || state.settings.customPlaybackRate || 1,
    1
  );
  state.settings.customPlaybackRate = state.playbackRate;
  state.vlcAvailable = Boolean((await ipcRenderer.invoke('get-vlc-status'))?.available);
  elements.startupToggle.checked = await ipcRenderer.invoke('get-startup-status');
  elements.itemsPerPage.value = String(state.settings.itemsPerPage || 30);
  elements.sortSelect.value = state.library.sortBy || 'custom';
  syncPlaybackRateInputs();
  syncAudioEffectInputs();
  media.volume = 1;
  media.playbackRate = state.playbackRate;

  ensureLibraryConsistency();
  applyTheme(state.settings.theme || 'dark');
  applyLayoutMode();
  setupEventListeners();
  renderAll();
  await refreshLibraryFromSources({ silent: true });
  await restoreLastSession();
  renderAll();
  syncPlaybackState();
}

init();
