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
window.addEventListener('DOMContentLoaded', async () => {
    await loadDataFromServer();
    renderSidebar();

    const urlParams = new URLSearchParams(window.location.search);
    const listParam = urlParams.get('list');

    if (listParam && userPlaylists[listParam]) {
        loadPlaylist(listParam);
    } else {
        const names = Object.keys(userPlaylists);
        if (names.length > 0) loadPlaylist(names[0]);
    }
});

// --- SERVER API FUNCTIONS ---
async function loadDataFromServer() {
    try {
        const res = await fetch(`/api/playlists?username=${currentUser.username}`);
        if (res.ok) userPlaylists = await res.json();
    } catch (err) { console.error(err); }
}

async function saveToServer() {
    try {
        await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser.username,
                playlists: userPlaylists
            })
        });
    } catch (err) { console.error(err); }
}

// --- NEW: MP3 UPLOAD LOGIC ---
function triggerMp3Upload() {
    if (!activePlaylistName) return alert("Please select a playlist first.");
    document.getElementById('mp3Input').click();
}

async function handleMp3Upload(input) {
    const file = input.files[0];
    if (!file) return;

    // 1. Prepare Data
    const formData = new FormData();
    formData.append('mp3file', file);

    try {
        // 2. Upload to Server
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();

            // 3. Create Song Object (Marked as Local)
            const mp3Song = {
                id: data.filePath, // Server path (e.g., /uploads/song.mp3)
                title: data.originalName.replace('.mp3', ''),
                img: 'https://cdn-icons-png.flaticon.com/512/10783/10783145.png', // Default icon
                isLocal: true,
                rating: 0
            };

            // 4. Update & Save
            userPlaylists[activePlaylistName].push(mp3Song);
            await saveToServer();
            renderSongs();
            alert("MP3 Uploaded Successfully!");
        } else {
            alert("Upload failed.");
        }
    } catch (error) {
        console.error(error);
        alert("Error uploading file.");
    }
    input.value = ''; // Reset
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

    // Filter
    const filterText = document.getElementById('internalSearch').value.toLowerCase();
    songs = songs.filter(s => s.title.toLowerCase().includes(filterText));

    // Sort
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
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            const type = i <= rating ? '' : 'empty';
            starsHtml += `<span class="star ${type}" onclick="rateSong(${index}, ${i})">★</span>`;
        }

        // IMPORTANT: We use playSongAt(index) to handle both MP3 and YouTube correctly
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

// --- NEW: PLAYER LOGIC (HYBRID) ---
function playSongAt(index) {
    // Get the song object from the list using the index
    const song = userPlaylists[activePlaylistName][index];
    if (!song) return;

    const player = document.getElementById('activePlayer');
    player.style.display = 'block';
    player.scrollIntoView({ behavior: 'smooth' });

    // Check if it's MP3 or YouTube
    if (song.isLocal) {
        // It's an MP3 file
        player.innerHTML = `
                    <h3 style="color:white; margin:0 0 10px 0;">🎵 Playing MP3: ${song.title}</h3>
                    <audio controls autoplay style="width:100%">
                        <source src="${song.id}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                `;
    } else {
        // It's a YouTube video
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${song.id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
}

function playCurrentPlaylist() {
    if (!activePlaylistName || userPlaylists[activePlaylistName].length === 0) return;
    playSongAt(0);
}

async function deleteSong(index) {
    if (!confirm("Remove song?")) return;
    userPlaylists[activePlaylistName].splice(index, 1);
    await saveToServer();
    renderSongs();
}

async function rateSong(index, newRating) {
    userPlaylists[activePlaylistName][index].rating = newRating;
    await saveToServer();
    renderSongs();
}

function filterSongs() { renderSongs(); }
function sortSongs() { renderSongs(); }

// --- MODAL LOGIC ---
function openCreateModal() { document.getElementById('createModal').style.display = 'flex'; }
function closeModal() { document.getElementById('createModal').style.display = 'none'; }

async function createNewPlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    if (!name || userPlaylists[name]) return alert("Invalid name");
    userPlaylists[name] = [];
    await saveToServer();
    closeModal();
    loadPlaylist(name);
}

async function deleteCurrentPlaylist() {
    if (!confirm("Delete playlist?")) return;
    delete userPlaylists[activePlaylistName];
    await saveToServer();
    activePlaylistName = null;
    document.getElementById('controlsBar').style.display = 'none';
    document.getElementById('playlistSongs').innerHTML = '';
    renderSidebar();
}
