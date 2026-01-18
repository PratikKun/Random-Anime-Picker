// --- Configuration & State ---
const genreList = [
    { id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 4, name: 'Comedy' },
    { id: 8, name: 'Drama' }, { id: 10, name: 'Fantasy' }, { id: 14, name: 'Horror' },
    { id: 7, name: 'Mystery' }, { id: 22, name: 'Romance' }, { id: 24, name: 'Sci-Fi' },
    { id: 36, name: 'Slice of Life' }, { id: 37, name: 'Supernatural' }
];

let currentAnime = null;
let library = JSON.parse(localStorage.getItem('anime_lib')) || [];
let useFilters = false;

// --- Initialization ---
window.onload = () => {
    const genreSelect = document.getElementById('filterGenre');
    if (genreSelect) {
        genreList.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            genreSelect.appendChild(opt);
        });
    }
    handleFetch();
};

// --- Fetching Logic ---
async function handleFetch() {
    const btn = document.getElementById('shuffleBtn');
    const cardBody = document.getElementById('cardBody');
    const skeleton = cardBody.querySelector('.skeleton-wrapper');

    if (btn) {
        btn.disabled = true;
        btn.textContent = "SUMMONING...";
    }
    cardBody.classList.add('loading');
    skeleton.style.display = 'block';


    try {
        let url;
        let minScore = 7.0;

        if (useFilters) {
            const g = document.getElementById('filterGenre').value;
            const t = document.getElementById('filterType').value;
            const s = document.getElementById('filterStatus').value;
            const r = document.getElementById('filterRating').value;

            if (r) minScore = r;
            url = `https://api.jikan.moe/v4/anime?sfw=true&order_by=score&sort=desc&limit=25&min_score=${minScore}`;

            if (g) url += `&genres=${g}`;
            if (t) url += `&type=${t}`;
            if (s) url += `&status=${s}`;
        } else {
            // High-rated page mix
            const randomPage = Math.floor(Math.random() * 20) + 1;
            url = `https://api.jikan.moe/v4/anime?sfw=true&min_score=${minScore}&order_by=score&sort=desc&limit=25&page=${randomPage}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('API Error');

        const json = await res.json();
        const list = json.data.filter(anime => !library.some(libItem => libItem.anime.mal_id === anime.mal_id));


        if (!list || list.length === 0) {
            showToast("No new anime found. Try different filters or clear your library.");
            // Optionally, fetch next page or reset filters
            return;
        }

        const anime = list[Math.floor(Math.random() * list.length)];
        currentAnime = anime;
        updateUI(anime);

    } catch (err) {
        console.error(err);
        document.getElementById('titleMain').textContent = "Connection Error";
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = useFilters ? "NEXT QUALITY PICK" : "DISCOVER TOP HITS";
        }
        cardBody.classList.remove('loading');
        skeleton.style.display = 'none';
    }
}

// --- UI Updates ---
function updateUI(a) {
    const cardBody = document.getElementById('cardBody');
    const skeleton = cardBody.querySelector('.skeleton-wrapper');
    skeleton.style.display = 'none';
    cardBody.classList.remove('loading');

    const img = a.images.jpg.large_image_url;

    // Backgrounds
    document.getElementById('bgOverlay').style.backgroundImage = `url(${img})`;
    document.getElementById('cardHeader').style.backgroundImage = `url(${img})`;

    // Core Data
    document.getElementById('titleMain').textContent = a.title_english || a.title;
    document.getElementById('titleSub').textContent = a.title_japanese || "";
    document.getElementById('statusBadge').textContent = a.status || "Unknown";
    document.getElementById('statScore').textContent = a.score || "N/A";
    document.getElementById('statEpisodes').textContent = a.episodes || "?";

    const durStr = a.duration ? a.duration.split(' ')[0] : "?";
    document.getElementById('statDuration').textContent = durStr + "m";
    document.getElementById('statYear').textContent = a.year || (a.aired.from ? a.aired.from.split('-')[0] : "N/A");
    document.getElementById('synopsis').textContent = a.synopsis || "No synopsis provided.";

    // Tags
    const tagsContainer = document.getElementById('tags');
    tagsContainer.innerHTML = '';
    (a.genres || []).slice(0, 3).forEach(g => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = g.name;
        tagsContainer.appendChild(span);
    });

    // Audio & Licensing
    const licensors = (a.licensors || []).map(l => l.name);
    const dubPill = document.getElementById('dubPill');
    const dubCompanies = ["Funimation", "Crunchyroll", "Sentai Filmworks", "Netflix", "Aniplex", "Disney", "Warner Bros"];
    const isLikelyDubbed = licensors.some(l => dubCompanies.some(c => l.includes(c)));

    dubPill.className = isLikelyDubbed ? 'dub-pill' : 'dub-pill inactive';
    dubPill.textContent = isLikelyDubbed ? "DUB" : "DUB?";

    const licensorEl = document.getElementById('licensorName');
    licensorEl.textContent = licensors.length > 0 ? `Licensors: ${licensors.join(', ')}` : "Licensors: Unknown";
}

// --- Menu Controls ---
function toggleMenu(e) {
    e.stopPropagation();
    document.getElementById('dropdownMenu').classList.toggle('show');
}

window.onclick = () => {
    document.getElementById('dropdownMenu').classList.remove('show');
};

function toggleFilters() {
    document.getElementById('filterTab').classList.toggle('active');
}

function applyFilters() {
    const ratingInput = document.getElementById('filterRating');
    if (ratingInput.value && (ratingInput.value < 1 || ratingInput.value > 10)) {
        showToast("Rating must be between 1 and 10.");
        return;
    }
    useFilters = true;
    toggleFilters();
    handleFetch();
}

function clearFilters() {
    document.getElementById('filterGenre').value = "";
    document.getElementById('filterType').value = "";
    document.getElementById('filterStatus').value = "";
    document.getElementById('filterRating').value = "";
    useFilters = false;
    toggleFilters();
    handleFetch();
}

// --- Notification System ---
function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;`;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    toast.style.cssText = `
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// --- Library Controls ---
function saveToLibrary(status) {
    if (!currentAnime) return;
    const existingIndex = library.findIndex(item => item.anime.mal_id === currentAnime.mal_id);

    if (existingIndex > -1) {
        // Update status if it exists
        library[existingIndex].status = status;
        showToast(`Updated to ${status}!`);
    } else {
        // Add new item
        library.push({ anime: currentAnime, status: status });
        showToast(`Added as ${status}!`);
    }

    localStorage.setItem('anime_lib', JSON.stringify(library));
    if (document.getElementById('libModal').classList.contains('active')) renderLibrary();
}


function toggleLibrary() {
    const modal = document.getElementById('libModal');
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) renderLibrary();
}

function renderLibrary() {
    const body = document.getElementById('libBody');
    if (library.length === 0) {
        body.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: #888;">
            <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
            <h3>Your Collection is Empty</h3>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Use the options menu on an anime to add it to your list!</p>
        </div>`;
        return;
    }

    body.innerHTML = "";

    library.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <img src="${item.anime.images.jpg.small_image_url}">
            <div class="list-info">
                <h4>${item.anime.title_english || item.anime.title}</h4>
                <p>
                    <select onchange="updateStatus(${index}, this.value)" style="background: #333; border: none; color: #fff; border-radius: 4px;">
                        <option value="watching" ${item.status === 'watching' ? 'selected' : ''}>Watching</option>
                        <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="planned" ${item.status === 'planned' ? 'selected' : ''}>Planned</option>
                    </select>
                </p>
            </div>
            <button class="delete-btn" onclick="removeFromLibrary(${index})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        body.appendChild(div);
    });
}

function updateStatus(index, newStatus) {
    library[index].status = newStatus;
    localStorage.setItem('anime_lib', JSON.stringify(library));
    showToast("Status Updated!");
}


function removeFromLibrary(index) {
    library.splice(index, 1);
    localStorage.setItem('anime_lib', JSON.stringify(library));
    renderLibrary();
    showToast("Removed from library.");
}

function exportLib() {
    if (library.length === 0) return showToast("Nothing to export!");
    const blob = new Blob([JSON.stringify(library)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anirandom_backup.json';
    a.click();
}

document.getElementById('fileInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (res) => {
        try {
            const data = JSON.parse(res.target.result);
            if (Array.isArray(data) && data.every(item => item.anime && item.status)) {
                library = data;
                localStorage.setItem('anime_lib', JSON.stringify(library));
                showToast("Library Restored! ✅");
                if (document.getElementById('libModal').classList.contains('active')) renderLibrary();
            } else {
                showToast("Invalid or legacy file format.");
            }
        } catch (err) {
            showToast("Invalid file.");
        }
    };
    reader.readAsText(file);
};
