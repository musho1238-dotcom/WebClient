const API_KEY = 'AIzaSyANTcdPDkaxOyf-gm4zkB4uVwucT_TF4vA'; // Ensure this key is valid
let currentVideoToSave = null;

// --- 1. USER SESSION CHECK ---
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (currentUser) {
    document.getElementById('headerUserInfo').style.display = 'flex';
    document.getElementById('welcomeMessage').textContent = `Hello, ${currentUser.username}`;
    document.getElementById('userImage').src = currentUser.imageURL;
}

// --- 2. INIT & LISTENERS ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
        document.getElementById('searchInput').value = queryParam;
        performSearch(queryParam, false);
    }
});

document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value;
    performSearch(query, true);
});

// --- 3. SEARCH LOGIC ---
async function performSearch(query, updateUrl) {
    const resultsArea = document.getElementById('resultsArea');
    if (!query) return;

    if (updateUrl) {
        const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    resultsArea.innerHTML = '<p>Searching...</p>';
    document.getElementById('videoPlayerContainer').style.display = 'none';

    try {
        // *** Get Local Playlists (No Server) ***
        let userPlaylists = {};
        if (currentUser) {
            userPlaylists = getPlaylistsLocal();
        }

        // Step 1: Search YouTube for IDs
        const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&videoEmbeddable=true&type=video&maxResults=10&q=${query}&key=${API_KEY}`);
        const searchData = await searchRes.json();

        if (!searchData.items || searchData.items.length === 0) {
            resultsArea.innerHTML = '<p>No results found.</p>';
            return;
        }

        const videoIds = searchData.items.map(item => item.id.videoId).join(',');

        // Step 2: Get Details (Duration, Views)
        const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${API_KEY}`);
        const detailsData = await detailsRes.json();

        resultsArea.innerHTML = '';

        // Render Results
        detailsData.items.forEach(video => {
            const videoId = video.id;
            const snippet = video.snippet;
            const title = snippet.title;
            const thumbnail = snippet.thumbnails.medium.url;
            const viewCount = parseInt(video.statistics.viewCount).toLocaleString();
            const duration = parseDuration(video.contentDetails.duration);

            // Check if already saved in local playlists
            const isSaved = checkVideoInPlaylists(userPlaylists, videoId);

            let buttonHtml = '';
            if (isSaved) {
                buttonHtml = `<button class="action-btn fav-btn saved" disabled>✔ Saved</button>`;
            } else {
                const safeTitle = title.replace(/'/g, "\\'");
                buttonHtml = `<button class="action-btn fav-btn" 
                                        onclick="openSaveModal('${videoId}', '${safeTitle}', '${thumbnail}', '${duration}')">
                                        ★ Add to Playlist
                                      </button>`;
            }

            const cardHTML = `
                        <div class="video-card">
                            <div class="thumb-container" onclick="playVideo('${videoId}')">
                                <img src="${thumbnail}" alt="${title}">
                                <span class="duration-badge">${duration}</span>
                            </div>
                            <div class="card-body">
                                <div class="card-title" title="${title}">${title}</div>
                                <div class="card-stats">${viewCount} views</div>
                                <div class="card-actions">
                                    <button class="action-btn play-btn" onclick="playVideo('${videoId}')">▶ Play</button>
                                    ${buttonHtml}
                                </div>
                            </div>
                        </div>
                    `;
            resultsArea.innerHTML += cardHTML;
        });

    } catch (error) {
        console.error(error);
        resultsArea.innerHTML = '<p style="color:red">Error fetching data from YouTube.</p>';
    }
}

// --- 4. LOCAL STORAGE HELPERS ---

function getPlaylistsLocal() {
    const all = JSON.parse(localStorage.getItem('all_playlists')) || {};
    return all[currentUser.username] || {};
}

function savePlaylistsLocal(playlists) {
    const all = JSON.parse(localStorage.getItem('all_playlists')) || {};
    all[currentUser.username] = playlists;
    localStorage.setItem('all_playlists', JSON.stringify(all));
}

function checkVideoInPlaylists(playlists, videoId) {
    for (const playlistName in playlists) {
        const videos = playlists[playlistName];
        if (videos.some(v => v.id === videoId)) return true;
    }
    return false;
}

// --- 5. MODAL & SAVE LOGIC ---

function openSaveModal(id, title, img, duration) {
    if (!currentUser) {
        alert("Please login to save videos.");
        return;
    }

    currentVideoToSave = { id, title, img, duration };

    // Load latest data from LocalStorage
    const playlists = getPlaylistsLocal();

    const select = document.getElementById('playlistSelect');
    select.innerHTML = '<option value="">-- Select Playlist --</option>';

    for (const name in playlists) {
        select.innerHTML += `<option value="${name}">${name}</option>`;
    }

    document.getElementById('modalVideoTitle').textContent = title;
    document.getElementById('newPlaylistInput').value = '';
    document.getElementById('saveModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('saveModal').style.display = 'none';
    currentVideoToSave = null;
}

function confirmSave() {
    if (!currentUser || !currentVideoToSave) return;

    const existingName = document.getElementById('playlistSelect').value;
    const newName = document.getElementById('newPlaylistInput').value.trim();
    let targetName = newName || existingName;

    if (!targetName) {
        alert("Please select or create a playlist.");
        return;
    }

    // 1. Get current data
    const playlists = getPlaylistsLocal();

    // 2. Update object
    if (!playlists[targetName]) playlists[targetName] = [];
    playlists[targetName].push(currentVideoToSave);

    // 3. Save BACK to LocalStorage
    savePlaylistsLocal(playlists);

    closeModal();
    showToast();

    // Refresh search results to show "Saved" badge
    performSearch(document.getElementById('searchInput').value, false);
}

// --- 6. UTILITIES ---

function showToast() {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    setTimeout(function () { toast.className = toast.className.replace("show", ""); }, 5000);
}
function playVideo(id) {
    const container = document.getElementById('videoPlayerContainer');
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&origin=${window.location.origin}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

function playVideo(id) {
    const container = document.getElementById('videoPlayerContainer');
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
}

function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    let result = '';
    if (hours) result += hours + ':';
    result += (minutes || '0') + ':';
    result += (seconds.length === 1 ? '0' + seconds : (seconds || '00'));
    return result;
}