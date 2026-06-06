/**
 * Security utilities — path sanitization, URL validation, HTML escaping, Zip Slip prevention.
 *
 * Kullanım:
 *   import { sanitizePath, escapeHtml, isSafeUrl, safeZipExtractPath } from './lib/security';
 *
 * Tüm dosya yolları, kullanıcı girdileri ve dış kaynaklı içerik bu modülden geçmelidir.
 */

// ============================================================================
// 1) PATH SANITIZATION (path traversal önlemi)
// ============================================================================

const PATH_TRAVERSAL_RE = /(\.\.[\\/])+/g;
const ABSOLUTE_PATH_RE = /^[a-zA-Z]:[\\/]|^[\\/]/;

/**
 * Dosya yolunu güvenli hale getirir. Path traversal (..) ve mutlak yolları engeller.
 * @param {string} inputPath - Kullanıcıdan veya dış kaynaktan gelen yol
 * @returns {string|null} Güvenli göreceli yol, veya null (engellenmiş)
 */
export function sanitizePath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.length === 0) return null;
  // Null byte injection
  if (inputPath.includes('\0')) return null;
  // Mutlak yol (Windows: C:\ veya Unix: /path)
  if (ABSOLUTE_PATH_RE.test(inputPath)) return null;
  // Path traversal: .. veya ../ veya ..\\
  if (PATH_TRAVERSAL_RE.test(inputPath)) return null;
  // Baştaki / veya \ kaldır
  return inputPath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
}

/**
 * Path'in base directory içinde kalıp kalmadığını doğrular.
 * @param {string} basePath - Güvenli kök dizin (örn: userData/thumbnails)
 * @param {string} resolvedPath - Sanitize edilmiş yolun mutlak hali
 * @returns {boolean} Güvenli ise true
 */
export function isPathSafe(basePath, resolvedPath) {
  if (typeof basePath !== 'string' || typeof resolvedPath !== 'string') return false;
  const path = requireNode('path');
  const normalizedBase = path.resolve(basePath);
  const normalizedResolved = path.resolve(resolvedPath);
  // basePath prefix kontrolü (Windows: case-insensitive)
  const isWin = process?.platform === 'win32';
  const base = isWin ? normalizedBase.toLowerCase() : normalizedBase;
  const target = isWin ? normalizedResolved.toLowerCase() : normalizedResolved;
  return target.startsWith(base + path.sep) || target === base;
}

// Lazy require — browser ortamında patlamaz
function requireNode(mod) {
  try { return require(mod); } catch { return null; }
}

// ============================================================================
// 2) HTML ESCAPE (XSS önlemi)
// ============================================================================

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Kullanıcı girdisini HTML'e basmadan önce escape eder.
 * @param {string} str - Escape edilecek metin
 * @returns {string} Güvenli HTML string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=\/]/g, (c) => HTML_ESCAPE_MAP[c]);
}

/**
 * URL'i attribute context'te kullanmak için güvenli hale getirir.
 * @param {string} url
 * @returns {string} javascript: gibi tehlikeli scheme'ler temizlenmiş
 */
export function escapeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim().toLowerCase();
  // Tehlikeli scheme'ler
  if (trimmed.startsWith('javascript:')) return '#';
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/') && !trimmed.startsWith('data:audio/') && !trimmed.startsWith('data:video/')) return '#';
  if (trimmed.startsWith('vbscript:')) return '#';
  return url;
}

// ============================================================================
// 3) URL VALIDATION (URL API — regex DEĞİL)
// ============================================================================

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * URL'in güvenli olup olmadığını kontrol eder. URL API kullanır (regex değil).
 * @param {string} input
 * @param {Set<string>} [allowedProtocols] - Varsayılan: http:, https:
 * @returns {URL|null} Geçerli ve güvenli ise URL objesi, değilse null
 */
export function parseSafeUrl(input, allowedProtocols = ALLOWED_PROTOCOLS) {
  if (typeof input !== 'string' || input.length === 0) return null;
  let url;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (!allowedProtocols.has(url.protocol)) return null;
  return url;
}

