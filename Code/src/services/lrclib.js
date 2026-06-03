/**
 * LRCLib API Service — Free synced lyrics (no API key needed)
 * From Spotube research: LRCLib provides community-sourced time-synced lyrics
 * API: https://lrclib.net/
 */

const LRCLIB_BASE = 'https://lrclib.net/api';

/**
 * Search for synced lyrics by track metadata
 * @param {Object} params - { trackName, artistName, albumName, duration }
 * @returns {Object|null} - { syncedLyrics: string (LRC format), plainLyrics: string } or null
 */
export async function fetchSyncedLyrics({ trackName, artistName, albumName, duration }) {
  try {
    const url = new URL(`${LRCLIB_BASE}/get`);
    url.searchParams.set('track_name', trackName);
    if (artistName) url.searchParams.set('artist_name', artistName);
    if (albumName) url.searchParams.set('album_name', albumName);
    if (duration) url.searchParams.set('duration', String(Math.round(duration)));

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    return {
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null,
    };
  } catch {
    return null;
  }
}

/**
 * Search for lyrics by query (returns list of results)
 * @param {string} query - Search term
 * @returns {Array} - List of { id, trackName, artistName, albumName, duration }
 */
export async function searchLyrics(query) {
  try {
    const url = new URL(`${LRCLIB_BASE}/search`);
    url.searchParams.set('q', query);

    const response = await fetch(url.toString());
    if (!response.ok) return [];

    return await response.json();
  } catch {
    return [];
  }
}

/**
 * Parse LRC format string into cues array
 * LRC format: [mm:ss.xx] Lyric text
 * @param {string} lrcText - LRC formatted string
 * @returns {Array} - [{ start: number, end: number, text: string }]
 */
export function parseLRC(lrcText) {
  if (!lrcText) return [];

  const lines = lrcText.split('\n');
  const cues = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const start = mins * 60 + secs + ms / 1000;
      const text = match[4].trim();

      if (text) {
        cues.push({ start, end: start + 5, text }); // end will be updated below
      }
    }
  }

  // Update end times: each cue ends where the next begins
  for (let i = 0; i < cues.length - 1; i++) {
    cues[i].end = cues[i + 1].start;
  }

  return cues;
}
