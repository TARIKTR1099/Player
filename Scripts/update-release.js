#!/usr/bin/env node
/**
 * Update the v1.0.0 GitHub release body and publish it (turn off draft).
 * Usage: GH_TOKEN=ghp_... node Scripts/update-release.js
 */
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) { console.error('GH_TOKEN env required'); process.exit(1); }

const RELEASE_ID = 331656513;
const OWNER = 'TARIKTR1099';
const REPO = 'Player';

const BODY = `## 📥 Downloads

| Platform | Architecture | File | Size |
|----------|--------------|------|------|
| **Windows** | x86-64 (Setup) | [Player-1.0.0-setup-x64.exe](https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/Player-1.0.0-setup-x64.exe) | 106 MB |
| **Windows** | x86-64 (Portable) | [Player-1.0.0-portable-x64.exe](https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/Player-1.0.0-portable-x64.exe) | 94 MB |
| **Windows** | x86-64 (Zip) | [Player-1.0.0-x64.zip](https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/Player-1.0.0-x64.zip) | 138 MB |
| **Source** | (zip) | [Player-1.0.0-source.zip](https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/Player-1.0.0-source.zip) | 86 MB |
| **Source** | (tar.gz) | [Player-1.0.0-source.tar.gz](https://github.com/${OWNER}/${REPO}/releases/download/v1.0.0/Player-1.0.0-source.tar.gz) | 84 MB |

> **macOS / Linux / Android / iOS**: Build from source on a Mac (Xcode 15+) or Linux machine. See README → "Kaynak Koddan Derleme". Linux AppImage is also available in the [v1.0.0 release](https://github.com/${OWNER}/${REPO}/releases/tag/v1.0.0).

## ✨ What's New in v1.0.0

### 🎵 Core Features
- **Multi-format player**: MP3, FLAC, WAV, M4A, OGG, AAC, WMA, MP4, MKV, AVI, WEBM
- **3D Visualizer** + waveform + 10-band EQ (Tone.js + Three.js)
- **Audio effects**: speed, reverb, compressor, filters
- **Subtitle timeline**: SRT/VTT support with click-to-seek
- **Fullscreen Media Mode**: immersive playback with album art/video fill
- **System tray** with emoji icons, real-time IPC
- **Cross-platform tray** abstraction (macOS template, Windows .ico, Linux .png)

### 🧩 Plugin System
- **Plugin Store**: discover, install, manage
- **AI Plugin Builder**: chat with AI to create plugins
- **GitHub Publishing**: publish directly from the app
- **AI Security Analysis**: pre-install safety scoring

### 🤖 AI Integration
- **AI Chat**: OpenRouter, OpenAI, Anthropic, Google, custom endpoints
- **AI Search**: semantic search across tracks
- **AI Recommendations**: based on listening patterns

### 🎨 UX & UI
- **Dark theme** (default) + **Light theme**, persists across restarts
- **Turkish + English** i18n (toggle in Settings)
- **shadcn/ui design system** (semantic colors, \`gap-*\`, \`cn()\` utility)
- **Branded splash screen** (no white flash on startup)
- **Recent played** strip with search highlight
- **Favorites** (heart icon, context menu toggle)
- **Statistics dashboard**: top tracks/artists, listening time
- **Sleep timer** with toast notifications
- **Keyboard shortcuts help** (\`?\` / F1 / Shift+/)
- **Search highlighting** in GridTrack/ListTrack/CompactTrack
- **HighlightText** component for fuzzy match visualization

### 📱 Cross-Platform
- **PWA**: install on mobile, manifest shortcuts, BottomNav, mobile drawer
- **Touch device support**: larger play button, gesture-friendly
- **Capacitor 7**: Android + iOS wrapper scaffolds ready
- **electron-builder**: Win NSIS/portable/zip, Mac DMG/zip, Linux AppImage/deb/rpm
- **GitHub Actions**: 5-platform matrix build on tag push
- **TarnakCode organization**: clean \`Code/\` \`Assets/\` \`Downloads/\` \`Others/\` \`UserGuides/\` \`.TarnakCode/\` structure

### 🐛 Bug Fixes
- App crash when icon path undefined in BrowserWindow
- EQ slider CSS orientation
- Three-dot menu showing track name instead of "Copy Name"
- Duplicate play button in top overlay
- Fullscreen mode conflicts with window controls
- Sleep timer input validation (1-600 min)
- safeStorage QuotaExceeded recovery

## 🛠 Tech Stack
\`\`\`
React 19 + Vite 8 + Tailwind CSS 4
Electron 28 + electron-builder
Zustand (state) + Web Audio API
Tone.js + Three.js + Wavesurfer.js
Capacitor 7 (mobile)
lunr.js (local search)
\`\`\`

## 🔗 Links
- 📖 [README](https://github.com/${OWNER}/${REPO}/blob/main/README.md)
- 🇹🇷 [Kullanım Kılavuzu](https://github.com/${OWNER}/${REPO}/blob/main/UserGuides/KULLANIM_KILAVUZU.md)
- 🔌 [Eklenti Yapma Rehberi](https://github.com/${OWNER}/${REPO}/blob/main/UserGuides/EKLENTI_YAPMA.md)
- 📚 [Wiki](https://github.com/${OWNER}/${REPO}/tree/main/.TarnakCode/Wiki)

---

**Full Changelog**: https://github.com/${OWNER}/${REPO}/commits/v1.0.0
`;

function patch(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'release-updater',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    };
    if (data) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(b));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${b.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('Updating release body...');
    const r = await patch('PATCH', `/repos/${OWNER}/${REPO}/releases/${RELEASE_ID}`, {
      body: BODY,
      draft: false,  // publish
      name: 'Player 1.0.0 — Cross-platform media player',
    });
    console.log('OK:', r.html_url);
    console.log('Draft:', r.draft);
    console.log('Assets:', r.assets.map(a => `  - ${a.name} (${(a.size/1024/1024).toFixed(1)} MB)`).join('\n'));
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  }
})();