/**
 * YouTube URL'ini güvenli parse eder. Sadece bilinen domain'leri kabul eder.
 * @param {string} input
 * @returns {{videoId: string, type: 'youtube'|'youtu.be'|null}}
 */
export function parseYouTubeUrl(input) {
  const url = parseSafeUrl(input);
  if (!url) return { videoId: null, type: null };

  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  // youtube.com/watch?v=ID
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return { videoId: v, type: 'youtube' };
    }
    // youtube.com/shorts/ID
    if (url.pathname.startsWith('/shorts/')) {
      const v = url.pathname.split('/')[2];
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return { videoId: v, type: 'youtube' };
    }
    // youtube.com/embed/ID
    if (url.pathname.startsWith('/embed/')) {
      const v = url.pathname.split('/')[2];
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return { videoId: v, type: 'youtube' };
    }
  }

  // youtu.be/ID
  if (host === 'youtu.be') {
    const v = url.pathname.slice(1).split('/')[0];
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return { videoId: v, type: 'youtu.be' };
  }

  return { videoId: null, type: null };
}

// ============================================================================
// 4) ZIP SLIP PREVENTION
// ============================================================================

/**
 * ZIP entry'sinin extract edilmesi güvenli mi kontrol eder.
 * Zip Slip saldırısını önler (entry path'inde ".." ile base dışına çıkma).
 * @param {string} entryName - ZIP içindeki dosya adı
 * @param {string} extractDir - Extract edilecek kök dizin
 * @returns {boolean} Güvenli ise true
 */
export function isSafeZipEntry(entryName, extractDir) {
  if (typeof entryName !== 'string' || typeof extractDir !== 'string') return false;
  const path = requireNode('path');
  if (!path) return false;
  // Sembolik link kontrolü: Windows'ta ".." içeren tüm path'ler reddedilir
  if (entryName.includes('..')) return false;
  // Mutlak yol kontrolü
  if (path.isAbsolute(entryName)) return false;
  // Resolve edilmiş path'in base içinde kalması
  const resolvedExtract = path.resolve(extractDir);
  const resolvedTarget = path.resolve(resolvedExtract, entryName);
  const isWin = process?.platform === 'win32';
  const base = isWin ? resolvedExtract.toLowerCase() : resolvedExtract;
  const target = isWin ? resolvedTarget.toLowerCase() : resolvedTarget;
  return target.startsWith(base + path.sep) || target === base;
}

// ============================================================================
// 5) FILE TYPE VALIDATION
// ============================================================================

const ALLOWED_AUDIO_EXT = new Set([
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'aiff', 'alac'
]);
const ALLOWED_VIDEO_EXT = new Set([
  'mp4', 'mkv', 'avi', 'webm', 'mov', 'flv', 'wmv', 'm4v', '3gp', 'ts', 'm2ts'
]);

/**
 * Dosya uzantısının izin verilen medya türünde olup olmadığını kontrol eder.
 * @param {string} filename
 * @returns {'audio'|'video'|null}
 */
export function getMediaType(filename) {
  if (typeof filename !== 'string') return null;
  const ext = filename.toLowerCase().split('.').pop();
  if (ALLOWED_AUDIO_EXT.has(ext)) return 'audio';
  if (ALLOWED_VIDEO_EXT.has(ext)) return 'video';
  return null;
}

// ============================================================================
// 6) CSP / SECURITY DEFAULTS
// ============================================================================

/**
 * Renderer için güvenli Content-Security-Policy header değeri.
 * Electron'da webSecurity: true ile birlikte kullanılmalı.
 */
export const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Vite dev server için unsafe-eval gerekli
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: file: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export default {
  sanitizePath,
  isPathSafe,
  escapeHtml,
  escapeUrl,
  parseSafeUrl,
  parseYouTubeUrl,
  isSafeZipEntry,
  getMediaType,
  DEFAULT_CSP
};
