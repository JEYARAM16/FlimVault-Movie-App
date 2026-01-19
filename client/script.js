const API_KEY = '913566e2ca2290f9747c63a97fce0d3a'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

// Global list to store saved movie IDs for quick checking
let myWatchlistIds = [];

// 1. Check Login & Load Data
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

if(!token) {
    window.location.href = 'login.html';
} else {
    const userProfile = document.querySelector('.user-profile');
    if(userProfile && username) {
        userProfile.innerText = `👤 ${username}`;
    }
}

// 2. Start App
window.addEventListener('load', async () => {
    // First, fetch the user's saved movies so we know which buttons to turn Red
    await fetchUserWatchlist();
    
    // Then load the Trending page
    fetchTrending();
});

// --- FETCH USER WATCHLIST (To know what is already saved) ---
async function fetchUserWatchlist() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('http://localhost:5000/api/watchlist', {
            headers: { 'x-access-token': token }
        });
        const data = await res.json();
        // Save just the IDs into our global list
        myWatchlistIds = data.map(movie => movie.tmdbId); 
    } catch (err) {
        console.error("Error fetching watchlist:", err);
    }
}

// --- FETCHING MOVIES ---
async function fetchTrending() {
    const container = document.getElementById('movie-container');
    container.innerHTML = ''; 
    updateSidebar(document.querySelector('.menu-item.active') || document.querySelector('.menu-item'));

    const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
    const data = await res.json();
    displayMovies('🔥 Trending This Week', data.results, 'grid');
}

async function fetchMoviesByCategory(genreId, title, btnElement) {
    const container = document.getElementById('movie-container');
    container.innerHTML = ''; 
    if(btnElement) updateSidebar(btnElement);

    const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
    const data = await res.json();
    displayMovies(title, data.results, 'grid');
}

// --- DISPLAY MOVIES (With "Already Saved" Check) ---
function displayMovies(title, movies, layoutType) {
    const container = document.getElementById('movie-container');
    
    const titleEl = document.createElement('h2');
    titleEl.innerText = title;
    titleEl.style.marginLeft = '20px';
    container.appendChild(titleEl);

    const listDiv = document.createElement('div');
    listDiv.classList.add(layoutType === 'grid' ? 'movie-grid' : 'movie-row');
    
    movies.forEach(movie => {
        if(movie.poster_path) {
            const card = document.createElement('div');
            card.classList.add('movie-card');
            
            // CHECK: Is this movie already in my watchlist?
            // Note: We convert IDs to strings to be safe
            const isSaved = myWatchlistIds.includes(String(movie.id));
            
            // If saved, button is Green and says "Saved"
            // If not, button is Red and says "Save"
            const btnText = isSaved ? '✔ Saved' : '❤ Save';
            const btnClass = isSaved ? 'save-btn saved' : 'save-btn';
            const btnAction = isSaved ? '' : `onclick="addToWatchlist('${movie.id}', '${movie.title}', '${movie.poster_path}', this)"`;

            card.innerHTML = `
                <img src="${IMAGE_URL + movie.poster_path}" alt="${movie.title}" 
                     onclick="openTrailer('${movie.id}')">
                     
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <button class="${btnClass}" ${btnAction}>${btnText}</button>
                </div>
            `;
            listDiv.appendChild(card);
        }
    });
    container.appendChild(listDiv);
}
// 5. --- TRAILER FUNCTION (Now supports Back Button!) ---
// 5. --- TRAILER & FULL DETAILS FUNCTION ---
async function openTrailer(movieId) {
    try {
        // 1. Fetch Video (Trailer)
        const videoRes = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
        const videoData = await videoRes.json();
        const trailer = videoData.results.find(vid => vid.type === 'Trailer' || vid.type === 'Teaser');

        // 2. Fetch Basic Details (Plot, Rating, Time)
        const detailRes = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}`);
        const movieDetails = await detailRes.json();

        // 3. NEW: Fetch Cast (Actors)
        const creditsRes = await fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`);
        const creditsData = await creditsRes.json();
        
        // Take the top 5 actors and join them with commas
        const topCast = creditsData.cast.slice(0, 5).map(actor => actor.name).join(", ");
        const genres = movieDetails.genres.map(g => g.name).join(", ");

        const modal = document.getElementById('trailer-modal');
        const contentDiv = document.querySelector('.modal-content');

        if (trailer) {
            contentDiv.innerHTML = `
                <span id="close-btn" onclick="closeModal()">&times;</span>
                <iframe id="youtube-player" width="100%" height="450" 
                        src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" 
                        frameborder="0" allowfullscreen></iframe>
                
                <div class="movie-details-container">
                    <h2>${movieDetails.title}</h2>
                    
                    <div class="movie-meta">
                        <span class="rating-badge">★ ${movieDetails.vote_average.toFixed(1)}</span>
                        <span>📅 ${movieDetails.release_date ? movieDetails.release_date.split('-')[0] : 'N/A'}</span>
                        <span>⏱ ${movieDetails.runtime} min</span>
                    </div>

                    <p class="movie-genres"><strong>Genre:</strong> ${genres}</p>
                    <p class="movie-cast"><strong>Starring:</strong> ${topCast}</p>
                    
                    <p class="movie-overview">${movieDetails.overview}</p>
                </div>
            `;
            
            // Show Modal & Fix Back Button
            modal.style.display = 'flex';
            history.pushState({ modalOpen: true }, "", "#trailer");

        } else {
            alert("Sorry, no trailer available for this movie.");
        }
    } catch (error) { console.error(error); }
}

