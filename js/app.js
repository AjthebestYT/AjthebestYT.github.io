// ═══════════════════════════════════════════════════════════════
//  Navigation
// ═══════════════════════════════════════════════════════════════

const sections = ['home', 'browser', 'cloud-gaming', 'games', 'movies', 'account', 'settings', 'temp-email'];

const sectionTitles = {
  'home': 'Home',
  'browser': 'Browser',
  'cloud-gaming': 'Cloud Gaming',
  'games': 'Games',
  'movies': 'Movies',
  'account': 'Account',
  'settings': 'Settings',
  'temp-email': 'Raccoon Game & Email'
};

// Dual-Environment Tab Switcher (Works Direct + In Proxy)
function switchTab(tabId, rawUrl, btnElement) {
  // Hide all tab content
  document.querySelectorAll('#temp-email .tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  // Reset tab button styles
  document.querySelectorAll('#temp-email .tab-btn').forEach(btn => {
    btn.style.background = 'transparent';
    btn.style.color = '#ccc';
  });

  // Highlight active button
  if (btnElement) {
    btnElement.style.background = 'var(--accent)';
    btnElement.style.color = '#000';
  }

  // Show active tab container
  const activeTab = document.getElementById(tabId);
  if (!activeTab) return;
  activeTab.style.display = 'block';

  const iframe = activeTab.querySelector('iframe');
  if (!iframe) return;

  // Detect environment: Auto-switch between Direct GitHub Pages and Webfuse Proxy
  let finalUrl = rawUrl;
  if (window.location.host.includes('webfuse.com') && !rawUrl.includes('webfuse.com')) {
    finalUrl = window.location.origin + '/proxy/' + rawUrl;
  }

  // Only assign if the URL changed to prevent flickering
  if (iframe.src !== finalUrl) {
    iframe.src = finalUrl;
  }
}

let tempEmailInitialised = false;
let browserTabs = [{ title: 'New Tab', url: '' }];
let activeBrowserTab = 0;
const tempEmailUrls = {
  'frame-raccoon': 'https://demo.webfuse.com/+iframetest/?url=https%3A%2F%2Fraccoongame.com',
  'frame-tempmail': 'https://demo.webfuse.com/+iframetest/?url=https%3A%2F%2Ftempmail.ing'
};

function closeTempEmailFrames() {
  Object.keys(tempEmailUrls).forEach(id => {
    const frame = document.getElementById(id);
    if (frame) frame.src = 'about:blank';
  });
}

function openTempEmailFrames() {
  Object.entries(tempEmailUrls).forEach(([id, url]) => {
    const frame = document.getElementById(id);
    if (frame && (!frame.getAttribute('src') || frame.getAttribute('src') === 'about:blank')) frame.src = url;
  });
}

function switchSection(name) {
  const tempEmail = document.getElementById('temp-email');
  const leavingTempEmail = tempEmail?.classList.contains('active') && name !== 'temp-email';
  if (leavingTempEmail) {
    closeTempEmailFrames();
    if (document.fullscreenElement === tempEmail || document.webkitFullscreenElement === tempEmail) {
      exitFullscreenIfActive();
    }
  }
  sections.forEach(s => {
    document.getElementById(s)?.classList.toggle('active', s === name);
  });
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });

  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) topbarTitle.textContent = sectionTitles[name] || name;

  // Lazy-init sections
  if (name === 'movies' && !moviesInitialised) initMovies();
  if (name === 'games') renderGames();
  if (name === 'temp-email') openTempEmailFrames();

  // Reset scroll
  document.getElementById('main-content')?.scrollTo(0, 0);

  // Ignore parent controller navigation while a game/video is open in an iframe.
  if (document.getElementById('game-player-modal')?.classList.contains('hidden') === false ||
      document.getElementById('player-modal')?.classList.contains('hidden') === false ||
      document.getElementById('cloud-gaming')?.classList.contains('active')) {
    removeControllerFocus();
    buttonStates.a = false;
    buttonStates.b = false;
    buttonStates.y = false;
  }

  // Update focusable list for controller
  updateFocusableElements();
}

