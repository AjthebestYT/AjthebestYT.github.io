// ═══════════════════════════════════════════════════════════════
//  Navigation
// ═══════════════════════════════════════════════════════════════

const sections = ['home', 'cloud-gaming', 'games', 'movies', 'account', 'settings', 'temp-email'];

const sectionTitles = {
  'home': 'Home',
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
    btnElement.style.background = '#84cc16';
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

function switchSection(name) {
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
  if (name === 'temp-email' && !tempEmailInitialised) {
    tempEmailInitialised = true;
    const defaultBtn = document.querySelector('#temp-email .tab-btn');
    if (defaultBtn) switchTab('tab-raccoon', 'https://raccoongame.com/', defaultBtn);
  }

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

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchSection(item.dataset.section));
});

document.querySelectorAll('.quick-card').forEach(card => {
  card.addEventListener('click', () => switchSection(card.dataset.goto));
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

  const statEl = document.getElementById('stat-games-count');
  if (statEl) statEl.textContent = visibleCount;
}

function renderGames() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  const cards = [...grid.querySelectorAll('.game-card')];
  const statEl = document.getElementById('stat-games-count');
  if (statEl) statEl.textContent = cards.length;

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
const TOUSTREAM = 'https://toustream-mtv.movietrunk.com/tou';

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
    document.getElementById('player-frame').src = `${TOUSTREAM}/movies/${id}`;
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
    `${TOUSTREAM}/tv/${currentShowId}/${season}/${episode}`;
}

function closePlayer() {
  document.getElementById('player-modal').classList.add('hidden');
  document.getElementById('player-frame').src = '';
  exitFullscreenIfActive();
}

// ═══════════════════════════════════════════════════════════════
//  Particle Background (Home)
// ═══════════════════════════════════════════════════════════════

const canvas = document.getElementById('particles-canvas');
const ctx    = canvas ? canvas.getContext('2d') : null;
let pts = [];
let animFrame;

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
  const count = Math.floor((canvas.width * canvas.height) / 12000);
  pts = [];
  for (let i = 0; i < count; i++) {
    pts.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.6 + 0.3,
      dx:    (Math.random() - 0.5) * 0.28,
      dy:    (Math.random() - 0.5) * 0.28,
      alpha: Math.random() * 0.45 + 0.1,
    });
  }
  draw();
}

