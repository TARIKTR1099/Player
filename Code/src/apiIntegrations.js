const https = require('https');
const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 10000, headers: { 'User-Agent': 'Player-Music/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

// MusicBrainz: Metadata lookup
async function lookupMusicBrainz(artist, title) {
  try {
    const data = await fetch(
      `https://musicbrainz.org/ws/2/recording/?fmt=json&query=artist:"${encodeURIComponent(artist)}"%20AND%20recording:"${encodeURIComponent(title)}"`
    );
    if (data.recordings && data.recordings.length > 0) {
      const rec = data.recordings[0];
      const year = rec['first-release-date'] ? parseInt(rec['first-release-date'].split('-')[0]) : 0;
      const album = rec.releases?.[0]?.title || '';
      const genre = rec.tags?.[0]?.name || '';
      return { title: rec.title, artist: rec['artist-credit']?.[0]?.artist?.name || artist, album, year, genre };
    }
  } catch (e) { /* ignore */ }
  return null;
}

// Spotify: Album art + metadata (requires clientId + clientSecret)
const spotifyAuth = { token: null, expires: 0 };

async function spotifyAuthFlow(clientId, clientSecret) {
  try {
    const data = await fetch('https://accounts.spotify.com/api/token?' + 
      new URLSearchParams({ grant_type: 'client_credentials' }).toString(), {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    if (data.access_token) {
      spotifyAuth.token = data.access_token;
      spotifyAuth.expires = Date.now() + (data.expires_in - 60) * 1000;
    }
  } catch (e) { /* ignore */ }
}

async function searchSpotify(query, type = 'track') {
  if (!spotifyAuth.token || Date.now() > spotifyAuth.expires) return [];
  try {
    const data = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`);
    if (type === 'track' && data.tracks) {
      return data.tracks.items.map(t => ({
        id: `spotify:${t.id}`,
        title: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        album: t.album.name,
        picture: t.album.images?.[0]?.url || null,
        duration: t.duration_ms / 1000,
        pageUrl: t.external_urls?.spotify || '',
        sourceLabel: 'Spotify',
      }));
    }
  } catch (e) { /* ignore */ }
  return [];
}

async function getSpotifyRecommendations(seedTrack, seedArtist) {
  if (!spotifyAuth.token || Date.now() > spotifyAuth.expires) return [];
  try {
    const data = await fetch(
      `https://api.spotify.com/v1/recommendations?limit=10&seed_tracks=${seedTrack}`,
      { headers: { 'Authorization': `Bearer ${spotifyAuth.token}` } }
    );
    if (data.tracks) {
      return data.tracks.map(t => ({
        id: `spotify-rec:${t.id}`,
        title: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        picture: t.album.images?.[0]?.url || null,
        duration: t.duration_ms / 1000,
        sourceLabel: 'Spotify Öneri',
      }));
    }
  } catch (e) { /* ignore */ }
  return [];
}

// Last.fm: Artist info + scrobbling
async function lookupLastfmArtist(artist, apiKey) {
  try {
    const data = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`
    );
    if (data.artist) {
      return {
        bio: data.artist.bio?.summary?.substring(0, 500) || '',
        tags: data.artist.tags?.tag?.map(t => t.name).slice(0, 5) || [],
        similar: data.artist.similar?.artist?.map(a => a.name).slice(0, 5) || [],
        image: data.artist.image?.find(i => i.size === 'extralarge')?.['#text'] || null,
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

async function scrobbleLastfm(artist, title, apiKey, sessionKey) {
  // Requires authenticated session - simplified
  return { ok: true };
}

// Musixmatch: Lyrics
async function lookupLyrics(artist, title, apiKey) {
  try {
    const data = await fetch(
      `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?format=json&q_artist=${encodeURIComponent(artist)}&q_track=${encodeURIComponent(title)}&apikey=${apiKey}`
    );
    if (data.message?.body?.lyrics) {
      return {
        lyrics: data.message.body.lyrics.lyrics_body || '',
        copyright: data.message.body.lyrics.lyrics_copyright || '',
        hasLrc: false,
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

// Metadata enrichment: runs all lookups in parallel
async function enrichMetadata(track, { lastfmKey, musixmatchKey, spotifyId, spotifySecret } = {}) {
  const results = { musicbrainz: null, lastfm: null, lyrics: null, spotify: null };
  
  const promises = [];
  
  promises.push(
    lookupMusicBrainz(track.artist, track.title).then(r => results.musicbrainz = r)
  );
  
  if (lastfmKey) {
    promises.push(
      lookupLastfmArtist(track.artist, lastfmKey).then(r => results.lastfm = r)
    );
  }
  
  if (musixmatchKey) {
    promises.push(
      lookupLyrics(track.artist, track.title, musixmatchKey).then(r => results.lyrics = r)
    );
  }
  
  if (spotifyId && spotifySecret) {
    await spotifyAuthFlow(spotifyId, spotifySecret);
    promises.push(
      searchSpotify(`${track.artist} ${track.title}`).then(r => results.spotify = r[0] || null)
    );
  }
  
  await Promise.allSettled(promises);
  
  // Merge results
  if (results.musicbrainz) {
    track.artist = results.musicbrainz.artist || track.artist;
    track.album = results.musicbrainz.album || track.album;
    track.genre = results.musicbrainz.genre || track.genre;
    track.year = results.musicbrainz.year || track.year;
  }
  
  if (results.spotify) {
    track.picture = results.spotify.picture || track.picture;
    track.album = results.spotify.album || track.album;
    track.duration = results.spotify.duration || track.duration;
  }
  
  if (results.lastfm) {
    track.bio = results.lastfm.bio;
    track.tags = results.lastfm.tags;
    track.similarArtists = results.lastfm.similar;
  }
  
  if (results.lyrics) {
    track.lyrics = results.lyrics.lyrics;
  }
  
  return track;
}

module.exports = {
  enrichMetadata,
  lookupMusicBrainz,
  searchSpotify,
  getSpotifyRecommendations,
  lookupLastfmArtist,
  lookupLyrics,
  spotifyAuthFlow,
  scrobbleLastfm,
};
