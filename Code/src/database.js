const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;
let SQL = null;
let dbPath = null;

async function getDb() {
  if (db) return db;
  
  SQL = await initSqlJs();
  dbPath = path.join(app.getPath('userData'), 'player-library.db');
  const exists = fs.existsSync(dbPath);
  
  const buffer = exists ? fs.readFileSync(dbPath) : null;
  db = new SQL.Database(buffer);
  
  if (!exists) {
    initSchema();
  }
  
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT DEFAULT 'Bilinmeyen',
      album TEXT DEFAULT '',
      location TEXT,
      url TEXT,
      streamUrl TEXT,
      duration REAL DEFAULT 0,
      picture TEXT,
      thumbnail TEXT,
      addedAt INTEGER DEFAULT 0,
      source TEXT DEFAULT 'local',
      pageUrl TEXT,
      category TEXT DEFAULT '',
      genre TEXT DEFAULT '',
      year INTEGER DEFAULT 0,
      trackNumber INTEGER DEFAULT 0,
      bitrate INTEGER DEFAULT 0,
      sampleRate INTEGER DEFAULT 0,
      fileSize INTEGER DEFAULT 0,
      isTemp INTEGER DEFAULT 0,
      playCount INTEGER DEFAULT 0,
      lastPlayed INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      lyrics TEXT DEFAULT ''
    );
    
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      createdAt INTEGER DEFAULT 0,
      updatedAt INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlistId TEXT NOT NULL,
      trackId TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      addedAt INTEGER DEFAULT 0,
      PRIMARY KEY (playlistId, trackId)
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '',
      createdAt INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS track_categories (
      trackId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      PRIMARY KEY (trackId, categoryId)
    );
    
    CREATE TABLE IF NOT EXISTS eq_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bands TEXT DEFAULT '[0,0,0,0,0,0,0,0,0,0]',
      isBuiltIn INTEGER DEFAULT 0,
      createdAt INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS track_eq (
      trackId TEXT PRIMARY KEY,
      bands TEXT DEFAULT '[0,0,0,0,0,0,0,0,0,0]',
      effects TEXT DEFAULT '{}'
    );
    
    CREATE TABLE IF NOT EXISTS scrobbles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trackId TEXT,
      title TEXT,
      artist TEXT,
      playedAt INTEGER DEFAULT 0,
      duration REAL DEFAULT 0
    );
    
    CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
    CREATE INDEX IF NOT EXISTS idx_tracks_category ON tracks(category);
    CREATE INDEX IF NOT EXISTS idx_scrobbles_played ON scrobbles(playedAt);
  `);
  
  // Insert built-in EQ presets
  const presets = [
    { id: 'flat', name: 'Düz', bands: '[0,0,0,0,0,0,0,0,0,0]' },
    { id: 'pop', name: 'Pop', bands: '[3,2,0,-1,-2,-1,0,1,2,3]' },
    { id: 'rock', name: 'Rock', bands: '[4,3,2,1,-1,-2,-1,0,1,2]' },
    { id: 'classical', name: 'Klasik', bands: '[3,3,2,2,1,1,0,0,0,0]' },
    { id: 'bass', name: 'Bas Güçlendirme', bands: '[6,5,4,3,2,1,0,0,0,0]' },
    { id: 'treble', name: 'Tiz Güçlendirme', bands: '[0,0,0,0,0,1,2,4,5,6]' },
    { id: 'jazz', name: 'Jazz', bands: '[2,1,0,1,2,3,2,1,0,-1]' },
    { id: 'electronic', name: 'Elektronik', bands: '[4,2,0,-1,0,2,4,3,2,1]' },
    { id: 'hiphop', name: 'Hip Hop', bands: '[5,4,3,1,0,-1,0,1,2,3]' },
    { id: 'dynamic', name: 'Dinamik Güç', bands: '[2,1,0,0,0,0,1,2,3,4]' },
  ];
  
  const insertPreset = db.prepare('INSERT OR IGNORE INTO eq_presets (id, name, bands, isBuiltIn, createdAt) VALUES (?, ?, ?, 1, ?)');
  const now = Date.now();
  presets.forEach(p => {
    insertPreset.run([p.id, p.name, p.bands, now]);
  });
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Track operations
const trackOps = {
  getAll(options = {}) {
    const d = db;
    let sql = 'SELECT * FROM tracks WHERE isTemp = 0';
    const params = [];
    
    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    if (options.search) {
      sql += ' AND (title LIKE ? OR artist LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    if (options.favorite) {
      sql += ' AND favorite = 1';
    }
    
    sql += ' ORDER BY addedAt DESC';
    const stmt = d.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  getById(id) {
    const stmt = db.prepare('SELECT * FROM tracks WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  },
  
  insert(track) {
    db.run(`
      INSERT OR REPLACE INTO tracks 
      (id, title, artist, album, location, url, streamUrl, duration, picture, thumbnail,
       addedAt, source, pageUrl, category, genre, year, trackNumber, bitrate, sampleRate,
       fileSize, isTemp, playCount, lastPlayed, favorite, lyrics)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      track.id, track.title || '', track.artist || '', track.album || '',
      track.location || '', track.url || '', track.streamUrl || '',
      track.duration || 0, track.picture || '', track.thumbnail || '',
      track.addedAt || Date.now(), track.source || 'local', track.pageUrl || '',
      track.category || '', track.genre || '', track.year || 0,
      track.trackNumber || 0, track.bitrate || 0, track.sampleRate || 0,
      track.fileSize || 0, track.isTemp ? 1 : 0, track.playCount || 0,
      track.lastPlayed || 0, track.favorite ? 1 : 0, track.lyrics || ''
    ]);
    saveDb();
  },
  
  update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.run(`UPDATE tracks SET ${setClause} WHERE id = ?`, [...values, id]);
    saveDb();
  },
  
  delete(id) {
    db.run('DELETE FROM tracks WHERE id = ?', [id]);
    saveDb();
  },
  
  incrementPlayCount(id) {
    db.run('UPDATE tracks SET playCount = playCount + 1, lastPlayed = ? WHERE id = ?', [Date.now(), id]);
    saveDb();
  },
  
  search(query) {
    const q = `%${query}%`;
    const stmt = db.prepare(`
      SELECT * FROM tracks WHERE 
      isTemp = 0 AND (title LIKE ? OR artist LIKE ? OR album LIKE ?)
      ORDER BY playCount DESC, lastPlayed DESC
      LIMIT 50
    `);
    stmt.bind([q, q, q]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  getRecent(limit = 20) {
    const stmt = db.prepare('SELECT * FROM tracks WHERE isTemp = 0 ORDER BY lastPlayed DESC LIMIT ?');
    stmt.bind([limit]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  getTopPlayed(limit = 20) {
    const stmt = db.prepare('SELECT * FROM tracks WHERE isTemp = 0 ORDER BY playCount DESC LIMIT ?');
    stmt.bind([limit]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
};

// Scrobble operations
const scrobbleOps = {
  add(trackId, title, artist, duration) {
    db.run(`
      INSERT INTO scrobbles (trackId, title, artist, duration, playedAt)
      VALUES (?, ?, ?, ?, ?)
    `, [trackId, title, artist, duration, Date.now()]);
    saveDb();
  },
  
  getRecent(limit = 50) {
    const stmt = db.prepare(`
      SELECT s.*, t.picture FROM scrobbles s
      LEFT JOIN tracks t ON s.trackId = t.id
      ORDER BY s.playedAt DESC LIMIT ?
    `);
    stmt.bind([limit]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  getStats() {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalScrobbles,
        COUNT(DISTINCT trackId) as uniqueTracks,
        SUM(duration) as totalDuration,
        MAX(playedAt) as lastPlayed
      FROM scrobbles
    `);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }
};

// Playlist operations
const playlistOps = {
  getAll() {
    const stmt = db.prepare('SELECT * FROM playlists ORDER BY updatedAt DESC');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  create(name) {
    const id = `pl-${Date.now()}`;
    db.run('INSERT INTO playlists (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [id, name, Date.now(), Date.now()]);
    saveDb();
    return { id, name, tracks: [] };
  },
  
  delete(id) {
    db.run('DELETE FROM playlists WHERE id = ?', [id]);
    saveDb();
  },
  
  getTracks(playlistId) {
    const stmt = db.prepare(`
      SELECT t.* FROM playlist_tracks pt
      JOIN tracks t ON t.id = pt.trackId
      WHERE pt.playlistId = ?
      ORDER BY pt.position
    `);
    stmt.bind([playlistId]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  addTrack(playlistId, trackId) {
    const stmt = db.prepare('SELECT COUNT(*) as c FROM playlist_tracks WHERE playlistId = ?');
    stmt.bind([playlistId]);
    const pos = stmt.step() ? stmt.getAsObject().c : 0;
    stmt.free();
    db.run('INSERT OR IGNORE INTO playlist_tracks (playlistId, trackId, position, addedAt) VALUES (?, ?, ?, ?)', [playlistId, trackId, pos, Date.now()]);
    db.run('UPDATE playlists SET updatedAt = ? WHERE id = ?', [Date.now(), playlistId]);
    saveDb();
  },
  
  removeTrack(playlistId, trackId) {
    db.run('DELETE FROM playlist_tracks WHERE playlistId = ? AND trackId = ?', [playlistId, trackId]);
    saveDb();
  }
};

// Category operations
const categoryOps = {
  getAll() {
    const stmt = db.prepare(`
      SELECT c.*, COUNT(tc.trackId) as trackCount
      FROM categories c
      LEFT JOIN track_categories tc ON tc.categoryId = c.id
      GROUP BY c.id ORDER BY c.name
    `);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  create(name) {
    const id = `cat-${Date.now()}`;
    db.run('INSERT INTO categories (id, name, createdAt) VALUES (?, ?, ?)', [id, name, Date.now()]);
    saveDb();
    return { id, name, tracks: [] };
  },
  
  delete(id) {
    db.run('DELETE FROM categories WHERE id = ?', [id]);
    saveDb();
  },
  
  addTrack(categoryId, trackId) {
    db.run('INSERT OR IGNORE INTO track_categories (trackId, categoryId) VALUES (?, ?)', [trackId, categoryId]);
    saveDb();
  },
  
  getTrackCategories(trackId) {
    const stmt = db.prepare(`
      SELECT c.* FROM categories c
      JOIN track_categories tc ON tc.categoryId = c.id
      WHERE tc.trackId = ?
    `);
    stmt.bind([trackId]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
};

// Equalizer presets
const eqOps = {
  getAll() {
    const stmt = db.prepare('SELECT * FROM eq_presets ORDER BY isBuiltIn DESC, name');
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },
  
  save(name, bands, isBuiltIn = 0) {
    const id = `eq-${Date.now()}`;
    db.run('INSERT INTO eq_presets (id, name, bands, isBuiltIn, createdAt) VALUES (?, ?, ?, ?, ?)', [id, name, JSON.stringify(bands), isBuiltIn, Date.now()]);
    saveDb();
    return { id, name, bands };
  },
  
  delete(id) {
    db.run('DELETE FROM eq_presets WHERE id = ? AND isBuiltIn = 0', [id]);
    saveDb();
  },
  
  getTrackEq(trackId) {
    const stmt = db.prepare('SELECT * FROM track_eq WHERE trackId = ?');
    stmt.bind([trackId]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  },
  
  setTrackEq(trackId, bands, effects) {
    db.run(`
      INSERT OR REPLACE INTO track_eq (trackId, bands, effects)
      VALUES (?, ?, ?)
    `, [trackId, JSON.stringify(bands), JSON.stringify(effects || {})]);
    saveDb();
  }
};

module.exports = {
  getDb,
  trackOps,
  scrobbleOps,
  playlistOps,
  categoryOps,
  eqOps,
  
  close() {
    if (db) { db.close(); db = null; }
  }
};