function getBrowserFrame() {
  return document.querySelectorAll('.browser-frame')[activeBrowserTab];
}

function browserGoBack() {
  getBrowserFrame()?.contentWindow.history.back();
}

function browserGoForward() {
  getBrowserFrame()?.contentWindow.history.forward();
}

function browserReload() {
  const frame = getBrowserFrame();
  if (frame) frame.contentWindow.location.reload();
}

function browserProxyUrl(input) {
  const value = input.trim();
  const isDomain = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/.*)?$/i.test(value);
  if (isDomain) {
    const domain = value.replace(/^https?:\/\//i, '');
    return `https://demo.webfuse.com/+iframetest/?url=https%3A%2F%2F${domain}`;
  }
  return `https://demo.webfuse.com/+iframetest/?url=https://search.brave.com/search?q=${encodeURIComponent(value)}`;
}

function renderBrowserTabs() {
  const tabs = document.getElementById('browser-tabs');
  if (!tabs) return;
  tabs.innerHTML = browserTabs.map((tab, index) => `
    <button class="browser-tab${index === activeBrowserTab ? ' active' : ''}" type="button" onclick="selectBrowserTab(${index})">
      <span class="browser-tab-dot">●</span>
      <span>${tab.title}</span>
      <span class="browser-tab-close" title="Close tab" aria-label="Close tab" onclick="closeBrowserTab(event, ${index})">&times;</span>
    </button>
  `).join('') + '<button class="browser-control" type="button" title="New tab" aria-label="New tab" onclick="newBrowserTab()">+</button>';

  document.querySelectorAll('.browser-frame').forEach((frame, index) => {
    frame.classList.toggle('active', index === activeBrowserTab);
  });
}

function selectBrowserTab(index) {
  const tab = browserTabs[index];
  if (!tab) return;
  activeBrowserTab = index;
  document.querySelectorAll('.browser-frame').forEach((frame, frameIndex) => {
    frame.classList.toggle('active', frameIndex === activeBrowserTab);
  });
  document.getElementById('browser-address').value = tab.url;
  renderBrowserTabs();
}

function newBrowserTab() {
  browserTabs.push({ title: 'New Tab', url: '' });
  const frames = document.getElementById('browser-frames');
  const frame = document.createElement('iframe');
  frame.className = 'browser-frame';
  frame.allow = 'fullscreen; autoplay';
  frame.id = `browser-frame-${browserTabs.length - 1}`;
  frame.src = 'about:blank';
  frames.appendChild(frame);
  selectBrowserTab(browserTabs.length - 1);
}

function closeBrowserTab(event, index) {
  event.stopPropagation();
  if (browserTabs.length === 1) {
    browserTabs[0] = { title: 'New Tab', url: '' };
    const frame = document.querySelector('.browser-frame');
    if (frame) frame.src = 'about:blank';
    selectBrowserTab(0);
    return;
  }
  browserTabs.splice(index, 1);
  document.getElementById(`browser-frame-${index}`)?.remove();
  activeBrowserTab = Math.min(activeBrowserTab, browserTabs.length - 1);
  selectBrowserTab(activeBrowserTab);
}

function browserSearch(input) {
  const value = input.trim();
  if (!value) return;
  const url = browserProxyUrl(value);
  const title = value.length > 24 ? `${value.slice(0, 24)}...` : value;
  browserTabs[activeBrowserTab] = { title, url };
  switchSection('browser');
  const frame = getBrowserFrame();
  if (frame) frame.src = url;
  document.getElementById('browser-address').value = url;
  renderBrowserTabs();
}

function browserSearchFromHome(event) {
  event.preventDefault();
  browserSearch(document.getElementById('home-browser-search').value);
}

function browserSearchFromTop(event) {
  event.preventDefault();
  browserSearch(document.getElementById('top-browser-search').value);
}

