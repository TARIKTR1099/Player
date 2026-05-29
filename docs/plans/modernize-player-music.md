---
plan name: modernize-player-music
plan description: Rebuild Player-Music with React+Tailwind and enhanced features.
plan status: done
---

## Idea
The current Electron app uses vanilla JS and has performance/UI issues. I will refactor it to use a modern React stack, implement the 'Move/Copy' logic with user preference, add a robust YouTube/Web search & download system, and ensure smooth transitions.

## Implementation
- Scaffold React + Tailwind environment within the Electron project.
- Implement a shared Settings store (Redux/Zustand) supporting Theme, Language (TR/EN), and File Management (Delete original after move) preferences.
- Redesign the UI: Modern sidebar, glassmorphism player controls, responsive library grid/list.
- Refactor Main process: Add file system operations for moving/copying music with user prompts.
- Enhance Search/Downloader: Integrated yt-dlp search and download manager with progress tracking.
- Optimize Playback: Ensure gapless/smooth transitions and fix playlist separation bugs.
- Build and package: Generate PlayerSetup.exe.

## Required Specs
<!-- SPECS_START -->
<!-- SPECS_END -->