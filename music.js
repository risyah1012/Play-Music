// ============================================================
//  RISYAH MUSIC · PLAYER
// ============================================================

// ===================== STATE =====================
let playlist = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isDragging = false;
let isShuffle = false;
let isRepeat = false;
let currentUser = 'User';

// DOM
const playlistContainer = document.getElementById('playlist-container');
const currentSongEl = document.getElementById('current-song');
const currentArtistEl = document.getElementById('current-artist');
const totalSongsEl = document.getElementById('total-songs');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplay = document.getElementById('userDisplay');
const songTitleInput = document.getElementById('songTitle');
const songArtistInput = document.getElementById('songArtist');
const songFileInput = document.getElementById('songFile');
const fileBtn = document.getElementById('fileBtn');
const fileNameEl = document.getElementById('fileName');
const progressBar = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const volumeControl = document.getElementById('volume');
const audio = document.getElementById('audioPlayer');
const notification = document.getElementById('notification');

let selectedFile = null;
let isBeepPlaying = false;
let beepInterval = null;

// ===================== LOCALSTORAGE =====================
const STORAGE_KEY = 'risyah_playlist_data';
const USER_KEY = 'risyah_user';

// ===================== SESSION & AUTH =====================
function checkSession() {
    try {
        const saved = localStorage.getItem(USER_KEY);
        if (!saved) {
            window.location.href = 'index.html';
            return false;
        }
        const data = JSON.parse(saved);
        if (!data.loggedIn) {
            window.location.href = 'index.html';
            return false;
        }
        currentUser = data.username || 'User';
        userDisplay.textContent = `👤 ${currentUser}`;
        return true;
    } catch (e) {
        window.location.href = 'index.html';
        return false;
    }
}

// ===================== LOCALSTORAGE DATA =====================
function saveToLocalStorage() {
    try {
        const data = {
            playlist: playlist.map(s => ({
                title: s.title,
                artist: s.artist,
                hasFile: s.file !== null,
                fileName: s.fileName || null
            })),
            currentTrackIndex: currentTrackIndex,
            isShuffle: isShuffle,
            isRepeat: isRepeat
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log('[SAVE] Data tersimpan');
    } catch (e) {
        console.log('[ERROR] Gagal simpan:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        playlist = data.playlist.map(s => ({
            title: s.title,
            artist: s.artist,
            file: null,
            fileName: s.fileName || null
        }));
        if (data.currentTrackIndex !== undefined && data.currentTrackIndex < playlist.length) {
            currentTrackIndex = data.currentTrackIndex;
        } else {
            currentTrackIndex = 0;
        }
        if (data.isShuffle !== undefined) isShuffle = data.isShuffle;
        if (data.isRepeat !== undefined) isRepeat = data.isRepeat;
        console.log('[LOAD] Data dimuat, total:', playlist.length);
        return true;
    } catch (e) {
        console.log('[ERROR] Gagal load:', e);
        return false;
    }
}

// ===================== NOTIF =====================
function showNotification(message, type = 'info', duration = 3000) {
    notification.className = 'notification';
    if (type) notification.classList.add(type);
    notification.textContent = message;
    notification.classList.remove('hidden');

    clearTimeout(notification._timer);
    notification._timer = setTimeout(() => {
        notification.classList.add('hidden');
    }, duration);
}

// ===================== HELPERS =====================
function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================== RENDER =====================
function renderPlaylist() {
    if (playlist.length === 0) {
        playlistContainer.innerHTML = '<div style="color:#6a5a7a;text-align:center;padding:20px;">✨ Playlist kosong</div>';
        return;
    }
    let html = '';
    playlist.forEach((song, index) => {
        const active = index === currentTrackIndex ? 'active' : '';
        const badge = active ? '<span class="song-badge">▶ NOW</span>' : '';
        const fileIcon = song.file ? '📁' : '';
        html += `
            <div class="song-item ${active}" onclick="playAt(${index})">
                <div class="song-info">
                    <span class="song-index">${index + 1}</span>
                    <span class="song-title">${escapeHtml(song.title)}</span>
                    <span class="song-artist">- ${escapeHtml(song.artist)}</span>
                    ${badge}
                </div>
                <div>
                    <span class="song-has-file">${fileIcon}</span>
                    <button class="btn-delete" onclick="event.stopPropagation();deleteSong(${index})" title="Hapus">✕</button>
                </div>
            </div>
        `;
    });
    playlistContainer.innerHTML = html;
    updateTotalSongs();
}

