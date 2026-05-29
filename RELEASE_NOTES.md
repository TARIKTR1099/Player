# Player 1.0.0 - Release Notes

## Downloads

| Platform | Architecture | Download |
|----------|-------------|----------|
| Windows | x86-64 | [Player-1.0.0-x64.exe](https://github.com/TARIKTR1099/Player/releases/download/v1.0.0/Player-1.0.0-x64.exe) |

## What's New

### New Features
- **Fullscreen Media Mode**: Immersive playback with album art/video filling the screen, minimal overlay controls, auto-hiding UI
- **Subtitle Timeline**: Load SRT/VTT files, view cues on a timeline, click to seek, auto-scroll to active cue
- **System Tray**: Rich menu with emoji icons - playback controls, volume submenu, navigation, categories, tools
- **Tray IPC**: Tray actions communicate with the app in real-time (play/pause, shuffle, repeat, volume, navigate)
- **Cross-Platform Build**: macOS (DMG), Linux (AppImage/deb/rpm), Android (Capacitor), iOS (Capacitor) configs ready
- **Platform Abstraction**: `src/platform/` layer for native menus, tray, window frame per OS
- **New App Icon**: Updated blue play button icon across all surfaces (taskbar, tray, installer, sidebar)

### Improvements
- Home page album art: blurred background atmosphere with clean foreground art
- Bottom bar: fullscreen button directly visible (not hidden in menu)
- Library: instant loading with spinner indicator
- Volume popup: cleaner (no label text), right-aligned to prevent overflow
- EQ sliders: vertical orientation (writing-mode: vertical-lr)
- Category dropdown: smart sizing (shrinks when new category input opens)
- Sidebar: app icon next to PLAYER text
- Settings Account: improved Google OAuth flow with credential guide

### Bug Fixes
- Fixed app crash when icon path was undefined in BrowserWindow
- Fixed EQ slider CSS (writing-mode: bt-lr -> vertical-lr)
- Fixed three-dot menu showing track name instead of "Copy Name"
- Removed duplicate play button from top overlay
- Fixed fullscreen mode conflicts with window controls

### Tech
- React 19 + Vite 8 + Tailwind CSS 4
- Zustand state management
- Electron 28 with electron-builder
- Capacitor 7 for mobile
- Tone.js audio processing
- Three.js 3D visualizer
- SRT/VTT subtitle parser

## Known Issues
- macOS, Linux, Android, iOS builds not yet published (coming soon)
- Drag-and-drop to playlist from file system needs IPC handler
- Language system (auto-detect locale, importable language packs) planned

## Links
- [Documentation](https://github.com/TARIKTR1099/Player/blob/main/README.md)
- [User Guide](https://github.com/TARIKTR1099/Player/blob/main/USER_GUIDE.md)
- [Plugin Development](https://github.com/TARIKTR1099/Player/blob/main/PLUGIN_DEV.md)
