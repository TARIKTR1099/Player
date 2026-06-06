/**
 * LRU Cache — son erişilen 100 thumbnail'ı bellekte tutar.
 * Disk → `userData/thumbnails/{hash}.jpg`
 * Bellek → Map (LRU)
 */

const MAX_LRU_SIZE = 100;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün

class LRUCache {
  constructor(maxSize = MAX_LRU_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map(); // key → { value, expiresAt }
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // LRU: son erişimi başa al
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  delete(key) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
  size() { return this.cache.size; }
}

// Singleton instance
export const thumbnailCache = new LRUCache(100);

// Thumbnail disk path üret
export function getThumbnailPath(userDataPath, hash) {
  const safe = (hash || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${userDataPath}/thumbnails/${safe}.jpg`;
}

// Hash üret (filename → 12 char SHA-256 prefix)
export async function hashKey(input) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
  }
  // Fallback (Electron renderer): simple hash
  let h = 0;
  for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, '0');
}

export default LRUCache;
