# Implementation Prompt: Between the Lines Web Audio Player

You are working in the root of the existing `hannahbellesheart/betweenthelines` repository. Inspect the repository before making changes, then plan and implement a polished, responsive, accessible HTML5 audio player for the existing MP3 collection.

## Objectives

1. Create a concise but comprehensive implementation plan at exactly `plan/plan_v1.md`.
2. Build the new player as a separate page at `player/player_v1.html`, with any required CSS or vanilla JavaScript files kept inside `player/`.
3. Use the existing audio files in the root-level `media/` directory. The result must work as a static site on GitHub Pages without a server, build step, framework, package, or external runtime dependency.

Work through the plan and complete the implementation in this task. The plan is a deliverable, not a substitute for the working player.

## Inspect Before Editing

- Review the current root `index.html`, `styles.css`, and `player.js` to understand existing content, player behavior, track names, and the copyright notice.
- Review `newsite/file-manager.html`, `newsite/project-management.html`, and the related styles/tokens in `newsite/css/` for the intended visual direction. The reference pages use a dark CrimsonKing theme: near-black/burgundy backgrounds, red and orange accents, pale primary text, muted rose secondary text, fine borders, compact spacing, and condensed display typography.
- Inspect the actual contents of `media/` and verify the MP3 filenames before listing or linking tracks. Do not rely on assumptions about filenames.
- Treat pre-existing and untracked files as user-owned. Do not overwrite, delete, rename, or reformat unrelated files, and do not modify the existing root player as part of this separate-page implementation.

## Plan Requirements

Write the plan first, at `plan/plan_v1.md`. It must be the only planning document created for this task; do not create alternate plan files, notes, or checklists elsewhere. Include:

- A brief summary of the approach and the relevant existing files/assets.
- The proposed file layout, including the page and any supporting player files.
- The static-hosting-safe track-list and asset-path strategy.
- The intended visual, responsive, accessibility, and playback behavior.
- A focused validation checklist covering functionality, asset paths, accessibility, responsive layouts, and GitHub Pages deployment.

Keep the plan specific to the repository and consistent with the implementation. Do not put source code in the plan.

## Player Requirements

### Structure and compatibility

- Create `player/player_v1.html` and any necessary supporting files under `player/`. Do not place new player implementation files at the repository root.
- Use semantic HTML, modern CSS, and standards-based vanilla ES6+ JavaScript. No frameworks, libraries, servers, directory-listing endpoints, or build tools.
- Use relative URLs that work when the repository is hosted beneath a GitHub Pages project path. Because the page is in `player/` and the audio is in root-level `media/`, resolve audio paths from the player page to `../media/` and correctly handle spaces, apostrophes, punctuation, and other characters in filenames.
- GitHub Pages does not provide a dependable way for browser JavaScript to enumerate a directory. Use an explicit, verified playlist manifest based on the actual MP3 files in `media/`; do not attempt to discover tracks with a directory fetch or hard-code a GitHub-specific absolute URL.
- Keep the new page independent of the existing root `index.html`, `styles.css`, and `player.js`. Do not modify those files, the `newsite/` theme files, or repository configuration.

### Visual design and responsive behavior

- Create a cohesive music-player interface inspired by the referenced CrimsonKing design, not an administrative dashboard clone. Use a dark burgundy/near-black foundation, restrained red/orange highlights, readable pale text, subtle panel borders, and typography/spacing consistent with the theme.
- Prefer local, self-contained styles and CSS variables. Do not link to `newsite/` resources using paths that would break from `player/`, and do not copy unnecessary dashboard markup, scripts, or dependencies.
- Present the artist/album identity, current track information, prominent playback controls, seek/progress and time display, volume/mute controls, and a clear, selectable playlist. Retain the existing “Between the Lines” identity and the meaning of the existing copyright notice; do not invent new ownership claims or alter the original page.
- Make the layout usable on narrow phones, tablets, and desktop screens, including at a 320 CSS-pixel viewport. Prevent horizontal overflow, allow long track names to wrap or truncate accessibly, provide touch-friendly controls, and keep essential controls visible and operable.
- Include sensible hover, pressed, active, focus-visible, disabled, and loading/error states. Respect `prefers-reduced-motion`.

### Audio and playlist behavior

- Load the available MP3 tracks from `media/` in the intended album order, using verified filenames and clear display titles. Do not rename or move the audio files.
- Support selecting a playlist item, play/pause, previous/next, seeking, current time and duration, volume adjustment, mute/unmute, and automatic advancement when a track ends.
- Preserve the current player's wraparound previous/next and end-of-track advancement behavior unless the inspected implementation demonstrates a necessary correction. Keep displayed playback state synchronized with the audio element's actual events rather than assuming playback succeeded.
- Handle an empty playlist, unsupported/unavailable audio, load failures, and rejected `audio.play()` promises with an understandable user-facing status. Do not leave controls or status indicators implying playback is active after a failure.
- Ensure track changes reset or refresh progress and duration correctly, and guard against invalid duration/time values. Format time consistently as minutes and seconds.
- Provide keyboard-accessible native controls and clear accessible names. If adding document-level keyboard shortcuts, do not intercept Space or arrow keys while the user is typing in an input, using a button, or otherwise interacting with a control.

### Accessibility

- Use semantic headings, buttons, list/playlist structure, labels, and status messaging. Give icon-only buttons accessible names and expose the selected/playing track state to assistive technology.
- Ensure all functions work with a keyboard, focus is visible, text and control contrast are sufficient, and range controls have meaningful labels and values.
- Avoid communicating playback, selection, errors, or volume state by color or icon alone. Do not autoplay audio.

## Validation and Completion

After implementation:

1. Confirm the only planned deliverable is `plan/plan_v1.md` and the new player page is `player/player_v1.html`; any implementation support files must be limited to `player/`.
2. Check every playlist entry against a real MP3 in `media/`, including filenames with spaces or punctuation, and verify paths resolve relative to the nested player page.
3. Run any relevant existing repository checks if available. Also inspect the page for broken local references and test it through a local static HTTP server when feasible; do not treat opening it only as a `file://` URL as sufficient verification.
4. Manually verify the main controls, track changes, end-of-track behavior, audio error state, keyboard operation, narrow and wide layouts, and the page's operation beneath a GitHub Pages project path.
5. Do not add a build system, dependencies, unrelated documentation, or unrelated changes. Report the created files, the checks performed, and any remaining limitations clearly.
