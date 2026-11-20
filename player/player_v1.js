const tracks = [
  { title: "01. I Like it that Way", file: "01. I Like it that Way.mp3" },
  { title: "02. Chance to Dance", file: "02. Chance to Dance.mp3" },
  { title: "03. She Don't (Give a Damn About Me)", file: "03. She Don't (Give a Damn About Me).mp3" },
  { title: "04. Rainbow", file: "04. Rainbow.mp3" },
  { title: "05. Falling Through (Glass Ceilings)", file: "05. Falling Through (Glass Ceilings).mp3" },
  { title: "06. For Country", file: "06. For Country.mp3" },
  { title: "07. Another Pretty Gun (To Start A War)", file: "07.  Another Pretty Gun (To Start A War).mp3" },
  { title: "08. Between the Lines", file: "08. Between the Lines.mp3" },
  { title: "09. Tennessee Pearl", file: "09. Tennessee Pearl.mp3" },
  { title: "10. Between The Lines (Reprise)", file: "10. Between The Lines (Reprise).mp3" }
];

class AlbumPlayer {
  constructor() {
    this.audio = document.getElementById("audio");
    this.title = document.getElementById("track-title");
    this.playbackLabel = document.getElementById("playback-label");
    this.playlist = document.getElementById("playlist");
    this.status = document.getElementById("player-status");
    this.seek = document.getElementById("seek");
    this.currentTime = document.getElementById("current-time");
    this.duration = document.getElementById("duration");
    this.playButton = document.getElementById("play");
    this.previousButton = document.getElementById("previous");
    this.nextButton = document.getElementById("next");
    this.playIcon = document.getElementById("play-icon");
    this.pauseIcon = document.getElementById("pause-icon");
    this.volume = document.getElementById("volume");
    this.muteButton = document.getElementById("mute");
    this.volumeIcon = document.getElementById("volume-icon");
    this.mutedIcon = document.getElementById("muted-icon");
    this.trackCount = document.getElementById("track-count");
    this.themeButtons = Array.from(document.querySelectorAll("[data-theme-id]"));
    this.variantToggle = document.getElementById("variant-toggle");
    this.currentIndex = -1;
    this.previousVolume = 0.7;
    this.playRequest = 0;
    this.currentSource = "";

    this.bindEvents();
    this.updateAppearanceControls();
    this.renderPlaylist();

    if (tracks.length === 0) {
      this.setControlsEnabled(false);
      this.setStatus("No tracks are available in the playlist.");
      return;
    }

    this.setControlsEnabled(true);
    this.audio.volume = 0.7;
    this.updateVolumeControls();
    this.loadTrack(0, false);

    if (!this.audio.canPlayType || this.audio.canPlayType("audio/mpeg") === "") {
      this.setStatus("Your browser may not support MP3 audio playback.", "error");
    }
  }