function updateTotalSongs() {
    totalSongsEl.textContent = playlist.length;
}

function updateNowPlaying() {
    if (playlist.length === 0 || currentTrackIndex >= playlist.length) {
        currentSongEl.textContent = '-';
        currentArtistEl.textContent = '-';
        return;
    }
    const song = playlist[currentTrackIndex];
    currentSongEl.textContent = song.title;
    currentArtistEl.textContent = song.artist;
}

// ===================== PLAYBACK =====================
function playCurrent() {
    if (playlist.length === 0 || currentTrackIndex >= playlist.length) {
        showNotification('Playlist kosong', 'warning');
        return;
    }
    const song = playlist[currentTrackIndex];
    currentSongEl.textContent = song.title;
    currentArtistEl.textContent = song.artist;
    renderPlaylist();

    clearInterval(beepInterval);
    isBeepPlaying = false;

    if (song.file) {
        const url = URL.createObjectURL(song.file);
        audio.src = url;
        audio.play()
            .then(() => {
                isPlaying = true;
                playBtn.textContent = '⏸ Pause';
                showNotification(`▶ Memutar: ${song.title}`, 'success', 2000);
            })
            .catch(() => {
                isPlaying = false;
                playBtn.textContent = '▶ Play';
                showNotification('Gagal memutar file', 'error');
            });
    } else {
        playBeep();
    }
}

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.8);

        isPlaying = true;
        isBeepPlaying = true;
        playBtn.textContent = '⏸ Pause';
        showNotification('🔊 Memutar preview (beep)', 'info', 1500);

        let progress = 0;
        clearInterval(beepInterval);
        beepInterval = setInterval(() => {
            progress += 0.6;
            if (progress >= 100) {
                progress = 0;
                isBeepPlaying = false;
                clearInterval(beepInterval);
                handleSongEnd();
                return;
            }
            progressBar.value = progress;
            currentTimeEl.textContent = formatTime(progress / 100 * 180);
            totalDurationEl.textContent = '3:00';
        }, 50);

        setTimeout(() => {
            isBeepPlaying = false;
            clearInterval(beepInterval);
            handleSongEnd();
        }, 1800);
    } catch (e) {
        showNotification('Audio tidak didukung browser', 'error');
        isPlaying = false;
        playBtn.textContent = '▶ Play';
    }
}

function handleSongEnd() {
    if (isRepeat) {
        audio.currentTime = 0;
        if (playlist[currentTrackIndex]?.file) {
            audio.play().catch(() => {});
        } else {
            playCurrent();
        }
        return;
    }
    if (isShuffle) {
        playRandom();
        return;
    }
    if (currentTrackIndex < playlist.length - 1) {
        nextTrack();
    } else {
        isPlaying = false;
        playBtn.textContent = '▶ Play';
        progressBar.value = 0;
        currentTimeEl.textContent = '0:00';
        showNotification('⏹ Playlist selesai', 'info', 2000);
    }
}

function playRandom() {
    if (playlist.length <= 1) {
        if (playlist.length === 1) {
            currentTrackIndex = 0;
            playCurrent();
        }
        return;
    }
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * playlist.length);
    } while (newIndex === currentTrackIndex && playlist.length > 1);
    currentTrackIndex = newIndex;
    playCurrent();
    saveToLocalStorage();
}

