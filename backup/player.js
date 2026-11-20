// Audio player functionality
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressBarFill = document.getElementById('progressBarFill');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.durationDisplay = document.getElementById('duration');
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.playlistContainer = document.getElementById('playlistContainer');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.mutedIcon = document.getElementById('mutedIcon');

        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;

        this.init();
    }

    init() {
        this.loadPlaylist();
        this.attachEventListeners();
        this.setVolume(70);
    }

    loadPlaylist() {
        // Define your playlist here. Add MP3 files to the media folder and list them here
        // Example format:
        // { title: 'Song Title', file: 'media/song.mp3' }
        this.playlist = [
            // Add your tracks here, for example:
            // { title: 'Track 1', file: 'media/track1.mp3' },
            // { title: 'Track 2', file: 'media/track2.mp3' },
             { title: '01. I Like it that Way', file: 'media/01. I Like it that Way.mp3' },
             { title: '02. Chance to Dance', file: 'media/02. Chance to Dance.mp3' },
             { title: '03. She Don\'t (Give a Damn About Me)', file: 'media/03. She Don\'t (Give a Damn About Me).mp3' },
             { title: '04. Rainbow', file: 'media/04. Rainbow.mp3' },
             { title: '05. Falling Through (Glass Ceilings)', file: 'media/05. Falling Through (Glass Ceilings).mp3' },
             { title: '06. For Country', file: 'media/06. For Country.mp3' },
             { title: '07.  Another Pretty Gun (To Start A War)', file: 'media/07.  Another Pretty Gun (To Start A War).mp3' },
             { title: '08. Between the Lines', file: 'media/08. Between the Lines.mp3' },
             { title: '09. Tennessee Pearl', file: 'media/09. Tennessee Pearl.mp3' },
             { title: '10. Between The Lines (Reprise)', file: 'media/10. Between The Lines (Reprise).mp3' }
        ];

        if (this.playlist.length > 0) {
            this.renderPlaylist();
            this.loadTrack(0);
        }
    }

    renderPlaylist() {
        if (this.playlist.length === 0) {
            return;
        }

        this.playlistContainer.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
            }

            item.innerHTML = `
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${track.title}</div>
                </div>
            `;

            item.addEventListener('click', () => {
                this.loadTrack(index);
                this.play();
            });

            this.playlistContainer.appendChild(item);
        });
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) {
            return;
        }

        this.currentTrackIndex = index;
        const track = this.playlist[index];

        this.audio.src = track.file;
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = 'Between the Lines';

        this.updatePlaylistUI();
    }

    updatePlaylistUI() {
        const items = this.playlistContainer.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    play() {
        if (this.playlist.length === 0) {
            return;
        }

        this.audio.play();
        this.isPlaying = true;
        this.playIcon.style.display = 'none';
        this.pauseIcon.style.display = 'block';
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playIcon.style.display = 'block';
        this.pauseIcon.style.display = 'none';
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    previousTrack() {
        let newIndex = this.currentTrackIndex - 1;
        if (newIndex < 0) {
            newIndex = this.playlist.length - 1;
        }
        this.loadTrack(newIndex);
        if (this.isPlaying) {
            this.play();
        }
    }

    nextTrack() {
        let newIndex = this.currentTrackIndex + 1;
        if (newIndex >= this.playlist.length) {
            newIndex = 0;
        }
        this.loadTrack(newIndex);
        if (this.isPlaying) {
            this.play();
        }
    }

    updateProgress() {
        if (!this.audio.duration || isNaN(this.audio.duration)) {
            return;
        }
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.value = percent;
        this.progressBarFill.style.width = percent + '%';
        this.currentTimeDisplay.textContent = this.formatTime(this.audio.currentTime);
    }

    setProgress(e) {
        if (!this.audio.duration || isNaN(this.audio.duration)) {
            return;
        }
        const percent = e.target.value;
        this.audio.currentTime = (percent / 100) * this.audio.duration;
    }

    setVolume(volume) {
        this.audio.volume = volume / 100;
        this.volumeSlider.value = volume;
        this.updateVolumeIcon(volume);
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            this.volumeSlider.value = 0;
            this.updateVolumeIcon(0);
        } else {
            this.setVolume(70);
        }
    }

    updateVolumeIcon(volume) {
        if (volume === 0) {
            this.volumeIcon.style.display = 'none';
            this.mutedIcon.style.display = 'block';
        } else {
            this.volumeIcon.style.display = 'block';
            this.mutedIcon.style.display = 'none';
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) {
            return '0:00';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    attachEventListeners() {
        // Play/Pause button
        this.playBtn.addEventListener('click', () => this.togglePlay());

        // Previous button
        this.prevBtn.addEventListener('click', () => this.previousTrack());

        // Next button
        this.nextBtn.addEventListener('click', () => this.nextTrack());

        // Progress bar
        this.progressBar.addEventListener('input', (e) => this.setProgress(e));

        // Volume controls
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        // Audio element events
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.durationDisplay.textContent = this.formatTime(this.audio.duration);
        });

        this.audio.addEventListener('ended', () => {
            this.nextTrack();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlay();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                this.previousTrack();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                this.nextTrack();
            }
        });
    }
}

// Initialize player when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
