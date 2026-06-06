#!/usr/bin/env node
/**
 * Upload dist/ files to existing GitHub release (v1.0.0).
 * Usage: GH_TOKEN=ghp_... node Scripts/upload-release-assets.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('GH_TOKEN env required'); process.exit(1); }

const RELEASE_ID = 331656513;
const OWNER = 'TARIKTR1099';
const REPO = 'Player';

const files = [
  { src: 'dist/Player-1.0.0-setup-x64.exe', name: 'Player-1.0.0-setup-x64.exe' },
  { src: 'dist/Player-1.0.0-portable-x64.exe', name: 'Player-1.0.0-portable-x64.exe' },
  { src: 'dist/Player-1.0.0-source.zip', name: 'Player-1.0.0-source.zip' },
  { src: 'dist/Player-1.0.0-source.tar.gz', name: 'Player-1.0.0-source.tar.gz' },
];

function upload(file) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file.src)) {
      console.log('  MISSING:', file.src);
      return resolve();
    }
    const stat = fs.statSync(file.src);
    const size = stat.size;
    const mb = (size / 1024 / 1024).toFixed(2);
    console.log(`  Uploading ${file.name} (${mb} MB)...`);

    const opts = {
      hostname: 'uploads.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/${RELEASE_ID}/assets?name=${encodeURIComponent(file.name)}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': size,
        'User-Agent': 'release-asset-uploader',
      },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const j = JSON.parse(body);
          console.log(`    OK: ${j.browser_download_url}`);
          resolve();
        } else {
          console.error(`    FAIL ${res.statusCode}: ${body.slice(0, 200)}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    fs.createReadStream(file.src).pipe(req);
  });
}

(async () => {
  for (const f of files) {
    try { await upload(f); } catch (e) { console.error(e.message); }
  }
  console.log('DONE');
})();
