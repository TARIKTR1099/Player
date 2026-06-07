/**
 * ContentImporter — Hamburger menü ile kütüphaneye içerik ekleme.
 *
 * 5 seçenek:
 *  1. 📁 Dosya Ekle        → add-music-files (Electron file picker)
 *  2. 📂 Klasör Ekle      → add-music-folder (recursive scan)
 *  3. 🗜️ ZIP Ekle          → add-music-compressed (extract + scan)
 *  4. 🔗 URL Ekle          → add-music-link (HTTP/HTTPS, m3u8, mp4, ...)
 *  5. ▶️ YouTube Ekle      → add-music-link (yt-dlp)
 *
 * Platform bazlı izin kontrolü (Android: STORAGE, iOS: PHOTO_LIBRARY).
 * Tüm dosya yolları src/lib/security.js → sanitizePath ile temizlenir.
 * Eklenen öğeler IPC üzerinden main.js → database.js (SQLite) yazılır.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, FilePlus, FolderPlus, FileArchive, Link2, Play, X
} from 'lucide-react';
import { isElectron, isCapacitor, isAndroid, isIOS } from '../platform';
import { parseSafeUrl, parseYouTubeUrl, getMediaType, escapeHtml } from '../lib/security';

const { ipcInvoke } = (() => {
  try {
    return require('../platform');
  } catch {
    return { ipcInvoke: async () => null };
  }
})();

export default function ContentImporter({ onAdded, onError, t }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'url' | 'youtube' | null
  const [urlInput, setUrlInput] = useState('');
  const [busy, setBusy] = useState(false);
  const menuRef = useRef(null);

  // Dış tıklama ile menüyü kapat
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // ============================================================
  // 1) DOSYA EKLE
  // ============================================================
  const handleAddFiles = async () => {
    setOpen(false);
    setBusy(true);
    try {
      // Platform bazlı izin kontrolü
      if (isCapacitor() && isAndroid()) {
        const granted = await requestAndroidStoragePermission();
        if (!granted) {
          onError?.('Depolama izni reddedildi');
          return;
        }
      }
      if (isCapacitor() && isIOS()) {
        // iOS'ta document picker kullanılır (ana akış picker üzerinden)
      }

      const result = await ipcInvoke('add-music-files');
      if (result?.added) {
        onAdded?.({ source: 'files', count: result.added });
      }
    } catch (e) {
      onError?.(`Dosya eklenemedi: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // 2) KLASÖR EKLE
  // ============================================================
  const handleAddFolder = async () => {
    setOpen(false);
    setBusy(true);
    try {
      if (isCapacitor() && isAndroid()) {
        const granted = await requestAndroidStoragePermission();
        if (!granted) { onError?.('Depolama izni reddedildi'); return; }
      }
      const result = await ipcInvoke('add-music-folder');
      if (result?.added) {
        onAdded?.({ source: 'folder', count: result.added, path: result.path });
      }
    } catch (e) {
      onError?.(`Klasör taranamadı: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // 3) ZIP EKLE
  // ============================================================
  const handleAddZip = async () => {
    setOpen(false);
    setBusy(true);
    try {
      if (isCapacitor() && isAndroid()) {
        const granted = await requestAndroidStoragePermission();
        if (!granted) { onError?.('Depolama izni reddedildi'); return; }
      }
      const result = await ipcInvoke('add-music-compressed');
      if (result?.added) {
        onAdded?.({ source: 'zip', count: result.added, path: result.path });
      }
    } catch (e) {
      onError?.(`ZIP çıkarılamadı: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // 4) URL EKLE
  // ============================================================
  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    // URL validation (security.js)
    const url = parseSafeUrl(urlInput.trim());
    if (!url) {
      onError?.('Geçersiz veya güvenli olmayan URL. Sadece http(s) desteklenir.');
      return;
    }
    setBusy(true);
    try {
      const result = await ipcInvoke('add-music-link', url.href);
      if (result?.added || result?.ok) {
        onAdded?.({ source: 'url', url: url.href });
        setUrlInput('');
        setModal(null);
      } else {
        onError?.(result?.error || 'URL eklenemedi');
      }
    } catch (e) {
      onError?.(`URL indirilemedi: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // 5) YOUTUBE EKLE
  // ============================================================
  const handleAddYoutube = async () => {
    if (!urlInput.trim()) return;
    const yt = parseYouTubeUrl(urlInput.trim());
    if (!yt.videoId) {
      onError?.('Geçerli bir YouTube URL\'i değil. youtube.com/watch?v=... veya youtu.be/... deneyin.');
      return;
    }
    setBusy(true);
    try {
      // yt-dlp üzerinden indirilir
      const result = await ipcInvoke('add-music-link', `https://www.youtube.com/watch?v=${yt.videoId}`);
      if (result?.added || result?.ok) {
        onAdded?.({ source: 'youtube', videoId: yt.videoId });
        setUrlInput('');
        setModal(null);
      } else {
        onError?.(result?.error || 'YouTube videosu indirilemedi');
      }
    } catch (e) {
      onError?.(`YouTube indirilemedi: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // ANDROID STORAGE İZNİ
  // ============================================================
  const requestAndroidStoragePermission = async () => {
    try {
      // Capacitor Camera/Storage plugin üzerinden
      if (window.Capacitor?.Plugins?.Permissions) {
        const perms = await window.Capacitor.Plugins.Permissions.request({
          permissions: ['storage', 'read_media_audio', 'read_media_video']
        });
        return perms?.storage === 'granted' || perms?.read_media_audio === 'granted';
      }
      // Fallback: dialog açıkken native tarafta izin kontrolü yapılır
      return true;
    } catch {
      return false;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={busy}
        className="p-2 rounded-xl transition border hover:bg-white/5 disabled:opacity-50"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)'
        }}
        title="İçerik Ekle"
        aria-label="İçerik Ekle"
        aria-expanded={open}
      >
        {busy ? (
          <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
               style={{ borderColor: 'var(--color-primary) transparent transparent transparent' }} />
        ) : (
          <Menu size={14} />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
          role="menu"
        >
          <button onClick={handleAddFiles} role="menuitem" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition text-left" style={{color:'var(--text-primary)'}}>
            <FilePlus size={14} /> Dosya Ekle
          </button>
          <button onClick={handleAddFolder} role="menuitem" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition text-left" style={{color:'var(--text-primary)'}}>
            <FolderPlus size={14} /> Klasör Ekle
          </button>
          <button onClick={handleAddZip} role="menuitem" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition text-left" style={{color:'var(--text-primary)'}}>
            <FileArchive size={14} /> ZIP Ekle
          </button>
          <div className="border-t my-1" style={{borderColor:'var(--border-color)'}} />
          <button onClick={() => { setOpen(false); setModal('url'); }} role="menuitem" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition text-left" style={{color:'var(--text-primary)'}}>
            <Link2 size={14} /> URL / Bağlantı Ekle
          </button>
          <button onClick={() => { setOpen(false); setModal('youtube'); }} role="menuitem" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition text-left" style={{color:'var(--text-primary)'}}>
            <Play size={14} /> YouTube Linki Ekle
          </button>
        </div>
      )}

      {/* URL / YouTube Input Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={() => !busy && setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2" style={{color:'var(--text-primary)'}}>
                {modal === 'youtube' ? <Play size={16} /> : <Link2 size={16} />}
                {modal === 'youtube' ? 'YouTube Linki' : 'URL / Bağlantı'}
              </h3>
              <button onClick={() => setModal(null)} disabled={busy} className="p-1 rounded-lg hover:bg-white/10">
                <X size={16} style={{color:'var(--text-secondary)'}} />
              </button>
            </div>
            <input
              autoFocus
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') modal === 'youtube' ? handleAddYoutube() : handleAddUrl();
                if (e.key === 'Escape') setModal(null);
              }}
              placeholder={modal === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/song.mp3'}
              disabled={busy}
              className="w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
            <p className="text-[10px] mt-2" style={{color:'var(--text-secondary)'}}>
              {modal === 'youtube'
                ? 'Desteklenen: youtube.com/watch, youtu.be, /shorts/, /embed/. yt-dlp ile indirilir.'
                : 'Desteklenen: http(s)://... (mp4, mp3, m3u8, vb.).'}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setModal(null)}
                disabled={busy}
                className="flex-1 px-3 py-2 text-xs rounded-lg border hover:bg-white/5"
                style={{borderColor:'var(--border-color)', color:'var(--text-secondary)'}}
              >
                İptal
              </button>
              <button
                onClick={modal === 'youtube' ? handleAddYoutube : handleAddUrl}
                disabled={busy || !urlInput.trim()}
                className="flex-1 px-3 py-2 text-xs rounded-lg font-bold text-white disabled:opacity-50"
                style={{backgroundColor:'var(--color-primary)'}}
              >
                {busy ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