// ===================== NAVIGASI =====================
function nextTrack() {
    if (playlist.length === 0) {
        showNotification('Playlist kosong', 'warning');
        return;
    }
    if (isShuffle) {
        playRandom();
        return;
    }
    if (currentTrackIndex < playlist.length - 1) {
        audio.pause();
        audio.src = '';
        clearInterval(beepInterval);
        isBeepPlaying = false;
        currentTrackIndex++;
        playCurrent();
        saveToLocalStorage();
    } else {
        showNotification('🎵 Di akhir playlist', 'info');
    }
}

function prevTrack() {
    if (playlist.length === 0) {
        showNotification('Playlist kosong', 'warning');
        return;
    }
    if (currentTrackIndex > 0) {
        audio.pause();
        audio.src = '';
        clearInterval(beepInterval);
        isBeepPlaying = false;
        currentTrackIndex--;
        playCurrent();
        saveToLocalStorage();
    } else {
        showNotification('⏮ Di awal playlist', 'info');
    }
}

function playAt(index) {
    if (index >= 0 && index < playlist.length) {
        audio.pause();
        audio.src = '';
        clearInterval(beepInterval);
        isBeepPlaying = false;
        currentTrackIndex = index;
        playCurrent();
        saveToLocalStorage();
    }
}

// ===================== MODAL SYSTEM =====================
function showModal(options) {
    return new Promise((resolve) => {
        // Hapus modal lama jika ada
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const { 
            icon = '⚠️', 
            title = 'Konfirmasi', 
            message = 'Apakah Anda yakin?',
            confirmText = 'Ya, Lanjutkan',
            cancelText = 'Batal',
            confirmClass = 'modal-btn-danger',
            cancelClass = 'modal-btn-cancel'
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <span class="modal-icon">${icon}</span>
                <div class="modal-title">${title}</div>
                <div class="modal-message">${message}</div>
                <div class="modal-divider"></div>
                <div class="modal-actions">
                    <button class="modal-btn ${cancelClass}" id="modalCancel">${cancelText}</button>
                    <button class="modal-btn ${confirmClass}" id="modalConfirm">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Animasi masuk
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });

        // Close on overlay click (background)
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
                resolve(false);
            }
        });

        // Close on Escape
        const escHandler = function(e) {
            if (e.key === 'Escape') {
                closeModal();
                resolve(false);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        function closeModal() {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }, 200);
        }

        document.getElementById('modalCancel').addEventListener('click', function() {
            closeModal();
            resolve(false);
        });

        document.getElementById('modalConfirm').addEventListener('click', function() {
            closeModal();
            resolve(true);
        });
    });
}

// ===================== DELETE & CLEAR (Dengan Modal) =====================
async function deleteSong(index) {
    if (playlist.length === 0) return;
    const deleted = playlist[index];
    const isCurrent = index === currentTrackIndex;

    // Tampilkan modal konfirmasi
    const confirmed = await showModal({
        icon: '🗑️',
        title: 'Hapus Lagu?',
        message: `Yakin ingin menghapus <span>"${escapeHtml(deleted.title)}"</span> dari playlist?`,
        confirmText: '🗑️ Hapus',
        cancelText: 'Batal',
        confirmClass: 'modal-btn-danger'
    });

    if (!confirmed) return;

    // Lanjutkan hapus
    playlist.splice(index, 1);

    if (playlist.length === 0) {
        currentTrackIndex = 0;
        audio.pause();
        audio.src = '';
        clearInterval(beepInterval);
        isBeepPlaying = false;
        isPlaying = false;
        playBtn.textContent = '▶ Play';
        currentSongEl.textContent = '-';
        currentArtistEl.textContent = '-';
        progressBar.value = 0;
        currentTimeEl.textContent = '0:00';
        totalDurationEl.textContent = '0:00';
        renderPlaylist();
        updateTotalSongs();
        saveToLocalStorage();
        showNotification(`🗑 Dihapus: ${deleted.title}`, 'warning', 2000);
        return;
    }

    if (isCurrent) {
        if (index < playlist.length) {
            currentTrackIndex = index;
        } else {
            currentTrackIndex = index - 1;
        }
        audio.pause();
        audio.src = '';
        clearInterval(beepInterval);
        isBeepPlaying = false;
        playCurrent();
    } else {
        if (index < currentTrackIndex) currentTrackIndex--;
    }

    renderPlaylist();
    updateNowPlaying();
    updateTotalSongs();
    saveToLocalStorage();
    showNotification(`🗑 Dihapus: ${deleted.title}`, 'warning', 2000);
}