function browserNavigate() {
  const address = document.getElementById('browser-address');
  if (!address) return;
  browserSearch(address.value);
}

// FIXED: Wrap event listeners in DOMContentLoaded to ensure DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchSection(item.dataset.section));
  });

  document.querySelectorAll('.quick-card').forEach(card => {
    card.addEventListener('click', () => switchSection(card.dataset.goto));
  });

  document.getElementById('browser-address')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') browserNavigate();
  });
});

// ═══════════════════════════════════════════════════════════════
//  Theme System
// ═══════════════════════════════════════════════════════════════

const themes = {
  lime:    { name: 'Lime',     desc: 'Default vibe',   accent: '#84cc16', accent2: '#a3e635', bg: '#0a0d0c', surface: '#121614', surface2: '#191f1c', tile: '#4d7c0f' },
  blue:    { name: 'Ocean',    desc: 'Cool & calm',     accent: '#3b82f6', accent2: '#60a5fa', bg: '#0a0f1a', surface: '#111827', surface2: '#1e293b', tile: '#1d4ed8' },
  purple:  { name: 'Violet',   desc: 'Classic',         accent: '#7c6af7', accent2: '#a78bfa', bg: '#0d0d0f', surface: '#16161a', surface2: '#1e1e24', tile: '#4c3aaf' },
  red:     { name: 'Inferno',  desc: 'Bold & fiery',    accent: '#ef4444', accent2: '#f87171', bg: '#140a0a', surface: '#1e1111', surface2: '#2a1818', tile: '#b91c1c' },
  orange:  { name: 'Sunset',   desc: 'Warm glow',       accent: '#f59e0b', accent2: '#fbbf24', bg: '#14100a', surface: '#1e1810', surface2: '#2a2014', tile: '#b45309' },
  pink:    { name: 'Bubblegum', desc: 'Sweet & playful', accent: '#ec4899', accent2: '#f472b6', bg: '#140a10', surface: '#1e1018', surface2: '#2a1424', tile: '#be185d' },
  cyan:    { name: 'Glacier',  desc: 'Ice cold',         accent: '#06b6d4', accent2: '#22d3ee', bg: '#0a1014', surface: '#0f1a1e', surface2: '#162a30', tile: '#0891b2' },
  teal:    { name: 'Teal',     desc: 'Deep waters',      accent: '#14b8a6', accent2: '#2dd4bf', bg: '#0a1412', surface: '#0f1e1c', surface2: '#162826', tile: '#0f766e' },
};

let currentTheme = localStorage.getItem('theme') || 'lime';

function applyTheme(key) {
  const t = themes[key];
  if (!t) return;
  const root = document.documentElement.style;
  root.setProperty('--accent', t.accent);
  root.setProperty('--accent2', t.accent2);
  root.setProperty('--bg', t.bg);
  root.setProperty('--surface', t.surface);
  root.setProperty('--surface2', t.surface2);
  currentTheme = key;
  localStorage.setItem('theme', key);
  document.getElementById('preview-theme-name') &&
    (document.getElementById('preview-theme-name').textContent = t.name);
}