  bindEvents() {
    this.playButton.addEventListener("click", () => this.togglePlayback());
    this.previousButton.addEventListener("click", () => this.moveTrack(-1));
    this.nextButton.addEventListener("click", () => this.moveTrack(1));
    this.muteButton.addEventListener("click", () => this.toggleMute());
    this.seek.addEventListener("input", () => this.seekToPosition());
    this.volume.addEventListener("input", () => this.setVolume(Number(this.volume.value)));
    this.themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        document.documentElement.dataset.theme = button.dataset.themeId;
        this.updateAppearanceControls();
      });
    });
    this.variantToggle.addEventListener("click", () => {
      const root = document.documentElement;
      root.dataset.variant = root.dataset.variant === "light" ? "dark" : "light";
      this.updateAppearanceControls();
    });

    this.audio.addEventListener("play", () => this.updatePlaybackControls());
    this.audio.addEventListener("playing", () => {
      this.updatePlaybackControls();
      this.setStatus(`Now playing: ${tracks[this.currentIndex].title}`);
    });
    this.audio.addEventListener("pause", () => this.updatePlaybackControls());
    this.audio.addEventListener("waiting", () => {
      this.updatePlaybackControls();
      if (!this.audio.paused) this.setStatus("Buffering audio…");
    });
    this.audio.addEventListener("loadedmetadata", () => {
      this.updateProgress();
      if (this.audio.paused) this.setStatus(`Ready to play: ${tracks[this.currentIndex].title}`);
    });
    this.audio.addEventListener("durationchange", () => this.updateProgress());
    this.audio.addEventListener("timeupdate", () => this.updateProgress());
    this.audio.addEventListener("volumechange", () => this.updateVolumeControls());
    this.audio.addEventListener("ended", () => this.moveTrack(1, true));
    this.audio.addEventListener("error", () => this.handleMediaError());
  }

  updateAppearanceControls() {
    const root = document.documentElement;
    this.themeButtons.forEach((button) => {
      const active = button.dataset.themeId === root.dataset.theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const isLight = root.dataset.variant === "light";
    this.variantToggle.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
    this.variantToggle.setAttribute("aria-pressed", String(isLight));
  }

  renderPlaylist() {
    this.trackCount.textContent = `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`;

    if (tracks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-playlist";
      empty.textContent = "No tracks are available. Add MP3 files to the media folder.";
      this.playlist.append(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    tracks.forEach((track, index) => {
      const item = document.createElement("li");
      item.className = "playlist-item";

      const button = document.createElement("button");
      button.className = "track-button";
      button.type = "button";
      button.dataset.trackIndex = String(index);
      button.addEventListener("click", () => this.loadTrack(index, true));

      const number = document.createElement("span");
      number.className = "track-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(index + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "track-name";
      name.textContent = track.title;

      const state = document.createElement("span");
      state.className = "track-state";

      button.append(number, name, state);
      item.append(button);
      fragment.append(item);
    });

    this.playlist.replaceChildren(fragment);
  }

  setControlsEnabled(enabled) {
    [
      this.playButton,
      this.previousButton,
      this.nextButton,
      this.muteButton,
      this.seek,
      this.volume
    ].forEach((control) => {
      control.disabled = !enabled;
    });
  }

  loadTrack(index, shouldPlay) {
    if (tracks.length === 0 || !Number.isInteger(index) || index < 0 || index >= tracks.length) {
      return;
    }

    this.playRequest += 1;
    this.audio.pause();
    this.currentIndex = index;
    const track = tracks[index];
    this.title.textContent = track.title;
    this.resetProgress();
    this.updatePlaylistState();
    this.currentSource = new URL(`../media/${encodeURIComponent(track.file)}`, document.baseURI).href;
    this.audio.src = `../media/${encodeURIComponent(track.file)}`;
    this.audio.load();
    this.setStatus(`Loading: ${track.title}`);

    if (shouldPlay) this.startPlayback();
  }

  moveTrack(direction, shouldPlay = !this.audio.paused) {
    if (tracks.length === 0) {
      this.setStatus("No tracks are available in the playlist.", "error");
      return;
    }

    const nextIndex = (this.currentIndex + direction + tracks.length) % tracks.length;
    this.loadTrack(nextIndex, shouldPlay);
  }

  togglePlayback() {
    if (tracks.length === 0) {
      this.setStatus("No tracks are available in the playlist.", "error");
      return;
    }

    if (this.audio.paused) {
      this.startPlayback();
    } else {
      this.playRequest += 1;
      this.audio.pause();
      this.setStatus(`Paused: ${tracks[this.currentIndex].title}`);
    }
  }

  startPlayback() {
    if (tracks.length === 0 || this.currentIndex < 0) return;

    const request = ++this.playRequest;
    this.setStatus(`Loading: ${tracks[this.currentIndex].title}`);
    const result = this.audio.play();

    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        if (request !== this.playRequest) return;
        this.updatePlaybackControls();
        const message = error && error.name === "NotAllowedError"
          ? "Playback was blocked by the browser. Press Play to try again."
          : `Unable to play “${tracks[this.currentIndex].title}”. Check that the audio file is available.`;
        this.setStatus(message, "error");
      });
    }
  }

  seekToPosition() {
    const duration = this.getDuration();
    const position = Number(this.seek.value);
    if (duration <= 0 || !Number.isFinite(position)) return;

    this.audio.currentTime = Math.min(duration, Math.max(0, position));
    this.updateProgress();
  }

  updateProgress() {
    const duration = this.getDuration();
    const current = Number.isFinite(this.audio.currentTime) && this.audio.currentTime > 0
      ? this.audio.currentTime
      : 0;

    this.currentTime.textContent = this.formatTime(current);
    this.duration.textContent = this.formatTime(duration);
    this.seek.max = String(duration);
    this.seek.value = String(duration > 0 ? Math.min(current, duration) : 0);
    this.seek.disabled = duration <= 0 || tracks.length === 0;
    this.seek.style.setProperty("--fill", `${duration > 0 ? Math.min(current / duration, 1) * 100 : 0}%`);
    this.seek.setAttribute("aria-valuetext", `${this.formatTime(current)} of ${this.formatTime(duration)}`);
  }

  resetProgress() {
    this.currentTime.textContent = "0:00";
    this.duration.textContent = "0:00";
    this.seek.max = "0";
    this.seek.value = "0";
    this.seek.disabled = true;
    this.seek.style.setProperty("--fill", "0%");
    this.seek.setAttribute("aria-valuetext", "0:00");
  }

  getDuration() {
    return Number.isFinite(this.audio.duration) && this.audio.duration > 0
      ? this.audio.duration
      : 0;
  }

  setVolume(value) {
    const volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.7;
    this.audio.volume = volume;
    this.audio.muted = false;
    if (volume > 0) this.previousVolume = volume;
    this.updateVolumeControls();
  }

  toggleMute() {
    if (this.audio.muted || this.audio.volume === 0) {
      this.audio.muted = false;
      if (this.audio.volume === 0) this.audio.volume = this.previousVolume || 0.7;
    } else {
      this.previousVolume = this.audio.volume;
      this.audio.muted = true;
    }
    this.updateVolumeControls();
  }

  updateVolumeControls() {
    const muted = this.audio.muted || this.audio.volume === 0;
    this.volume.value = String(this.audio.volume);
    this.volume.style.setProperty("--fill", `${this.audio.volume * 100}%`);
    this.volume.setAttribute("aria-valuetext", muted ? "Muted" : `${Math.round(this.audio.volume * 100)}%`);
    this.muteButton.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    this.muteButton.setAttribute("aria-pressed", String(muted));
    this.volumeIcon.hidden = muted;
    this.mutedIcon.hidden = !muted;
  }

  updatePlaybackControls() {
    const playing = !this.audio.paused && !this.audio.ended;
    this.playIcon.hidden = playing;
    this.pauseIcon.hidden = !playing;
    this.playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.playbackLabel.textContent = playing ? "Now playing" : "Selected track";
    this.updatePlaylistState();
  }

  updatePlaylistState() {
    this.playlist.querySelectorAll(".track-button").forEach((button) => {
      const index = Number(button.dataset.trackIndex);
      const selected = index === this.currentIndex;
      const playing = selected && !this.audio.paused && !this.audio.ended;
      const track = tracks[index];
      const state = button.querySelector(".track-state");

      if (selected) {
        button.setAttribute("aria-current", "true");
        button.setAttribute("aria-label", `${track.title}, ${playing ? "now playing" : "selected"}`);
        state.textContent = playing ? "Now playing" : "Selected";
      } else {
        button.removeAttribute("aria-current");
        button.setAttribute("aria-label", `Play ${track.title}`);
        state.textContent = "";
      }
    });
  }

  handleMediaError() {
    if (this.audio.currentSrc && this.audio.currentSrc !== this.currentSource) return;

    const code = this.audio.error ? this.audio.error.code : 0;
    const messages = {
      1: "Audio loading was interrupted.",
      2: "A network error stopped the audio from loading.",
      3: "This audio file could not be decoded.",
      4: "This browser cannot play this audio format."
    };
    const detail = messages[code] || "The audio file could not be loaded.";

    this.audio.pause();
    this.resetProgress();
    this.updatePlaybackControls();
    this.setStatus(`${detail} Check that the selected MP3 exists in the media folder.`, "error");
  }

  setStatus(message, state = "") {
    this.status.textContent = message;
    if (state) {
      this.status.dataset.state = state;
    } else {
      delete this.status.dataset.state;
    }
  }

  formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const wholeSeconds = Math.floor(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    const remainder = String(wholeSeconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new AlbumPlayer();
});
