const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { trackOps } = require('./database');

let watcher = null;

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.flac', '.m4a', '.ogg', '.wma', '.aac',
  '.mp4', '.mkv', '.avi', '.mov', '.webm'
]);

function startWatching(folderPath, onAdd, onRemove) {
  if (watcher) stopWatching();
  
  watcher = chokidar.watch(folderPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false,
    depth: 5,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
  });
  
  watcher
    .on('add', (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        onAdd(filePath);
      }
    })
    .on('unlink', (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        onRemove(filePath);
      }
    })
    .on('error', (error) => console.error('Watcher error:', error));
  
  return watcher;
}

function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

async function scanFolder(folderPath, onProgress) {
  const files = [];
  
  async function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.')) await walk(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (SUPPORTED_EXTENSIONS.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) { /* skip */ }
  }
  
  await walk(folderPath);
  return files;
}

module.exports = { startWatching, stopWatching, scanFolder };