function buildPalette() {
  const palette = document.getElementById('color-palette');
  if (!palette) return;
  palette.innerHTML = Object.entries(themes).map(([key, t]) => `
    <div class="color-tile ${key === currentTheme ? 'active' : ''}" data-theme="${key}"
         style="background: linear-gradient(135deg, ${t.tile}, ${t.tile}cc);">
      <div class="color-tile-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div class="color-tile-swatch" style="background: linear-gradient(135deg, ${t.accent}, ${t.accent2});"></div>
      <div class="color-tile-name">${t.name}</div>
      <div class="color-tile-desc">${t.desc}</div>
    </div>
  `).join('');

  palette.querySelectorAll('.color-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      palette.querySelectorAll('.color-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      applyTheme(tile.dataset.theme);
      if (document.getElementById('home').classList.contains('active')) initParticles();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  HTML5 Games
// ═══════════════════════════════════════════════════════════════

// Add games directly in the page HTML:
// 1. Duplicate the .game-card block in index.html
// 2. Change data-game-file, data-game-title, and the text inside
// 3. No JavaScript array or render function is needed

function filterGames(query = '') {
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  const cards = [...grid.querySelectorAll('.game-card')];
  const term = query.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach(card => {
    const title = (card.dataset.name || card.querySelector('.game-card-name')?.textContent || '').toLowerCase();
    const match = !term || title.includes(term);
    card.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });

  updateGameCount();
}

function updateGameCount() {
  const grid = document.getElementById('games-grid');
  const statEl = document.getElementById('stat-games-count');
  if (!grid || !statEl) return;
  const cards = [...grid.querySelectorAll('.game-card')];
  const visible = cards.filter(c => c.style.display !== 'none');
  statEl.textContent = visible.length || cards.length;
}

function renderGames() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  const cards = [...grid.querySelectorAll('.game-card')];
  updateGameCount();

  cards.forEach(card => {
    if (card.dataset.bound === 'true') return;
    card.dataset.bound = 'true';

    const url = card.dataset.gameFile || card.dataset.url;
    const title = card.dataset.gameTitle || card.dataset.name || card.querySelector('.game-card-name')?.textContent?.trim() || 'Game';

    card.addEventListener('click', () => openGame(url, title));
  });

  const gamesSearch = document.getElementById('games-search');
  if (gamesSearch && !gamesSearch.dataset.bound) {
    gamesSearch.dataset.bound = 'true';
    gamesSearch.addEventListener('input', (e) => filterGames(e.target.value));
  }

  filterGames(gamesSearch?.value || '');
  updateFocusableElements();
}

function openGame(file, title) {
  removeControllerFocus();
  document.getElementById('game-player-title').textContent = title;
  document.getElementById('game-player-frame').src = file;
  document.getElementById('game-player-modal').classList.remove('hidden');
  buttonStates.a = false;
  buttonStates.b = false;
  buttonStates.y = false;
}

function closeGamePlayer() {
  document.getElementById('game-player-modal').classList.add('hidden');
  document.getElementById('game-player-frame').src = '';
  buttonStates.a = false;
  buttonStates.b = false;
  buttonStates.y = false;
  updateFocusableElements();
  exitFullscreenIfActive();
}

// ═══════════════════════════════════════════════════════════════
//  Fullscreen helper (used by game player, cloud gaming, movie player)
// ═══════════════════════════════════════════════════════════════

function toggleFullscreen(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  if (!isFullscreen) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
  }
}

function updateFullscreenUi() {
  const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  document.documentElement.classList.toggle('fullscreen-active', Boolean(isFullscreen));
}

document.addEventListener('fullscreenchange', updateFullscreenUi);
document.addEventListener('webkitfullscreenchange', updateFullscreenUi);
document.addEventListener('MSFullscreenChange', updateFullscreenUi);
updateFullscreenUi();

function exitFullscreenIfActive() {
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Movies (TMDB integration — kept from original)
// ═══════════════════════════════════════════════════════════════

const TMDB_KEY  = atob('NzAzMWE0MDgzMThlYTFiNjlhOGIzMGE4MjNmOWRkNTc=');
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w342';
const TOUSTREAM = 'https://demo.webfuse.com/+iframetest/?url=https%3A%2F%2Fmappl.tv/watch/movie/';
const TOUSTREAM_TV = 'https://demo.webfuse.com/+iframetest/?url=https%3A%2F%2Fmappl.tv/embed/movie/tou';

let moviesInitialised = false;
let currentMovieTab   = 'movies';
let searchTimer       = null;
let currentShowId     = null;

function initMovies() {
  moviesInitialised = true;
  fetchMovies();
}

function switchMovieTab(tab) {
  currentMovieTab = tab;
  document.getElementById('tab-movies').classList.toggle('active', tab === 'movies');
  document.getElementById('tab-shows').classList.toggle('active', tab === 'shows');
  document.getElementById('movies-search').value = '';
  fetchMovies();
}

function handleMovieSearch(val) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    val.trim() ? searchContent(val.trim()) : fetchMovies();
  }, 400);
}

