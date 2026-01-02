// --- 1. SESSION CHECK ---
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'login.html';
} else {
    document.getElementById('headerUserInfo').style.display = 'flex';
    document.getElementById('welcomeMessage').textContent = `Hello, ${currentUser.username}`;
    document.getElementById('userImage').src = currentUser.imageURL;
}

// Global State
let userPlaylists = {};
let activePlaylistName = null;

// --- 2. INIT ---
window.addEventListener('DOMContentLoaded', () => {
    // Load data from LocalStorage instead of Server
    loadDataLocal();
    renderSidebar();

    // Check if a playlist is selected in URL
    const urlParams = new URLSearchParams(window.location.search);
    const listParam = urlParams.get('list');

    if (listParam && userPlaylists[listParam]) {
        loadPlaylist(listParam);
    } else {
        // Default: load the first playlist if exists
        const names = Object.keys(userPlaylists);
        if (names.length > 0) loadPlaylist(names[0]);
    }
});

// --- LOCAL STORAGE HELPERS (Replaces API Calls) ---

function loadDataLocal() {
    // 1. Get the big object containing playlists for ALL users
    const allPlaylists = JSON.parse(localStorage.getItem('all_playlists')) || {};

    // 2. Extract only the playlists for the CURRENT user
    userPlaylists = allPlaylists[currentUser.username] || {};
}

function saveDataLocal() {
    // 1. Get the big object
    const allPlaylists = JSON.parse(localStorage.getItem('all_playlists')) || {};

    // 2. Update the current user's data
    allPlaylists[currentUser.username] = userPlaylists;

    // 3. Save back to storage
    localStorage.setItem('all_playlists', JSON.stringify(allPlaylists));
}

// --- MP3 UPLOAD LOGIC (Disabled for Static Site) ---
function triggerMp3Upload() {
    alert("Feature Unavailable: MP3 Upload is not supported in the static version (GitHub Pages).\nPlease use the Node.js version (Part B) for file uploads.");
}

function handleMp3Upload(input) {
    // Placeholder function to prevent errors if called
    console.log("Upload disabled");
    input.value = '';
}

// --- RENDER LOGIC ---
function renderSidebar() {
    const listEl = document.getElementById('sidebarList');
    listEl.innerHTML = '';
    const names = Object.keys(userPlaylists);

    if (names.length === 0) {
        listEl.innerHTML = '<li style="color:#aaa; font-size:12px;">No playlists yet.</li>';
        return;
    }

    names.forEach(name => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.textContent = name;
        li.onclick = () => loadPlaylist(name);
        if (name === activePlaylistName) li.classList.add('active');
        listEl.appendChild(li);
    });
}

function loadPlaylist(name) {
    activePlaylistName = name;

    // Update URL without reloading
    const newUrl = `${window.location.pathname}?list=${encodeURIComponent(name)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    document.getElementById('currentPlaylistTitle').textContent = name;
    document.getElementById('controlsBar').style.display = 'flex';
    document.getElementById('internalSearch').value = '';
    document.getElementById('activePlayer').style.display = 'none';

    renderSidebar();
    renderSongs();
}

function renderSongs() {
    const container = document.getElementById('playlistSongs');
    container.innerHTML = '';
    let songs = userPlaylists[activePlaylistName] || [];

    // Filter Logic
    const filterText = document.getElementById('internalSearch').value.toLowerCase();
    songs = songs.filter(s => s.title.toLowerCase().includes(filterText));

    // Sort Logic
    const sortMode = document.getElementById('sortSelect').value;
    if (sortMode === 'az') {
        songs.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'rating') {
        songs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (songs.length === 0) {
        container.innerHTML = '<p>No songs found in this playlist.</p>';
        return;
    }

    songs.forEach((song, index) => {
        const rating = song.rating || 0;

        // Generate Stars HTML
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const type = i <= rating ? '' : 'empty';
            starsHtml += `<span class="star ${type}" onclick="rateSong(${index}, ${i})">★</span>`;
        }

        const cardHTML = `
                    <div class="video-card">
                        <img src="${song.img}" alt="${song.title}" onclick="playSongAt(${index})">
                        <div class="card-body">
                            <div class="card-title" title="${song.title}">${song.title}</div>
                            <div class="rating-stars">${starsHtml}</div>
                            <div class="card-actions">
                                <button class="btn-small btn-play" onclick="playSongAt(${index})">▶ Play</button>
                                <button class="btn-small btn-delete" onclick="deleteSong(${index})">🗑 Delete</button>
                            </div>
                        </div>
                    </div>
                `;
        container.innerHTML += cardHTML;
    });
}

// --- PLAYER LOGIC ---
function playSongAt(index) {
    const song = userPlaylists[activePlaylistName][index];
    if (!song) return;

    const player = document.getElementById('activePlayer');
    player.style.display = 'block';
    player.scrollIntoView({ behavior: 'smooth' });

    if (song.isLocal) {
        // Static sites cannot serve local MP3 uploads easily
        player.innerHTML = `<h3 style="color:white; text-align:center;">⚠️ Cannot play local MP3 on static site.</h3>`;
    } else {
        // YouTube Embed
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${song.id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }

}

function playCurrentPlaylist() {
    if (!activePlaylistName || userPlaylists[activePlaylistName].length === 0) return;
    playSongAt(0);
}

// --- DATA MODIFICATION ---
function deleteSong(index) {
    if (!confirm("Remove song?")) return;
    userPlaylists[activePlaylistName].splice(index, 1);
    saveDataLocal(); // Sync to LocalStorage
    renderSongs();
}

function rateSong(index, newRating) {
    userPlaylists[activePlaylistName][index].rating = newRating;
    saveDataLocal(); // Sync to LocalStorage
    renderSongs();
}

function filterSongs() { renderSongs(); }
function sortSongs() { renderSongs(); }

// --- MODAL LOGIC ---
function openCreateModal() { document.getElementById('createModal').style.display = 'flex'; }
function closeModal() { document.getElementById('createModal').style.display = 'none'; }

function createNewPlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    if (!name || userPlaylists[name]) return alert("Invalid name or playlist already exists");

    userPlaylists[name] = []; // Initialize empty playlist
    saveDataLocal(); // Sync to LocalStorage

    closeModal();
    loadPlaylist(name);
}

function deleteCurrentPlaylist() {
    if (!confirm("Delete playlist?")) return;
    delete userPlaylists[activePlaylistName];

    saveDataLocal(); // Sync to LocalStorage

    activePlaylistName = null;
    document.getElementById('controlsBar').style.display = 'none';
    document.getElementById('playlistSongs').innerHTML = '';
    renderSidebar();
}