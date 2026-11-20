# Between the Lines Player Plan

## Approach

Create a standalone, static HTML5 player in `player/` using semantic markup, local CSS, vanilla JavaScript, and an explicit playlist. Keep the existing root player and CrimsonKing reference pages unchanged. The verified album order is taken from the root `player.js` and checked against the ten MP3 files in `media/`.

## Files

- `plan/plan_v1.md` — this implementation plan.
- `player/player_v1.html` — accessible player page and player structure.
- `player/player_v1.css` — responsive player layout using the existing HBO design-system tokens and components.
- `player/player_v1.js` — verified playlist manifest, audio controls, and the existing design system’s theme/variant controls.

## Playlist and paths

Use the ten existing media filenames in album order: `01. I Like it that Way.mp3`, `02. Chance to Dance.mp3`, `03. She Don't (Give a Damn About Me).mp3`, `04. Rainbow.mp3`, `05. Falling Through (Glass Ceilings).mp3`, `06. For Country.mp3`, `07.  Another Pretty Gun (To Start A War).mp3`, `08. Between the Lines.mp3`, `09. Tennessee Pearl.mp3`, and `10. Between The Lines (Reprise).mp3`. Store filenames, not prebuilt absolute URLs, in the manifest; encode each filename as a path segment and prefix it with `../media/`. This remains relative to the nested page and works beneath a GitHub Pages project path without directory enumeration or a server.

## Experience and behavior

Use a professional, music-focused layout with the “Between the Lines” identity, artist attribution, track details, transport controls, progress/time display, volume/mute controls, and a selectable playlist; do not use a record-player illustration. Load the repository’s existing `newsite/css/fonts.css`, `tokens.css`, and `hbo.css`, plus its Phosphor icon styles. Use the existing fourteen theme swatches and light/dark variant toggle so the supplied tokens control the player’s palette, typography, surfaces, and background gradients; keep `player_v1.css` focused on responsive player layout.

Reflow the player for phone, tablet, and desktop widths down to 320 CSS pixels; wrap long track titles, avoid horizontal overflow, and use touch-sized controls. Provide visible focus, hover/pressed/disabled/loading/error states, sufficient contrast, and reduced-motion support. Use native buttons and labeled ranges, semantic playlist/list markup, live status feedback, and programmatic selected/playing state; do not autoplay.

Synchronize the play/pause state with audio events and handle rejected play requests, media errors, invalid timing data, and an empty playlist. Support selecting, seeking, volume/mute, previous/next with wraparound, and automatic next-track advancement at end of track. Clear progress and duration on track changes and keep error status understandable. Preserve the existing copyright notice’s meaning and attribution.

## Validation

- Verify each manifest filename exactly matches a real MP3 and confirm encoded `../media/` paths resolve relative to `player/player_v1.html`.
- Check the relative `newsite/` stylesheet/font/icon paths, page references, JavaScript syntax, and the HTML through a local static HTTP server; confirm no build/dependency/server requirement is introduced.
- Exercise selection, play/pause, previous/next wraparound, seeking, volume/mute, metadata/progress, end advancement, load/play failures, and empty-playlist behavior.
- Exercise all supplied theme swatches and the light/dark toggle; inspect keyboard/focus and accessible names/status/selected states; check narrow (including 320px) and wide layouts, reduced motion, and absence of horizontal overflow.
- Confirm nested relative URLs remain project-path-safe for GitHub Pages and that only this plan and files under `player/` are added for the implementation.