async function fetchJsonWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMovies() {
  showMoviesLoading();
  try {
    const endpoint = currentMovieTab === 'movies'
      ? `${TMDB_BASE}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`
      : `${TMDB_BASE}/tv/popular?api_key=${TMDB_KEY}&language=en-US&page=1`;
    const data = await fetchJsonWithTimeout(endpoint);
    renderGrid(data.results, currentMovieTab);
  } catch {
    showMoviesError();
  }
}

async function searchContent(query) {
  showMoviesLoading();
  try {
    const type = currentMovieTab === 'movies' ? 'movie' : 'tv';
    const endpoint = `${TMDB_BASE}/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`;
    const data = await fetchJsonWithTimeout(endpoint);
    renderGrid(data.results, currentMovieTab);
  } catch {
    showMoviesError();
  }
}

function renderGrid(items, type) {
  const grid = document.getElementById('movies-grid');
  if (!items || items.length === 0) {
    grid.innerHTML = `<div class="movies-loading"><span>No results found.</span></div>`;
    return;
  }
  grid.innerHTML = items.map(item => {
    const title     = type === 'movies' ? item.title : item.name;
    const year      = (type === 'movies' ? item.release_date : item.first_air_date || '').slice(0, 4);
    const poster    = item.poster_path ? TMDB_IMG + item.poster_path : null;
    const rating    = item.vote_average ? item.vote_average.toFixed(1) : '';
    const safeTitle = title.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="movie-card" onclick="openContent(${item.id}, '${type}', '${safeTitle}')">
        ${poster
          ? `<img src="${poster}" alt="${safeTitle}" loading="lazy">`
          : `<div class="movie-card-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 8h20M7 4v4M17 4v4"/>
              </svg>
             </div>`
        }
        ${rating
          ? `<div class="movie-card-badge">
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${rating}
             </div>`
          : ''
        }
        <div class="movie-card-info">
          <div class="movie-card-title">${title}</div>
          <div class="movie-card-year">${year}</div>
        </div>
      </div>`;
  }).join('');
  updateFocusableElements();
}

function showMoviesLoading() {
  document.getElementById('movies-grid').innerHTML =
    `<div class="movies-loading"><div class="movies-spinner"></div><span>Loading...</span></div>`;
}

function showMoviesError() {
  document.getElementById('movies-grid').innerHTML =
    `<div class="movies-loading"><span>Failed to load. Check your connection.</span></div>`;
}

async function openContent(id, type, title) {
  document.getElementById('player-title').textContent = title;
  document.getElementById('player-modal').classList.remove('hidden');
  const epSel = document.getElementById('episode-selector');
  if (type === 'movies') {
    epSel.classList.add('hidden');
    document.getElementById('player-frame').src = `${TOUSTREAM}${id}`;
  } else {
    currentShowId = id;
    epSel.classList.remove('hidden');
    document.getElementById('player-frame').src = '';
    await loadSeasons(id);
  }
}

async function loadSeasons(showId) {
  try {
    const data = await fetchJsonWithTimeout(`${TMDB_BASE}/tv/${showId}?api_key=${TMDB_KEY}`);
    const sel  = document.getElementById('season-select');
    sel.innerHTML = data.seasons
      .filter(s => s.season_number > 0)
      .map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`)
      .join('');
    await loadEpisodes();
  } catch (e) { console.error(e); }
}

async function loadEpisodes() {
  const season = document.getElementById('season-select').value;
  try {
    const data = await fetchJsonWithTimeout(`${TMDB_BASE}/tv/${currentShowId}/season/${season}?api_key=${TMDB_KEY}`);
    const sel  = document.getElementById('episode-select');
    sel.innerHTML = (data.episodes || [])
      .map(ep => `<option value="${ep.episode_number}">Ep ${ep.episode_number}: ${ep.name}</option>`)
      .join('');
    playEpisode();
  } catch (e) { console.error(e); }
}