function draw() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const accent  = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent2').trim();
  const rgb  = hexToRgb(accent);
  const rgb2 = hexToRgb(accent2);

  const g = ctx.createRadialGradient(canvas.width*0.25, canvas.height*0.2, 0, canvas.width*0.25, canvas.height*0.2, canvas.width*0.65);
  g.addColorStop(0,   `rgba(${rgb},0.08)`);
  g.addColorStop(0.6, `rgba(${rgb},0.02)`);
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 110) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${rgb},${0.09*(1-d/110)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
  }

  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${rgb2},${p.alpha})`;
    ctx.fill();
    p.x += p.dx; p.y += p.dy;
    if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
  });

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

// --- Controller / Gamepad support ---
const buttonStates = { a: false, b: false, y: false, x: false, lb: false, rb: false };
let focusableElements = [];
let focusedIndex = -1;
let lastStickMove = 0;
const STICK_COOLDOWN = 180;

function updateFocusableElements() {
  const activeSection = document.querySelector('.section.active');
  const candidates = [];

  document.querySelectorAll('.nav-item').forEach(el => candidates.push(el));

  if (activeSection) {
    activeSection.querySelectorAll(
      '.quick-card, .game-card, .movie-card, .movies-tab, .account-tab, .account-btn, .player-btn, button, [data-goto], [data-section]'
    ).forEach(el => {
      if (candidates.includes(el)) return;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
      candidates.push(el);
    });
  }

  focusableElements = candidates.filter(el => el && el.offsetParent !== null);
  if (focusedIndex >= focusableElements.length) {
    removeControllerFocus();
  }
}

function removeControllerFocus() {
  document.querySelectorAll('.focused-by-controller').forEach(el => {
    el.classList.remove('focused-by-controller');
  });
  focusedIndex = -1;
}

function setControllerFocus(index) {
  if (!focusableElements.length) return;
  removeControllerFocus();
  focusedIndex = ((index % focusableElements.length) + focusableElements.length) % focusableElements.length;
  const el = focusableElements[focusedIndex];
  if (el) {
    el.classList.add('focused-by-controller');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function activateFocused() {
  if (focusedIndex < 0 || !focusableElements[focusedIndex]) return;
  focusableElements[focusedIndex].click();
}

function showControllerToast(msg) {
  const toast = document.getElementById('input-toast');
  if (!toast) return;
  const textEl = toast.querySelector('.toast-text');
  if (textEl) textEl.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showControllerToast._timer);
  showControllerToast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function onGamepadConnected() {
  gamepadConnected = true;
  document.getElementById('controller-badge')?.classList.add('active');
  showControllerToast('Controller connected');
  updateFocusableElements();
  if (focusedIndex < 0 && focusableElements.length) setControllerFocus(0);
}

function onGamepadDisconnected() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const any = Array.from(pads).some(p => p);
  if (!any) {
    gamepadConnected = false;
    document.getElementById('controller-badge')?.classList.remove('active');
    removeControllerFocus();
    showControllerToast('Controller disconnected');
  }
}

window.addEventListener('gamepadconnected', onGamepadConnected);
window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

function pollGamepads() {
  if (!navigator.getGamepads) {
    requestAnimationFrame(pollGamepads);
    return;
  }

  const pads = navigator.getGamepads();
  let activePad = null;
  for (let i = 0; i < pads.length; i++) {
    if (pads[i]) { activePad = pads[i]; break; }
  }

  if (!activePad) {
    if (gamepadConnected) {
      gamepadConnected = false;
      document.getElementById('controller-badge')?.classList.remove('active');
      removeControllerFocus();
    }
    requestAnimationFrame(pollGamepads);
    return;
  }

  if (!gamepadConnected) onGamepadConnected();

  const buttons = activePad.buttons;
  const axes = activePad.axes;
  const pressed = (i) => buttons[i] && (buttons[i].pressed || buttons[i].value > 0.5);
  const now = performance.now();

  if (pressed(12) || (axes[1] < -0.55)) {
    if (now - lastStickMove > STICK_COOLDOWN) {
      setControllerFocus(focusedIndex <= 0 ? focusableElements.length - 1 : focusedIndex - 1);
      lastStickMove = now;
    }
  } else if (pressed(13) || (axes[1] > 0.55)) {
    if (now - lastStickMove > STICK_COOLDOWN) {
      setControllerFocus(focusedIndex + 1);
      lastStickMove = now;
    }
  } else if (pressed(14) || (axes[0] < -0.55)) {
    if (now - lastStickMove > STICK_COOLDOWN) {
      setControllerFocus(focusedIndex <= 0 ? focusableElements.length - 1 : focusedIndex - 1);
      lastStickMove = now;
    }
  } else if (pressed(15) || (axes[0] > 0.55)) {
    if (now - lastStickMove > STICK_COOLDOWN) {
      setControllerFocus(focusedIndex + 1);
      lastStickMove = now;
    }
  }

  const aNow = pressed(0);
  const bNow = pressed(1);
  const yNow = pressed(3);

  if (aNow && !buttonStates.a) activateFocused();
  if (bNow && !buttonStates.b) {
    if (!document.getElementById('game-player-modal')?.classList.contains('hidden')) {
      closeGamePlayer();
    } else if (!document.getElementById('player-modal')?.classList.contains('hidden')) {
      if (typeof closePlayer === 'function') closePlayer();
    }
  }

  buttonStates.a = aNow;
  buttonStates.b = bNow;
  buttonStates.y = yNow;

  requestAnimationFrame(pollGamepads);
}

requestAnimationFrame(pollGamepads);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateFocusableElements);
} else {
  updateFocusableElements();
    }
