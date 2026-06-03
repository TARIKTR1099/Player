import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Play, Loader, X, Music, CheckCircle, Clock, CheckSquare, Square, ListMusic, Sliders } from 'lucide-react';
import { useStore } from '../store';

const AUDIO_QUALITIES = [
  { value: 'best', label: 'En İyi Kalite' },
  { value: '320k', label: '320 kbps (Yüksek)' },
  { value: '192k', label: '192 kbps (Orta)' },
  { value: '128k', label: '128 kbps (Düşük)' },
];

const VIDEO_QUALITIES = [
  { value: 'best', label: 'En İyi (4K/1080p)' },
  { value: '1080', label: '1080p' },
  { value: '720', label: '720p' },
  { value: '480', label: '480p' },
];

const Downloader = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [downloads, setDownloads] = useState({});
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isChecking, setIsChecking] = useState({});
  const [playingId, setPlayingId] = useState(null);
  const [audioQuality, setAudioQuality] = useState('best');
  const [videoQuality, setVideoQuality] = useState('best');
  const [downloadFormat, setDownloadFormat] = useState('audio');
  const { playTrack, refreshLibrary } = useStore();

  useEffect(() => {
    let ipcRenderer;
    try {
      const electron = window.require('electron');
      ipcRenderer = electron.ipcRenderer;
    } catch (e) {
      console.warn('Electron API not available:', e.message);
      return;
    }
    
    const handleDownloadProgress = (e, data) => {
      setDownloads(prev => ({
        ...prev,
        [data.downloadId]: data
      }));
      
      if (data.status === 'completed') {
        setTimeout(() => {
          setDownloads(prev => {
            const next = { ...prev };
            delete next[data.downloadId];
            return next;
          });
          refreshLibrary();
        }, 2000);
      } else if (data.status === 'error') {
        setDownloads(prev => ({
          ...prev,
          [data.downloadId]: { ...prev[data.downloadId], status: 'error', error: data.error || 'İndirme başarısız oldu' }
        }));
      }
    };
    
    ipcRenderer.on('download-progress', handleDownloadProgress);
    
    return () => {
      ipcRenderer.removeListener('download-progress', handleDownloadProgress);
    };
  }, [refreshLibrary]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setSelectedIds(new Set());
    try {
      const { ipcRenderer } = window.require('electron');
      const response = await ipcRenderer.invoke('search-online-tracks', query.trim());
      setResults(response.results || []);
      setIsPlaylist(response.isPlaylist || false);
      
      if (response.results) {
        const checkStatus = {};
        response.results.forEach(r => { checkStatus[r.id] = true; });
        setIsChecking(checkStatus);
        
        for (const track of response.results) {
          try {
            const check = await ipcRenderer.invoke('check-track-downloaded', track);
            setResults(prev => prev.map(t => t.id === track.id ? { ...t, _downloaded: check.downloaded, _localTrack: check.track } : t));
          } catch(e) {}
          setIsChecking(prev => { const n = { ...prev }; delete n[track.id]; return n; });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [query]);

  const handleInstantPlay = useCallback(async (track) => {
    if (track._downloaded && track._localTrack) {
      playTrack(track._localTrack);
      return;
    }
    
    setPlayingId(track.id);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('download-to-temp', { ...track, _quality: audioQuality });
      if (result.ok && result.track) {
        playTrack(result.track);
      } else {
        console.error('Temp download failed:', result?.error);
      }
    } catch (e) {
      console.error('Instant play failed:', e);
    }
    setPlayingId(null);
  }, [playTrack, audioQuality]);

  const handleDownload = useCallback(async (track) => {
    let ipcRenderer;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch (e) {
      console.warn('Electron API not available:', e.message);
      return;
    }
    const downloadId = `download-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    
    setDownloads(prev => ({
      ...prev,
      [downloadId]: { url: track.pageUrl, progress: 0, status: 'starting', title: track.title }
    }));
    
    try {
      await ipcRenderer.invoke('download-youtube', track.pageUrl, downloadFormat, downloadId, track.thumbnail, {
        quality: downloadFormat === 'audio' ? audioQuality : videoQuality
      });
      const check = await ipcRenderer.invoke('check-track-downloaded', track);
      setResults(prev => prev.map(t => t.id === track.id ? { ...t, _downloaded: check.downloaded, _localTrack: check.track } : t));
    } catch (e) {
      setDownloads(prev => ({
        ...prev,
        [downloadId]: { ...prev[downloadId], status: 'error', error: e.message || 'İndirme başarısız oldu' }
      }));
    }
  }, [downloadFormat, audioQuality, videoQuality]);

  const handleBatchDownload = useCallback(() => {
    const selectedTracks = results.filter(t => selectedIds.has(t.id) && !t._downloaded);
    selectedTracks.forEach(track => handleDownload(track));
  }, [results, selectedIds, handleDownload]);

  const handleCancel = useCallback((downloadId) => {
    let ipcRenderer;
    try {
      ipcRenderer = window.require('electron').ipcRenderer;
    } catch (e) {
      console.warn('Electron API not available:', e.message);
      return;
    }
    ipcRenderer.invoke('cancel-download', downloadId);
    setDownloads(prev => { const next = { ...prev }; delete next[downloadId]; return next; });
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const available = results.filter(t => !t._downloaded);
    if (selectedIds.size === available.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(available.map(t => t.id)));
    }
  }, [results, selectedIds]);

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activeDownloads = Object.entries(downloads).filter(([, dl]) => dl.status === 'starting' || dl.status === 'downloading');
  const completedDownloads = Object.entries(downloads).filter(([, dl]) => dl.status === 'completed');
  const failedDownloads = Object.entries(downloads).filter(([, dl]) => dl.status === 'error');

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={18} style={{color:'var(--text-secondary)'}} />
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Şarkı adı, sanatçı, YouTube linki veya playlist..."
            className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition"
            style={{backgroundColor:'rgba(255,255,255,0.05)', borderColor:'var(--border-color)', color:'var(--text-primary)'}}
          />
        </div>
        <button onClick={handleSearch} disabled={loading}
          className="px-6 rounded-xl font-bold transition disabled:opacity-50 text-white flex items-center space-x-2"
          style={{backgroundColor:'var(--color-primary)'}}>
          {loading ? <Loader className="animate-spin" size={18} /> : <span>Ara</span>}
        </button>
      </div>

      {/* Quality & Format Selector */}
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Sliders size={14} style={{color:'var(--text-secondary)'}} />
          <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg focus:outline-none"
            style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)', border:'1px solid var(--border-color)'}}>
            <option value="audio">Ses (MP3)</option>
            <option value="video">Video (MP4)</option>
          </select>
        </div>
        {downloadFormat === 'audio' ? (
          <select value={audioQuality} onChange={(e) => setAudioQuality(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg focus:outline-none"
            style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)', border:'1px solid var(--border-color)'}}>
            {AUDIO_QUALITIES.map(q => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
        ) : (
          <select value={videoQuality} onChange={(e) => setVideoQuality(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-lg focus:outline-none"
            style={{backgroundColor:'var(--color-bg-tertiary)', color:'var(--text-primary)', border:'1px solid var(--border-color)'}}>
            {VIDEO_QUALITIES.map(q => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </select>
        )}
        {isPlaylist && (
          <span className="text-xs px-2 py-1 rounded-full" style={{backgroundColor:'rgba(59,130,246,0.15)', color:'var(--color-primary)'}}>
            <ListMusic size={12} className="inline mr-1" />Playlist
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <Loader className="animate-spin mx-auto mb-4" size={32} style={{color:'var(--color-primary)'}} />
          <p style={{color:'var(--text-secondary)'}}>Aranıyor...</p>
        </div>
      )}

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold" style={{color:'var(--text-secondary)'}}>İndiriliyor ({activeDownloads.length})</h3>
          {activeDownloads.map(([id, dl]) => (
            <div key={id} className="p-4 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Clock size={14} className="text-primary flex-shrink-0" />
                  <span className="text-sm font-bold truncate">{dl.title}</span>
                </div>
                <button onClick={() => handleCancel(id)} className="text-red-500 hover:text-red-400 ml-2 flex-shrink-0"><X size={16} /></button>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{backgroundColor:'rgba(255,255,255,0.1)'}}>
                <div className="h-full transition-all duration-300" style={{backgroundColor:'var(--color-primary)', width: `${dl.progress || 0}%`}} />
              </div>
              <div className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
                {dl.status === 'starting' && 'Başlatılıyor...'}
                {dl.status === 'downloading' && (
                  <>
                    <span>{dl.progress?.toFixed(1)}%</span>
                    {dl.speed && <span className="ml-2" style={{color:'var(--color-primary)'}}>{dl.speed}</span>}
                    {dl.eta && <span className="ml-1">Kalan {dl.eta}</span>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed Downloads */}
      {completedDownloads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold" style={{color:'var(--text-secondary)'}}>Tamamlananlar ({completedDownloads.length})</h3>
          {completedDownloads.map(([id, dl]) => (
            <div key={id} className="flex items-center justify-between px-4 py-2 rounded-xl" style={{backgroundColor:'var(--color-bg-secondary)'}}>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                <span className="text-xs truncate">{dl.title}</span>
              </div>
              <span className="text-[10px]" style={{color:'var(--text-secondary)'}}>✓ Eklendi</span>
            </div>
          ))}
        </div>
      )}

      {/* Failed Downloads */}
      {failedDownloads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold" style={{color:'var(--text-secondary)'}}>Başarısız</h3>
          {failedDownloads.map(([id, dl]) => (
            <div key={id} className="flex items-center justify-between px-4 py-2 rounded-xl" style={{backgroundColor:'rgba(239,68,68,0.1)'}}>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <X size={14} className="text-red-500 flex-shrink-0" />
                <span className="text-xs truncate">{dl.title}</span>
              </div>
              <span className="text-[10px] text-red-400">{dl.error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-bold" style={{color:'var(--text-secondary)'}}>
                {isPlaylist ? 'Playlist' : 'Sonuçlar'} ({results.length})
              </h3>
              <button onClick={toggleSelectAll} className="text-xs px-2 py-1 rounded-lg transition hover:bg-white/10 flex items-center space-x-1"
                style={{color:'var(--text-secondary)'}}>
                {selectedIds.size === results.filter(t => !t._downloaded).length && results.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
                <span>Tümünü Seç</span>
              </button>
            </div>
            {selectedIds.size > 0 && (
              <button onClick={handleBatchDownload}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center space-x-1"
                style={{backgroundColor:'var(--color-primary)'}}>
                <Download size={12} />
                <span>{selectedIds.size} İndir</span>
              </button>
            )}
          </div>
          <div className="space-y-1">
            {results.map((track, idx) => (
              <div key={track.id} className="flex items-center space-x-2 px-3 py-2 rounded-xl transition hover:bg-white/[0.03] group"
                style={{backgroundColor:'rgba(255,255,255,0.02)'}}>
                <button onClick={() => toggleSelect(track.id)}
                  className="p-1 rounded hover:bg-white/10 flex-shrink-0"
                  style={{color: selectedIds.has(track.id) ? 'var(--color-primary)' : 'var(--text-secondary)'}}>
                  {selectedIds.has(track.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Music size={16} style={{color:'var(--text-secondary)'}} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{track.title}</div>
                  <div className="text-[10px] truncate" style={{color:'var(--text-secondary)'}}>
                    {track.artist}
                    {track.duration > 0 && <span className="ml-2 opacity-60">{formatDuration(track.duration)}</span>}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button onClick={() => handleInstantPlay(track)}
                    className="p-1.5 rounded-lg transition hover:bg-white/10"
                    style={{color:'var(--text-secondary)'}}
                    disabled={playingId === track.id}
                    title={track._downloaded ? 'Kütüphaneden Çal' : playingId === track.id ? 'Yükleniyor...' : 'Anlık Çal'}>
                    {playingId === track.id ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                  </button>
                  
                  <button onClick={() => handleDownload(track)}
                    disabled={track._downloaded}
                    className="p-1.5 rounded-lg transition"
                    style={{
                      color: track._downloaded ? 'var(--color-primary)' : 'var(--text-secondary)',
                      opacity: track._downloaded ? 0.5 : 1,
                      cursor: track._downloaded ? 'not-allowed' : 'pointer'
                    }}
                    title={track._downloaded ? 'Zaten kütüphanede' : 'İndir'}>
                    {track._downloaded ? <CheckCircle size={16} /> : <Download size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <div className="text-xs py-4 text-center" style={{color:'var(--text-secondary)'}}>
        <p>Anlık Çal: Müziği bekletmeden dinleyin, seçilen kalitede arka planda indirilir.</p>
        <p className="mt-1">Zaten indirilmiş müzikler yeşil onay ile işaretlenir.</p>
      </div>
    </div>
  );
};

export default Downloader;