function playEpisode() {
  const season  = document.getElementById('season-select').value;
  const episode = document.getElementById('episode-select').value;
  document.getElementById('player-frame').src =
    `${TOUSTREAM_TV}/tv/${currentShowId}/${season}/${episode}`;
}

function closePlayer() {
  document.getElementById('player-modal').classList.add('hidden');
  document.getElementById('player-frame').src = '';
  exitFullscreenIfActive();
}

// ═══════════════════════════════════════════════════════════════
//  Cosmic Background (Home) — Aurora orbs, twinkling stars,
//  constellation net, and shooting stars
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('particles-canvas');
const ctx    = canvas ? canvas.getContext('2d') : null;
let pts = [];
let stars = [];
let orbs = [];
let meteor = null;
let meteorTimer = 300;
let animFrame;
const cosmicStarColors = ['#ffffff', '#7dd3fc', '#a7f3d0', '#fef08a', '#f9a8d4', '#c4b5fd'];

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

function initParticles() {
  if (!canvas || !ctx) return;
  cancelAnimationFrame(animFrame);
  resizeCanvas();

  const w = canvas.width, h = canvas.height;
  const area = w * h;

  // Distant twinkling star field
  stars = [];
  const starCount = Math.floor(area / 18000);
  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.35,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.02,
      color: cosmicStarColors[Math.floor(Math.random() * cosmicStarColors.length)],
      flare: Math.random() > 0.72,
    });
  }

  // Brighter constellation nodes (connecting web)
  pts = [];
  const count = Math.floor(area / 14000);
  for (let i = 0; i < count; i++) {
    pts.push({
      x:     Math.random() * w,
      y:     Math.random() * h,
      r:     Math.random() * 1.8 + 0.4,
      dx:    (Math.random() - 0.5) * 0.32,
      dy:    (Math.random() - 0.5) * 0.32,
      alpha: Math.random() * 0.5 + 0.15,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.04,
    });
  }

  // Slow-flowing aurora gradient blobs (theme tinted)
  orbs = [
    { x: w * 0.22, y: h * 0.18, r: Math.max(w, h) * 0.52, vx: 0.18, vy: 0.09, alpha: 0.13 },
    { x: w * 0.80, y: h * 0.30, r: Math.max(w, h) * 0.44, vx: -0.14, vy: 0.07, alpha: 0.10 },
    { x: w * 0.50, y: h * 0.95, r: Math.max(w, h) * 0.58, vx: 0.10, vy: -0.08, alpha: 0.09 },
  ];

  draw();
}

