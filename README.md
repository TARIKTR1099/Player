# Player 1.0.0

> *"Müzik, video, ses... uygulaması. Pek çok özelliğiyle eklentiler ve yapay zeka. Sade bir arayüz ve kullanıcı dostu bir yapı benimsedim."*

**Player** — Windows, macOS, Linux, Android ve iOS için geliştirilmiş, modern arayüzlü, yerel medya oynatıcı. Müzik, video ve ses dosyalarını oynatır; eklenti sistemi ve AI entegrasyonu ile genişletilebilir.

---

## Downloads

| Platform | Architecture | Download |
|----------|-------------|----------|
| Windows | x86-64 | [Player-1.0.0-x64.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-x64.exe) |
| Windows | x86-32 | *Coming soon* |
| macOS (Intel) | x86-64 | *Coming soon* |
| macOS (Apple Silicon) | ARM64 | *Coming soon* |
| Linux | x86-64 | *Coming soon* (AppImage/deb/rpm) |
| Linux | ARM64 | *Coming soon* |
| Android | ARM64/ARMv7 | *Coming soon* |
| iOS | ARM64 | *Coming soon* |

**Direct links:**
- [Player-1.0.0-x64.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-x64.exe) — 249 MB

---

## Features

### Media Playback
- **Supported Formats**: MP3, FLAC, WAV, M4A, OGG, AAC, WMA, MP4, MKV, AVI, WEBM
- **Video Playback**: Full video support with visual effects
- **Audio Visualizer**: 3D spectrum analyzer + waveform display
- **10-Band Equalizer**: Graphic EQ with custom presets
- **Audio Effects**: Speed control, reverb, compressor, filters, spatial audio
- **Subtitle Support**: SRT/VTT upload, timeline tracking, click-to-seek
- **Fullscreen Media Mode**: Immersive fullscreen playback with minimal overlay controls

### AI Integration
- **AI Chat**: AI-powered assistant for plugin development
- **AI Security Analysis**: Analyze plugins with AI before installation
- **AI Providers**: OpenRouter, OpenAI, Anthropic, Google, custom endpoints

### Plugin System
- **Plugin Marketplace**: Browse, install, manage plugins
- **Plugin Creation**: AI-assisted plugin development
- **GitHub Publishing**: Publish plugins directly to GitHub
- **Security**: AI-powered security analysis, access level evaluation

### Interface
- **Clean & Modern**: Tailwind CSS, minimal dark design
- **Fully Localized**: Turkish + English UI
- **Dark/Light Theme**: Two theme options
- **Customizable Accent Color**: Choose your highlight color
- **Transparency Setting**: Window transparency slider
- **Mini Mode**: Compact player window
- **Fullscreen Media**: Only media content visible with overlay controls
- **System Tray**: Rich tray menu with categories, volume control, playback actions

### Library Management
- Category-based music library
- Drag-and-drop file adding
- YouTube URL music download (FFmpeg)
- Audio file metadata reading (ID3 tags)
- Loading indicators and instant navigation

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Ctrl+Right/Left | Forward/Backward |
| Ctrl+Up/Down | Volume Up/Down |
| F11 | Mini Mode |
| F | Fullscreen Media |
| L | Subtitle Timeline |
| Escape | Exit fullscreen |
| Delete | Remove track |

---

## Installation

1. Download **Player-1.0.0-x64.exe** from above
2. Run the installer
3. Follow the setup wizard
4. Launch Player

### System Requirements

| Component | Requirement |
|-----------|------------|
| OS | Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+/Fedora 38+) |
| RAM | Minimum 4 GB |
| Storage | 500 MB free space |
| Optional | FFmpeg (YouTube download), Git, Node.js 18+ (development) |

---

## Cross-Platform Build

Player can be built for **Windows**, **macOS**, **Linux**, **Android** and **iOS**.

```bash
# Install dependencies
npm install

# Web build
npm run build-web

# Windows
npm run build                    # NSIS installer (x64 + ia32)

# macOS
npm run build:mac                # DMG + ZIP (x64)
npm run build:mac:arm            # Apple Silicon (ARM64)

# Linux
npm run build:linux              # AppImage + deb + rpm (x64)
npm run build:linux:appimage     # AppImage only

# All desktop platforms
npm run build:all:desktop

# Android
npm run mobile:init              # Install Capacitor deps
npm run mobile:android           # Open in Android Studio

# iOS
npm run mobile:init              # Install Capacitor deps
npm run mobile:ios               # Open in Xcode (macOS required)

# Development (hot reload)
npm run start:dev
```

### Platform Architecture

| Architecture | Windows | macOS | Linux | Android | iOS |
|-------------|---------|-------|-------|---------|-----|
| x86-64 | NSIS | DMG/ZIP | AppImage/deb/rpm | — | — |
| ARM64 | — | DMG/ZIP | AppImage/deb | ✅ | ✅ |
| x86-32 | NSIS | — | — | — | — |

---

## Quick Start

```bash
# Launch the app
# Drag and drop files or use the "Open" button
# Click a song to play
# Customize equalizer and effects
# Extend with plugins
# Create plugins with AI
```

---

## Plugin Development

Detailed guide: [PLUGIN_DEV.md](./PLUGIN_DEV.md)

Player supports JavaScript-based plugins. Plugins can:
- Add new features
- Create new pages
- Change themes/skins
- Integrate APIs

---

## User Guide

Detailed guide: [USER_GUIDE.md](./USER_GUIDE.md)

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Electron 28 | Desktop app framework |
| React 19 | User interface |
| Vite 8 | Build tool |
| Tailwind CSS 4 | Styling |
| Zustand | State management |
| Tone.js | Audio processing (EQ/effects) |
| Three.js | 3D visualizer |
| lunr.js | Local search engine |
| Wavesurfer.js | Waveform display |
| electron-builder | Cross-platform installer (Win/Mac/Linux) |
| Capacitor | Android/iOS mobile wrapper |

---

## Vision

> *"It's a music, video, audio... application with many features like plugins and artificial intelligence. I've adopted a simple interface and user-friendly structure."*

Player started as a simple media player idea. Over time it grew with a plugin system, AI integration, and visual tools. But at its core, it always remained clean and user-friendly.

---

## License

(c) 2026 TARIK ELER - All rights reserved.

---

*Player - Redefine your music experience.*