// 6. --- CLOSE MODAL LOGIC (Connected to History) ---

// This function runs when you click "X" or the background
function closeModal() {
    // If the modal is open (meaning we have that "fake" history state),
    // we just simulate a "Back" click. The browser handles the rest.
    if (history.state && history.state.modalOpen) {
        history.back();
    } else {
        // Fallback just in case
        hideModalElements();
    }
}

// This helper actually hides the screen
function hideModalElements() {
    const modal = document.getElementById('trailer-modal');
    const contentDiv = document.querySelector('.modal-content');
    if(modal) modal.style.display = 'none';
    if(contentDiv) contentDiv.innerHTML = ''; // Stop video sound
}

// LISTEN FOR THE BACK BUTTON
// When the user clicks "Back", this event fires automatically
window.addEventListener('popstate', () => {
    hideModalElements();
});

// Click outside to close (Triggers the history logic)
window.onclick = function(event) {
    const modal = document.getElementById('trailer-modal');
    if (event.target == modal) {
        closeModal();
    }
}

// 7. --- SIDEBAR & SEARCH LOGIC ---
function updateSidebar(activeBtn) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    if(activeBtn) activeBtn.classList.add('active');
}

const form = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
if(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value;
        const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}`);
        const data = await res.json();
        
        const container = document.getElementById('movie-container');
        container.innerHTML = ''; 
        updateSidebar(null);
        displayMovies(`Results for "${query}"`, data.results, 'grid'); 
    });
}

const watchlistBtn = document.getElementById('watchlist-sidebar-btn');
if(watchlistBtn) {
    watchlistBtn.addEventListener('click', async function() {
        updateSidebar(this);
        await fetchUserWatchlist();
        
        const container = document.getElementById('movie-container');
        container.innerHTML = '';
        
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/watchlist', {
             headers: { 'x-access-token': token }
        });
        const savedMovies = await res.json();

        if(savedMovies.length === 0) {
            container.innerHTML = '<h2 style="margin-left:20px;">Your watchlist is empty!</h2>';
        } else {
            const formattedMovies = savedMovies.map(m => ({
                id: m.tmdbId,
                title: m.title,
                poster_path: m.poster
            }));
            displayMovies('My Watchlist', formattedMovies, 'grid'); 
        }
    });
}

const logoutBtn = document.querySelector('.logout-btn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}