function draw() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const accent  = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#84cc16';
  const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim() || '#a3e635';
  const rgb  = hexToRgb(accent);
  const rgb2 = hexToRgb(accent2);
  const t = performance.now() / 1000;

  const holeX = canvas.width * 0.78;
  const holeY = canvas.height * 0.24;
  const holeSize = Math.max(96, Math.min(canvas.width, canvas.height) * 0.24);
  ctx.save();
  ctx.translate(holeX, holeY);
  ctx.rotate(-0.14);
  ctx.scale(1, 0.38);
  ctx.shadowBlur = holeSize * 0.16;
  ctx.shadowColor = '#ff6b35';
  const disk = ctx.createRadialGradient(0, 0, holeSize * 0.18, 0, 0, holeSize * 1.25);
  disk.addColorStop(0, 'rgba(4,5,12,1)');
  disk.addColorStop(0.2, 'rgba(8,7,16,1)');
  disk.addColorStop(0.28, 'rgba(255,235,142,0.95)');
  disk.addColorStop(0.42, 'rgba(255,109,31,0.78)');
  disk.addColorStop(0.62, 'rgba(227,38,34,0.35)');
  disk.addColorStop(0.82, 'rgba(105,24,62,0.12)');
  disk.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.arc(0, 0, holeSize * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#020308';
  ctx.beginPath();
  ctx.arc(0, 0, holeSize * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Aurora gradient orbs ──
  orbs.forEach(o => {
    o.x += o.vx; o.y += o.vy;
    if (o.x < -o.r) o.x = canvas.width + o.r;
    if (o.x > canvas.width + o.r) o.x = -o.r;
    if (o.y < -o.r) o.y = canvas.height + o.r;
    if (o.y > canvas.height + o.r) o.y = -o.r;

    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0,   `rgba(${rgb},${o.alpha})`);
    g.addColorStop(0.5, `rgba(${rgb2},${o.alpha * 0.45})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  // ── Twinkling star field ──
  stars.forEach(s => {
    const a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed * 4 + s.phase));
    const color = s.color;
    if (s.flare) {
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = color;
      ctx.strokeStyle = `rgba(${hexToRgb(color)},${a})`;
      ctx.globalAlpha = a;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(s.x - 7, s.y); ctx.lineTo(s.x + 7, s.y);
      ctx.moveTo(s.x, s.y - 7); ctx.lineTo(s.x, s.y + 7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // ── Constellation connections ──
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 120) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${rgb},${0.10*(1-d/120)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
  }

  // ── Pulsing glow nodes ──
  pts.forEach(p => {
    p.pulse += p.pulseSpeed;
    const glow = 0.5 + 0.5 * Math.sin(p.pulse);
    const size = p.r * (1 + glow * 0.6);

    // Soft halo
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},${p.alpha * 0.12 * glow})`;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb2},${p.alpha})`;
    ctx.fill();

    p.x += p.dx; p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
  });

  // ── Shooting star (rare flair) ──
  meteorTimer--;
  if (!meteor && meteorTimer <= 0) {
    meteor = {
      x: Math.random() * canvas.width * 0.6 + canvas.width * 0.2,
      y: Math.random() * canvas.height * 0.3,
      vx: -(3 + Math.random() * 3),
      vy: 1.2 + Math.random() * 1.4,
      life: 1,
    };
    meteorTimer = 350 + Math.random() * 500;
  }
  if (meteor) {
    meteor.x += meteor.vx;
    meteor.y += meteor.vy;
    meteor.life -= 0.018;

    const tail = 8;
    var grad = ctx.createLinearGradient(
      meteor.x, meteor.y,
      meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail
    );
    grad.addColorStop(0, `rgba(255,255,255,${0.9 * meteor.life})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(meteor.x, meteor.y);
    ctx.lineTo(meteor.x - meteor.vx * tail, meteor.y - meteor.vy * tail);
    ctx.stroke();

    if (meteor.life <= 0) meteor = null;
  }

  animFrame = requestAnimationFrame(draw);
}

window.addEventListener('resize', () => {
  if (document.getElementById('home').classList.contains('active')) initParticles();
});

// ═══════════════════════════════════════════════════════════════
//  Input Device Detection (Controller + Mouse)
// ═══════════════════════════════════════════════════════════════

let gamepadConnected = false;
let mouseConnected   = false;
let mouseTimer       = null;

// --- Mouse detection ---
function detectMouse() {
  if (!mouseConnected) {
    mouseConnected = true;
    document.getElementById('mouse-badge')?.classList.add('active');
  }
  clearTimeout(mouseTimer);
  mouseTimer = setTimeout(() => {
    mouseConnected = false;
    document.getElementById('mouse-badge')?.classList.remove('active');
  }, 5000);
}

document.addEventListener('mousemove', detectMouse);
document.addEventListener('mousedown', detectMouse);

// --- Gamepad (Controller) detection ---
let buttonStates = { a: false, b: false, x: false, y: false, lb: false, rb: false, back: false, start: false, lt: false, rt: false, 'left-stick-click': false, 'right-stick-click': false };
let focusableElements = [];
let focusIndex = -1;

function detectGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) {
      if (!gamepadConnected) {
        gamepadConnected = true;
        document.getElementById('controller-badge')?.classList.add('active');
        updateFocusableElements();
      }
      handleGamepadInput(gamepads[i]);
      return; // Process only first connected gamepad
    }
  }
  if (gamepadConnected) {
    gamepadConnected = false;
    document.getElementById('controller-badge')?.classList.remove('active');
    removeControllerFocus();
  }
}

function handleGamepadInput(gamepad) {
  // Buttons mapping: A=0, B=1, X=2, Y=3, LB=4, RB=5, Back=8, Start=9, Left Stick=10, Right Stick=11
  const buttons = {
    a: gamepad.buttons[0]?.pressed || false,
    b: gamepad.buttons[1]?.pressed || false,
    x: gamepad.buttons[2]?.pressed || false,
    y: gamepad.buttons[3]?.pressed || false,
    lb: gamepad.buttons[4]?.pressed || false,
    rb: gamepad.buttons[5]?.pressed || false,
    back: gamepad.buttons[8]?.pressed || false,
    start: gamepad.buttons[9]?.pressed || false,
    'left-stick-click': gamepad.buttons[10]?.pressed || false,
    'right-stick-click': gamepad.buttons[11]?.pressed || false,
  };

  // Detect button presses (on state change from false to true)
  if (buttons.a && !buttonStates.a) navigationController('select');
  if (buttons.b && !buttonStates.b) navigationController('back');
  if (buttons.up || (gamepad.axes[1] < -0.5)) navigationController('up');
  if (buttons.down || (gamepad.axes[1] > 0.5)) navigationController('down');
  if (buttons.left || (gamepad.axes[0] < -0.5)) navigationController('left');
  if (buttons.right || (gamepad.axes[0] > 0.5)) navigationController('right');

  // Update button states
  buttonStates = buttons;
}

function navigationController(direction) {
  if (focusableElements.length === 0) return;
  if (focusIndex === -1) focusIndex = 0;

  switch (direction) {
    case 'select':
      focusableElements[focusIndex]?.click?.();
      break;
    case 'back':
      // Close modals if open
      if (!document.getElementById('game-player-modal')?.classList.contains('hidden')) {
        closeGamePlayer();
      } else if (!document.getElementById('player-modal')?.classList.contains('hidden')) {
        closePlayer();
      }
      break;
    case 'up':
    case 'left':
      focusIndex = (focusIndex - 1 + focusableElements.length) % focusableElements.length;
      updateControllerFocus();
      break;
    case 'down':
    case 'right':
      focusIndex = (focusIndex + 1) % focusableElements.length;
      updateControllerFocus();
      break;
  }
}

function updateFocusableElements() {
  const hiddenModal = document.getElementById('game-player-modal')?.classList.contains('hidden') !== false;
  const closedPlayer = document.getElementById('player-modal')?.classList.contains('hidden') !== false;

  if (!hiddenModal || !closedPlayer) {
    focusableElements = [];
    focusIndex = -1;
    return;
  }

  focusableElements = [...document.querySelectorAll('.nav-item, .quick-card, button:not(.hidden *)')].filter(el => {
    return el.offsetParent !== null;
  });
  focusIndex = -1;
  removeControllerFocus();
}

function updateControllerFocus() {
  removeControllerFocus();
  if (focusableElements[focusIndex]) {
    focusableElements[focusIndex].style.outline = '2px solid var(--accent)';
    focusableElements[focusIndex].style.outlineOffset = '2px';
  }
}

function removeControllerFocus() {
  focusableElements.forEach(el => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  });
}

// Gamepad polling (check every 100ms since gamepads don't have reliable events)
setInterval(detectGamepad, 100);

// Initialize theme
applyTheme(currentTheme);
buildPalette();
initParticles();
detectMouse(); // assume mouse is present on load
renderGames();
