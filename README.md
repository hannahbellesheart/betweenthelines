# Between the Lines

My album - A static music player website featuring an HTML5 mp3 player with sleek UI.
[Between the Lines by Hannahbelle Ottone](https://hannahbellesheart.github.io/betweenthelines)


## Features

- 🎵 HTML5 audio player with intuitive controls
- 🎨 Sleek, modern UI with gradient design
- 📱 Responsive design (works on mobile and desktop)
- ⚖️ Prominent copyright notice protecting YOUR music as proprietary property
- 🎹 Keyboard controls (Space: play/pause, Arrow keys: prev/next)
- 🔊 Volume controls with mute function
- 📋 Playlist support

## How to Use

1. Add your MP3 files to the `media` folder
2. Edit `player.js` and add your tracks to the playlist array (around line 37):

```javascript
this.playlist = [
    { title: 'Track 1', file: 'media/track1.mp3' },
    { title: 'Track 2', file: 'media/track2.mp3' },
    // Add more tracks...
];
```

3. Deploy to GitHub Pages or any static hosting service

## GitHub Pages Deployment

This site is ready to deploy to GitHub Pages:

1. Push your changes to the repository
2. Go to repository Settings → Pages
3. Select the branch you want to deploy (e.g., `main` or your feature branch)
4. Select `/ (root)` as the source folder
5. Click Save

Your music player will be live at: `https://[username].github.io/[repository-name]/`

## Copyright Notice

The player includes a prominent copyright notice stating that all music works in the "Between the Lines" album are YOUR exclusive proprietary property. This notice appears both:
- At the top of the player interface with emphasized text
- In the footer of the page

**All music files you add remain YOUR exclusive property and will ALWAYS remain YOUR property.**

## Technical Details

- **HTML5** native audio element for maximum compatibility
- **Vanilla JavaScript** - no dependencies or frameworks required
- **Pure CSS3** with modern gradients and smooth animations
- **No build process** - works immediately on any static hosting
- **Fully responsive** - adapts to any screen size
- **Keyboard accessible** - full keyboard navigation support
