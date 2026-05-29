# Player Music Plugin Development Guide

## Overview

Player Music supports custom plugins that can extend functionality. Plugins are JavaScript modules that integrate with the app's core systems.

## Plugin Structure

```
my-plugin/
├── package.json
├── index.js
└── README.md
```

### package.json

```json
{
  "name": "player-plugin-example",
  "version": "1.0.0",
  "description": "Example plugin for Player Music",
  "main": "index.js",
  "keywords": ["player-music", "plugin"],
  "author": "Your Name",
  "license": "MIT"
}
```

### index.js

```javascript
module.exports = {
  name: 'Example Plugin',
  version: '1.0.0',
  
  // Called when plugin is loaded
  activate(context) {
    console.log('Plugin activated');
    
    // Register commands, hooks, etc.
    context.registerCommand('example.hello', () => {
      console.log('Hello from plugin!');
    });
  },
  
  // Called when plugin is unloaded
  deactivate() {
    console.log('Plugin deactivated');
  }
};
```

## Plugin API

### Context Object

The `context` object passed to `activate()` provides access to app functionality:

#### Commands

```javascript
// Register a command
context.registerCommand('plugin.commandName', (args) => {
  // Command logic
});

// Execute a command
context.executeCommand('core.playTrack', { trackId: '123' });
```

#### Events

```javascript
// Listen to events
context.on('track:play', (track) => {
  console.log('Now playing:', track.title);
});

context.on('track:pause', () => {
  console.log('Playback paused');
});

context.on('track:end', () => {
  console.log('Track ended');
});

context.on('library:update', (tracks) => {
  console.log('Library updated:', tracks.length);
});
```

#### Storage

```javascript
// Store plugin data
context.storage.set('myKey', { data: 'value' });

// Retrieve plugin data
const data = context.storage.get('myKey');

// Clear plugin data
context.storage.clear();
```

#### UI Extensions

```javascript
// Add menu item
context.ui.addMenuItem({
  label: 'My Plugin Action',
  action: () => {
    // Action logic
  }
});

// Show notification
context.ui.showNotification({
  title: 'Plugin Notification',
  message: 'Something happened!',
  type: 'info' // 'info', 'success', 'warning', 'error'
});

// Add settings panel
context.ui.addSettingsPanel({
  id: 'my-plugin-settings',
  title: 'My Plugin Settings',
  render: (container) => {
    // Render settings UI
  }
});
```

#### Library Access

```javascript
// Get all tracks
const tracks = context.library.getTracks();

// Get track by ID
const track = context.library.getTrack('track-id');

// Add track
context.library.addTrack({
  title: 'New Track',
  artist: 'Artist Name',
  location: '/path/to/file.mp3'
});

// Update track
context.library.updateTrack('track-id', {
  title: 'Updated Title'
});

// Remove track
context.library.removeTrack('track-id');
```

#### Player Control

```javascript
// Play/pause
context.player.togglePlay();

// Next/previous track
context.player.next();
context.player.previous();

// Seek
context.player.seek(30); // seconds

// Volume
context.player.setVolume(75); // 0-100

// Get current track
const current = context.player.getCurrentTrack();

// Get playback state
const state = context.player.getState();
// { isPlaying, currentTrack, progress, duration, volume }
```

## Example Plugins

### Last.fm Scrobbler

```javascript
module.exports = {
  name: 'Last.fm Scrobbler',
  version: '1.0.0',
  
  activate(context) {
    let scrobbleTimer = null;
    
    context.on('track:play', (track) => {
      // Scrobble after 30 seconds or half the track duration
      const scrobbleTime = Math.min(30000, track.duration * 500);
      
      scrobbleTimer = setTimeout(() => {
        this.scrobble(track);
      }, scrobbleTime);
    });
    
    context.on('track:pause', () => {
      if (scrobbleTimer) {
        clearTimeout(scrobbleTimer);
        scrobbleTimer = null;
      }
    });
  },
  
  async scrobble(track) {
    // Send scrobble to Last.fm API
    const apiKey = this.context.storage.get('lastfm.apiKey');
    const sessionKey = this.context.storage.get('lastfm.sessionKey');
    
    if (!apiKey || !sessionKey) return;
    
    // API call logic here
    console.log('Scrobbled:', track.title);
  },
  
  deactivate() {
    // Cleanup
  }
};
```

### Lyrics Fetcher

```javascript
module.exports = {
  name: 'Lyrics Fetcher',
  version: '1.0.0',
  
  activate(context) {
    this.context = context;
    
    context.registerCommand('lyrics.fetch', async (track) => {
      const lyrics = await this.fetchLyrics(track);
      
      if (lyrics) {
        context.ui.showNotification({
          title: 'Lyrics Found',
          message: `Lyrics for "${track.title}" loaded`,
          type: 'success'
        });
        
        // Store lyrics with track
        context.library.updateTrack(track.id, { lyrics });
      }
    });
    
    // Auto-fetch on track play
    context.on('track:play', (track) => {
      if (!track.lyrics) {
        context.executeCommand('lyrics.fetch', track);
      }
    });
  },
  
  async fetchLyrics(track) {
    // Fetch from lyrics API
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${track.artist}/${track.title}`
    );
    const data = await response.json();
    return data.lyrics;
  },
  
  deactivate() {
    // Cleanup
  }
};
```

### Smart Playlist Generator

```javascript
module.exports = {
  name: 'Smart Playlist',
  version: '1.0.0',
  
  activate(context) {
    this.context = context;
    
    context.ui.addMenuItem({
      label: 'Generate Smart Playlist',
      action: () => this.generatePlaylist()
    });
  },
  
  generatePlaylist() {
    const tracks = this.context.library.getTracks();
    
    // Filter by criteria
    const recentlyAdded = tracks
      .filter(t => Date.now() - t.addedAt < 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 50);
    
    // Create playlist
    this.context.library.createPlaylist({
      name: 'Recently Added',
      tracks: recentlyAdded.map(t => t.id)
    });
    
    this.context.ui.showNotification({
      title: 'Playlist Created',
      message: `Added ${recentlyAdded.length} tracks`,
      type: 'success'
    });
  },
  
  deactivate() {
    // Cleanup
  }
};
```

## Publishing Plugins

### To GitHub

1. Create a GitHub repository
2. Push your plugin code
3. Tag a release: `git tag v1.0.0 && git push --tags`
4. Publish in Player Music settings

### To npm

```bash
npm publish
```

## Plugin Guidelines

1. **Performance**: Keep plugins lightweight, avoid blocking operations
2. **Error Handling**: Always wrap async operations in try-catch
3. **Cleanup**: Properly clean up resources in `deactivate()`
4. **Naming**: Use descriptive names, prefix commands with plugin name
5. **Documentation**: Include README with usage instructions
6. **Testing**: Test with different track types and edge cases

## Security

- Plugins run with full Node.js access
- Only install plugins from trusted sources
- Review plugin code before installation
- Plugins can access file system and network

## Troubleshooting

### Plugin not loading

- Check package.json format
- Verify main entry point exists
- Check console for error messages

### Events not firing

- Ensure event names match exactly
- Check if plugin is activated
- Verify context object is available

### Storage not persisting

- Use context.storage API, not localStorage
- Data is stored per-plugin automatically
- Clear cache if data seems corrupted

## Support

- GitHub Issues: https://github.com/TARIKELER/player-music/issues
- Documentation: https://github.com/TARIKELER/player-music/wiki
- Examples: https://github.com/TARIKELER/player-music-plugins