async function clearAllSongs() {
    if (playlist.length === 0) {
        showNotification('Playlist sudah kosong', 'info');
        return;
    }

    // Tampilkan modal konfirmasi
    const confirmed = await showModal({
        icon: '🧹',
        title: 'Kosongkan Playlist?',
        message: `Yakin ingin menghapus semua <span>${playlist.length}</span> lagu dari playlist?<br><span style="color:#f87171;font-size:13px;">⚠️ Tindakan ini tidak dapat dibatalkan!</span>`,
        confirmText: '🧹 Kosongkan',
        cancelText: 'Batal',
        confirmClass: 'modal-btn-danger'
    });

    if (!confirmed) return;

    // Lanjutkan kosongkan
    audio.pause();
    audio.src = '';
    clearInterval(beepInterval);
    isBeepPlaying = false;
    playlist = [];
    currentTrackIndex = 0;
    isPlaying = false;
    playBtn.textContent = '▶ Play';
    currentSongEl.textContent = '-';
    currentArtistEl.textContent = '-';
    progressBar.value = 0;
    currentTimeEl.textContent = '0:00';
    totalDurationEl.textContent = '0:00';
    renderPlaylist();
    updateTotalSongs();
    saveToLocalStorage();
    showNotification('🗑 Playlist dikosongkan', 'warning', 2500);
}

// ===================== ADD SONG =====================
function addSong(title, artist, file) {
    playlist.push({
        title: title.trim(),
        artist: artist.trim(),
        file: file || null,
        fileName: file ? file.name : null
    });
    if (playlist.length === 1) {
        currentTrackIndex = 0;
        updateNowPlaying();
    }
    renderPlaylist();
    updateTotalSongs();
    saveToLocalStorage();
    showNotification(`✅ "${title}" ditambahkan!`, 'success', 2000);
}

// ===================== LOGOUT (Dengan Modal) =====================
async function logout() {
    const confirmed = await showModal({
        icon: '🚪',
        title: 'Keluar?',
        message: 'Yakin ingin keluar dari Play Music?',
        confirmText: '🚪 Keluar',
        cancelText: 'Batal',
        confirmClass: 'modal-btn-danger'
    });

    if (confirmed) {
        localStorage.removeItem(USER_KEY);
        window.location.href = 'index.html';
    }
}

// ===================== INISIALISASI =====================
function init() {
    // Cek session
    if (!checkSession()) return;

    // Load data
    const hasData = loadFromLocalStorage();

    if (!hasData || playlist.length === 0) {
        const defaults = [
            { title: 'Blinding Lights', artist: 'The Weeknd' },
            { title: 'Starboy', artist: 'The Weeknd' },
            { title: 'Levitating', artist: 'Dua Lipa' },
        ];
        defaults.forEach(s => {
            playlist.push({ title: s.title, artist: s.artist, file: null, fileName: null });
        });
        currentTrackIndex = 0;
        saveToLocalStorage();
        showNotification('🎵 Lagu default ditambahkan', 'info', 2000);
    }

    renderPlaylist();
    updateNowPlaying();
    updateTotalSongs();

    // Update shuffle/repeat UI
    if (isShuffle) shuffleBtn.classList.add('active-shuffle');
    if (isRepeat) repeatBtn.classList.add('active-repeat');

    audio.volume = 0.8;
    volumeControl.value = 0.8;

    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('play', () => {
        isPlaying = true;
        playBtn.textContent = '⏸ Pause';
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        playBtn.textContent = '▶ Play';
    });

    // Progress
    progressBar.addEventListener('input', function() {
        isDragging = true;
        if (audio.duration) {
            const seek = (this.value / 100) * audio.duration;
            currentTimeEl.textContent = formatTime(seek);
        }
    });
    progressBar.addEventListener('change', function() {
        isDragging = false;
        if (audio.duration) {
            audio.currentTime = (this.value / 100) * audio.duration;
        }
    });

    console.log('✦ Play Music siap!');
    console.log(`👤 User: ${currentUser}`);
}

