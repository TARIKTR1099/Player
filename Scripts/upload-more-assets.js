#!/usr/bin/env node
/**
 * Upload additional assets (zip, etc.) to the published v1.0.0 release.
 * Usage: GH_TOKEN=ghp_... node Scripts/upload-more-assets.js
 */
const fs = require('fs');
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('GH_TOKEN env required'); process.exit(1); }

const RELEASE_ID = 331656513;

const files = [
  { src: 'dist/Player-1.0.0-x64.zip', name: 'Player-1.0.0-x64.zip' },
  { src: 'dist/Player-1.0.0-x64.exe', name: 'Player-1.0.0-x64.exe' },
];

function upload(file) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(file.src)) { console.log('  MISSING:', file.src); return resolve(); }
    const stat = fs.statSync(file.src);
    const size = stat.size;
    console.log(`  Uploading ${file.name} (${(size/1024/1024).toFixed(2)} MB)...`);
    const data = fs.readFileSync(file.src);
    const opts = {
      hostname: 'uploads.github.com',
      path: `/repos/TARIKTR1099/Player/releases/${RELEASE_ID}/assets?name=${encodeURIComponent(file.name)}`,
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
          console.log(`    OK: ${j.state} (${j.name})`);
          resolve();
        } else {
          console.error(`    FAIL ${res.statusCode}: ${body.slice(0, 200)}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const f of files) { try { await upload(f); } catch (e) { console.error(e.message); } }
  console.log('DONE');
})();
