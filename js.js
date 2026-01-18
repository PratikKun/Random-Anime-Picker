// --- Configuration & State ---
const genreList = [
    { id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }, { id: 4, name: 'Comedy' },
    { id: 8, name: 'Drama' }, { id: 10, name: 'Fantasy' }, { id: 14, name: 'Horror' },
    { id: 7, name: 'Mystery' }, { id: 22, name: 'Romance' }, { id: 24, name: 'Sci-Fi' },
    { id: 36, name: 'Slice of Life' }, { id: 37, name: 'Supernatural' }
];

let currentAnime = null;
let library = JSON.parse(localStorage.getItem('anime_favs')) || [];
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
    if (btn) {
        btn.disabled = true;
        btn.textContent = "SUMMONING...";
    }
    
    try {
        let url;
        // High quality only: Score > 7.0
        url = `https://api.jikan.moe/v4/anime?sfw=true&min_score=7.0&order_by=score&sort=desc&limit=25`;
        
        if (useFilters) {
            const g = document.getElementById('filterGenre').value;
            const t = document.getElementById('filterType').value;
            const s = document.getElementById('filterStatus').value;
            if (g) url += `&genres=${g}`;
            if (t) url += `&type=${t}`;
            if (s) url += `&status=${s}`;
        } else {
            // High-rated page mix
            const randomPage = Math.floor(Math.random() * 20) + 1;
            url += `&page=${randomPage}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('API Error');
        
        const json = await res.json();
        const list = json.data;

        if (!list || list.length === 0) {
            showToast("No matches found with current filters.");
            useFilters = false;
            return handleFetch();
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
    }
}

// --- UI Updates ---
function updateUI(a) {
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
    useFilters = true;
    toggleFilters();
    handleFetch();
}

function clearFilters() {
    document.getElementById('filterGenre').value = "";
    document.getElementById('filterType').value = "";
    document.getElementById('filterStatus').value = "";
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

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Library Controls ---
function saveToLibrary() {
    if (!currentAnime) return;
    if (library.some(item => item.mal_id === currentAnime.mal_id)) {
        showToast("Already in favorites!");
        return;
    }
    library.push(currentAnime);
    localStorage.setItem('anime_favs', JSON.stringify(library));
    showToast("Added to favorites! ❤️");
}

function toggleLibrary() {
    const modal = document.getElementById('libModal');
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) renderLibrary();
}

function renderLibrary() {
    const body = document.getElementById('libBody');
    body.innerHTML = library.length === 0 ? "<p style='color:#666; text-align:center; padding-top:20px;'>Library is empty.</p>" : "";
    
    library.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <img src="${item.images.jpg.small_image_url}">
            <div class="list-info">
                <h4>${item.title_english || item.title}</h4>
                <p>${item.type} • ${item.score || 'N/A'}</p>
            </div>
            <button class="delete-btn" onclick="removeFromLibrary(${index})">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        body.appendChild(div);
    });
}

function removeFromLibrary(index) {
    library.splice(index, 1);
    localStorage.setItem('anime_favs', JSON.stringify(library));
    renderLibrary();
    showToast("Removed from favorites.");
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
            if (Array.isArray(data)) {
                library = data;
                localStorage.setItem('anime_favs', JSON.stringify(library));
                showToast("Library Restored! ✅");
                if (document.getElementById('libModal').classList.contains('active')) renderLibrary();
            }
        } catch (err) {
            showToast("Invalid file.");
        }
    };
    reader.readAsText(file);
};