function updateProgress() {
    if (isDragging) return;
    if (audio.duration && !isNaN(audio.duration)) {
        const pct = (audio.currentTime / audio.duration) * 100;
        progressBar.value = pct;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        totalDurationEl.textContent = formatTime(audio.duration);
    }
}

function updateDuration() {
    if (audio.duration && !isNaN(audio.duration)) {
        totalDurationEl.textContent = formatTime(audio.duration);
    }
}

// ===================== EVENT LISTENERS =====================
playBtn.addEventListener('click', function() {
    if (playlist.length === 0) {
        showNotification('Playlist kosong!', 'warning');
        return;
    }
    const song = playlist[currentTrackIndex];
    if (isPlaying) {
        if (isBeepPlaying) {
            isBeepPlaying = false;
            clearInterval(beepInterval);
        } else {
            audio.pause();
        }
        isPlaying = false;
        playBtn.textContent = '▶ Play';
        showNotification('⏸ Pause', 'info', 1000);
    } else {
        if (song?.file && audio.src) {
            audio.play().catch(() => playCurrent());
        } else {
            playCurrent();
        }
    }
});

nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

shuffleBtn.addEventListener('click', function() {
    isShuffle = !isShuffle;
    this.classList.toggle('active-shuffle');
    showNotification(isShuffle ? '🔀 Shuffle ON' : '🔀 Shuffle OFF', 'info', 1200);
    saveToLocalStorage();
});

repeatBtn.addEventListener('click', function() {
    isRepeat = !isRepeat;
    this.classList.toggle('active-repeat');
    showNotification(isRepeat ? '🔁 Repeat ON' : '🔁 Repeat OFF', 'info', 1200);
    saveToLocalStorage();
});

clearBtn.addEventListener('click', clearAllSongs);
logoutBtn.addEventListener('click', logout);

// File upload
fileBtn.addEventListener('click', () => songFileInput.click());
songFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const valid = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'];
        if (valid.includes(file.type) || /\.(mp3|wav|ogg|m4a)$/i.test(file.name)) {
            selectedFile = file;
            fileNameEl.textContent = file.name;
            fileNameEl.classList.add('has-file');
            showNotification(`📁 File dipilih: ${file.name}`, 'success', 1500);
        } else {
            showNotification('⚠️ Format file tidak didukung!', 'error');
            songFileInput.value = '';
            selectedFile = null;
            fileNameEl.textContent = 'Belum ada file';
            fileNameEl.classList.remove('has-file');
        }
    }
});

// Add song
addBtn.addEventListener('click', function() {
    const title = songTitleInput.value.trim();
    const artist = songArtistInput.value.trim();
    if (!title || !artist) {
        showNotification('⚠️ Judul & Artis wajib diisi!', 'error');
        return;
    }
    addSong(title, artist, selectedFile);
    songTitleInput.value = '';
    songArtistInput.value = '';
    songFileInput.value = '';
    selectedFile = null;
    fileNameEl.textContent = 'Belum ada file';
    fileNameEl.classList.remove('has-file');
});

// Enter add
songTitleInput.addEventListener('keypress', e => { if (e.key === 'Enter') addBtn.click(); });
songArtistInput.addEventListener('keypress', e => { if (e.key === 'Enter') addBtn.click(); });

// Volume
volumeControl.addEventListener('input', function() {
    audio.volume = this.value;
});

// ===================== START =====================
document.addEventListener('DOMContentLoaded', init);