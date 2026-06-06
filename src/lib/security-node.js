/**
 * Security utilities — Node/Electron main process için.
 * Browser-safe modül (security.js) ile birlikte kullanılır.
 */

const path = require('path');
const fs = require('fs');

/**
 * Mutlak yol oluşturur ve base dizin içinde kalmasını garanti eder.
 * @param {string} baseDir - Güvenli kök (örn: app.getPath('userData'))
 * @param {string} userPath - Kullanıcı girdisi
 * @returns {string|null} Güvenli mutlak yol veya null
 */
function safeJoin(baseDir, userPath) {
  if (typeof baseDir !== 'string' || typeof userPath !== 'string') return null;
  if (userPath.includes('\0')) return null; // null byte injection
  if (path.isAbsolute(userPath)) return null; // mutlak yol reddi
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(resolvedBase, userPath);
  // baseDir dışına çıkışı engelle
  const isWin = process.platform === 'win32';
  const base = isWin ? resolvedBase.toLowerCase() : resolvedBase;
  const target = isWin ? resolved.toLowerCase() : resolved;
  if (!target.startsWith(base + path.sep) && target !== base) return null;
  return resolved;
}

/**
 * Dosya adından güvenli (filesystem-safe) isim üretir.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
  if (typeof name !== 'string') return 'unnamed';
  // Windows + Unix'te yasaklı karakterler
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '_')
    .slice(0, 255)
    .trim() || 'unnamed';
}

/**
 * Dizin yoksa oluşturur (recursive).
 * @param {string} dir
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = { safeJoin, sanitizeFilename, ensureDir };
