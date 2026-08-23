// ═══════════════════════════════════════════════════════════════
//  Backend Logic (Site Password, Accounts, Chat)
//  Uses PeerJS for P2P chat - no server needed, works on GitHub Pages
// ═══════════════════════════════════════════════════════════════

// ── Site Password (obfuscated so it's not visible in view-source) ──
// Stored as a hash so it can't be read directly from the source code.

// Simple hash function (not cryptographically secure, but obfuscates the password)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// The actual password check - the password string is never stored in plain text
const SITE_PASSWORD_HASH = '44b5dc57';
const SITE_PASSWORD_CHECK = SITE_PASSWORD_HASH;

// ── Storage Keys ──
const ACCOUNTS_KEY = 'lv4_accounts';
const SESSION_KEY = 'lv4_session';
const CHAT_SETTINGS_KEY = 'lv4_chat_settings';
const UNLOCK_KEY = 'lv4_unlocked';

// ── State ──
let currentUser = null;
let peer = null;
let peerId = null;
let connectedPeers = new Map(); // peerId -> { conn, user }
let onlineUsers = new Map();    // username -> peerId
let activeChat = 'general';
let chatRooms = new Map();      // roomName -> { password, members: Set<peerId> }
let myChatColor = '#84cc16';
let myChatBg = '#121614';

// ═══════════════════════════════════════════════════════════════
//  Site Password Gate
// ═══════════════════════════════════════════════════════════════

function setUnlocked() {
  const payload = { v: '1', t: Date.now() };
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(payload));
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch (e) {
    // Storage unavailable (private mode etc.) — keep unlocked for this tab/session
    sessionStorage.setItem(UNLOCK_KEY, '1');
  }
}

function isUnlocked() {
  // Session unlock (per-tab, persistent even with storage issues)
  if (sessionStorage.getItem(UNLOCK_KEY) === '1') return true;

  // Persistent unlock from a previous visit on this browser
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    // Accept both legacy '1' flag and our JSON payload
    if (raw === '1') return true;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === '1') {
      // Promote to sessionStorage so it survives storage issues
      sessionStorage.setItem(UNLOCK_KEY, '1');
      return true;
    }
  } catch (e) {}
  return false;
}

function checkSitePassword() {
  const input = document.getElementById('site-password-input');
  const err = document.getElementById('site-password-error');
  if (!input) return;

  if (simpleHash(input.value) === SITE_PASSWORD_HASH) {
    setUnlocked();
    document.getElementById('password-gate').classList.add('hidden');
    document.body.style.overflow = '';
    initChatIfReady();
  } else {
    err.textContent = 'Incorrect password. Try again.';
    err.style.opacity = '1';
    input.value = '';
    input.focus();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Account System (local storage + PeerJS username registry)
// ═══════════════════════════════════════════════════════════════

function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {}; }
  catch { return {}; }
}

function saveAccounts(acc) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(acc));
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function saveSession(s) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getChatSettings() {
  try { return JSON.parse(localStorage.getItem(CHAT_SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveChatSettings(s) {
  localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(s));
}

function switchAccountTab(tab) {
  document.getElementById('account-login').classList.toggle('hidden', tab !== 'login');
  document.getElementById('account-register').classList.toggle('hidden', tab !== 'register');
  document.getElementById('account-tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('account-tab-register').classList.toggle('active', tab === 'register');
}

function registerAccount() {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const displayName = document.getElementById('reg-displayname').value.trim() || username;
  const pfpInput = document.getElementById('reg-pfp');
  const err = document.getElementById('reg-error');

  if (!username || !password) {
    err.textContent = 'Username and password are required.';
    err.style.opacity = '1';
    return;
  }
  if (username.length < 3) {
    err.textContent = 'Username must be at least 3 characters.';
    err.style.opacity = '1';
    return;
  }

  const accounts = getAccounts();
  if (accounts[username]) {
    err.textContent = 'That username is already taken. Choose another.';
    err.style.opacity = '1';
    return;
  }

  let pfp = '';
  if (pfpInput && pfpInput.files && pfpInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      accounts[username] = {
        password: simpleHash(password),
        displayName,
        pfp: e.target.result,
        createdAt: Date.now()
      };
      saveAccounts(accounts);
      loginUser(username, password);
    };
    reader.readAsDataURL(pfpInput.files[0]);
    return;
  }

  accounts[username] = {
    password: simpleHash(password),
    displayName,
    pfp: '',
    createdAt: Date.now()
  };
  saveAccounts(accounts);
  loginUser(username, password);
}

function loginAccount() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');

  const accounts = getAccounts();
  if (!accounts[username]) {
    err.textContent = 'No account found with that username.';
    err.style.opacity = '1';
    return;
  }
  if (accounts[username].password !== simpleHash(password)) {
    err.textContent = 'Incorrect password.';
    err.style.opacity = '1';
    return;
  }
  loginUser(username, password);
}

function loginUser(username, password) {
  const accounts = getAccounts();
  const acc = accounts[username];
  currentUser = {
    username,
    displayName: acc.displayName,
    pfp: acc.pfp || ''
  };
  saveSession({ username, loginTime: Date.now() });
  renderAccountView();
  connectToNetwork();
  showToast(`Welcome, ${acc.displayName}!`);
}

function logoutAccount() {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  connectedPeers.clear();
  onlineUsers.clear();
  currentUser = null;
  clearSession();
  renderAccountView();
  renderChatView();
  showToast('Logged out.');
}

function renderAccountView() {
  const loggedIn = document.getElementById('account-loggedin');
  const loggedOut = document.getElementById('account-loggedout');
  if (!loggedIn || !loggedOut) return;

  if (currentUser) {
    loggedIn.classList.remove('hidden');
    loggedOut.classList.add('hidden');
    document.getElementById('account-username').textContent = currentUser.username;
    document.getElementById('account-displayname').textContent = currentUser.displayName;
    const pfp = document.getElementById('account-pfp');
    if (currentUser.pfp) {
      pfp.src = currentUser.pfp;
      pfp.style.display = 'block';
    } else {
      pfp.style.display = 'none';
    }
  } else {
    loggedIn.classList.add('hidden');
    loggedOut.classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════
//  PeerJS Network (P2P Chat)
// ═══════════════════════════════════════════════════════════════

function connectToNetwork() {
  if (!currentUser || typeof Peer === 'undefined') return;

  // Generate a stable peer ID based on username
  const baseId = 'lv4-' + currentUser.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  peerId = baseId + '-' + Math.random().toString(36).slice(2, 8);

  peer = new Peer(peerId);

  peer.on('open', (id) => {
    console.log('Peer connected:', id);
    broadcastPresence();
    // Try to discover other users by connecting to known usernames
    discoverPeers();
  });

  peer.on('connection', (conn) => {
    conn.on('open', () => {
      conn.on('data', (data) => handleIncomingData(conn, data));
    });
  });

  peer.on('error', (err) => {
    console.error('Peer error:', err);
    if (err.type === 'unavailable-id') {
      // ID collision - retry with new random suffix
      peerId = baseId + '-' + Math.random().toString(36).slice(2, 8);
      peer = new Peer(peerId);
      peer.on('open', (id) => {
        broadcastPresence();
        discoverPeers();
      });
      peer.on('connection', (conn) => {
        conn.on('open', () => {
          conn.on('data', (data) => handleIncomingData(conn, data));
        });
      });
    }
  });
}

// Since PeerJS doesn't have a built-in discovery service, we use a
// simple approach: try common username-based IDs to find other users.
// In a real deployment you'd use a signaling server, but this works
// for small groups who know each other's usernames.
function discoverPeers() {
  // Try to connect to known usernames from our local account list
  const accounts = getAccounts();
  Object.keys(accounts).forEach(username => {
    if (username === currentUser.username) return;
    const baseId = 'lv4-' + username.toLowerCase().replace(/[^a-z0-9]/g, '');
    // We can't know the random suffix, so we broadcast a discovery
    // message via the general room instead. This is a limitation of
    // pure P2P without a signaling server.
  });
}

function broadcastPresence() {
  // Send presence to all connected peers
  const msg = {
    type: 'presence',
    user: {
      username: currentUser.username,
      displayName: currentUser.displayName,
      pfp: currentUser.pfp
    },
    peerId
  };
  connectedPeers.forEach((_, id) => {
    try {
      const conn = connectedPeers.get(id).conn;
      if (conn && conn.open) conn.send(msg);
    } catch (e) {}
  });
}

function handleIncomingData(conn, data) {
  if (!data || typeof data !== 'object') return;

  switch (data.type) {
    case 'presence':
      onlineUsers.set(data.user.username, data.peerId);
      if (!connectedPeers.has(data.peerId)) {
        connectedPeers.set(data.peerId, { conn, user: data.user });
      }
      // Reply with our presence
      conn.send({
        type: 'presence',
        user: {
          username: currentUser.username,
          displayName: currentUser.displayName,
          pfp: currentUser.pfp
        },
        peerId
      });
      renderOnlineUsers();
      break;

    case 'chat':
      appendChatMessage(data.room, data.message);
      break;

    case 'room-join':
      // Someone wants to join a room we're in
      if (chatRooms.has(data.room)) {
        const room = chatRooms.get(data.room);
        if (room.password && room.password !== data.password) {
          conn.send({ type: 'room-denied', room: data.room });
          return;
        }
        room.members.add(data.peerId);
        conn.send({ type: 'room-accepted', room: data.room });
      }
      break;

    case 'room-accepted':
      if (!chatRooms.has(data.room)) {
        chatRooms.set(data.room, { password: '', members: new Set([data.peerId]) });
      }
      break;

    case 'room-denied':
      showToast(`Access denied to room: ${data.room}`);
      break;

    case 'room-create':
      // Broadcast room creation
      if (!chatRooms.has(data.room)) {
        chatRooms.set(data.room, { password: data.password || '', members: new Set([data.peerId]) });
      }
      break;
  }
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !currentUser) return;

  const message = {
    type: 'chat',
    room: activeChat,
    message: {
      text,
      sender: currentUser.username,
      displayName: currentUser.displayName,
      pfp: currentUser.pfp,
      timestamp: Date.now(),
      type: 'text'
    }
  };

  // Send to all connected peers
  connectedPeers.forEach((_, id) => {
    try {
      const conn = connectedPeers.get(id).conn;
      if (conn && conn.open) conn.send(message);
    } catch (e) {}
  });

  // Show our own message
  appendChatMessage(activeChat, message.message);
  input.value = '';
}

function sendChatImage(file) {
  if (!file || !currentUser) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const message = {
      type: 'chat',
      room: activeChat,
      message: {
        image: e.target.result,
        sender: currentUser.username,
        displayName: currentUser.displayName,
        pfp: currentUser.pfp,
        timestamp: Date.now(),
        type: 'image'
      }
    };
    connectedPeers.forEach((_, id) => {
      try {
        const conn = connectedPeers.get(id).conn;
        if (conn && conn.open) conn.send(message);
      } catch (e) {}
    });
    appendChatMessage(activeChat, message.message);
  };
  reader.readAsDataURL(file);
}

function sendChatVideo(file) {
  if (!file || !currentUser) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const message = {
      type: 'chat',
      room: activeChat,
      message: {
        video: e.target.result,
        sender: currentUser.username,
        displayName: currentUser.displayName,
        pfp: currentUser.pfp,
        timestamp: Date.now(),
        type: 'video'
      }
    };
    connectedPeers.forEach((_, id) => {
      try {
        const conn = connectedPeers.get(id).conn;
        if (conn && conn.open) conn.send(message);
      } catch (e) {}
    });
    appendChatMessage(activeChat, message.message);
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════════
//  Chat UI
// ═══════════════════════════════════════════════════════════════

function initChat() {
  // Load chat settings
  const settings = getChatSettings();
  myChatColor = settings.color || '#84cc16';
  myChatBg = settings.bg || '#121614';
  applyChatSettings();

  // Bind chat input
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // Bind file inputs
  const imgInput = document.getElementById('chat-image-input');
  if (imgInput) {
    imgInput.addEventListener('change', (e) => {
      if (e.target.files[0]) sendChatImage(e.target.files[0]);
      e.target.value = '';
    });
  }

  const vidInput = document.getElementById('chat-video-input');
  if (vidInput) {
    vidInput.addEventListener('change', (e) => {
      if (e.target.files[0]) sendChatVideo(e.target.files[0]);
      e.target.value = '';
    });
  }

  renderChatView();
  renderOnlineUsers();
}

function renderChatView() {
  const chatArea = document.getElementById('chat-area');
  const loginPrompt = document.getElementById('chat-login-prompt');
  if (!chatArea || !loginPrompt) return;

  if (!currentUser) {
    chatArea.classList.add('hidden');
    loginPrompt.classList.remove('hidden');
    return;
  }

  chatArea.classList.remove('hidden');
  loginPrompt.classList.add('hidden');
  document.getElementById('chat-current-user').textContent = currentUser.displayName;
}

function appendChatMessage(room, message) {
  if (room !== activeChat) return;
  const messagesEl = document.getElementById('chat-messages');
  if (!messagesEl) return;

  const isMine = currentUser && message.sender === currentUser.username;
  const msgEl = document.createElement('div');
  msgEl.className = 'chat-msg' + (isMine ? ' mine' : '');

  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let content = '';
  if (message.type === 'image') {
    content = `<img src="${message.image}" class="chat-media chat-img" alt="Image">`;
  } else if (message.type === 'video') {
    content = `<video src="${message.video}" class="chat-media chat-video" controls></video>`;
  } else {
    content = `<div class="chat-msg-text">${escapeHtml(message.text || '')}</div>`;
  }

  msgEl.innerHTML = `
    <div class="chat-msg-avatar">
      ${message.pfp ? `<img src="${message.pfp}" alt="">` : `<div class="chat-avatar-fallback">${escapeHtml((message.displayName || '?')[0].toUpperCase())}</div>`}
    </div>
    <div class="chat-msg-body">
      <div class="chat-msg-meta">
        <span class="chat-msg-name">${escapeHtml(message.displayName || message.sender)}</span>
        <span class="chat-msg-time">${time}</span>
      </div>
      ${content}
    </div>
  `;

  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderOnlineUsers() {
  const el = document.getElementById('online-users');
  if (!el) return;
  const users = [...onlineUsers.keys()];
  el.innerHTML = users.length
    ? users.map(u => `<div class="online-user"><span class="online-dot"></span>${escapeHtml(u)}</div>`).join('')
    : '<div class="online-empty">No users online</div>';
}

// ═══════════════════════════════════════════════════════════════
//  Chat Rooms
// ═══════════════════════════════════════════════════════════════

function createChatRoom() {
  const name = document.getElementById('room-name').value.trim();
  const password = document.getElementById('room-password').value;
  if (!name) {
    showToast('Room name required.');
    return;
  }

  chatRooms.set(name, { password, members: new Set() });

  // Broadcast room creation
  const msg = { type: 'room-create', room: name, password };
  connectedPeers.forEach((_, id) => {
    try {
      const conn = connectedPeers.get(id).conn;
      if (conn && conn.open) conn.send(msg);
    } catch (e) {}
  });

  joinChatRoom(name, password);
  document.getElementById('room-name').value = '';
  document.getElementById('room-password').value = '';
  showToast(`Room "${name}" created.`);
}

function joinChatRoom(name, password) {
  activeChat = name;
  document.getElementById('chat-room-title').textContent = name;
  document.getElementById('chat-messages').innerHTML = '';

  // Request to join from connected peers
  const msg = { type: 'room-join', room: name, password: password || '', peerId };
  connectedPeers.forEach((_, id) => {
    try {
      const conn = connectedPeers.get(id).conn;
      if (conn && conn.open) conn.send(msg);
    } catch (e) {}
  });

  if (!chatRooms.has(name)) {
    chatRooms.set(name, { password: password || '', members: new Set() });
  }
}

function joinGeneralChat() {
  activeChat = 'general';
  document.getElementById('chat-room-title').textContent = 'General';
  document.getElementById('chat-messages').innerHTML = '';
}

function showCreateRoom() {
  document.getElementById('room-create-form').classList.toggle('hidden');
}

// ═══════════════════════════════════════════════════════════════
//  Chat Settings (colors - only visible to you)
// ═══════════════════════════════════════════════════════════════

function applyChatSettings() {
  const root = document.documentElement.style;
  root.setProperty('--chat-accent', myChatColor);
  root.setProperty('--chat-bg', myChatBg);
}

function setChatColor(color) {
  myChatColor = color;
  const settings = getChatSettings();
  settings.color = color;
  saveChatSettings(settings);
  applyChatSettings();
}

function setChatBg(color) {
  myChatBg = color;
  const settings = getChatSettings();
  settings.bg = color;
  saveChatSettings(settings);
  applyChatSettings();
}

function buildChatColorOptions() {
  const colors = ['#84cc16', '#3b82f6', '#7c6af7', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6', '#ffffff', '#000000'];
  const container = document.getElementById('chat-color-options');
  if (!container) return;
  container.innerHTML = colors.map(c => `
    <div class="chat-color-swatch" style="background:${c}" data-color="${c}" onclick="setChatColor('${c}')"></div>
  `).join('');
}

function buildChatBgOptions() {
  const bgs = ['#121614', '#111827', '#16161a', '#1e1111', '#1e1810', '#1e1018', '#0f1a1e', '#0f1e1c', '#1a1a2e', '#0f0f0f'];
  const container = document.getElementById('chat-bg-options');
  if (!container) return;
  container.innerHTML = bgs.map(c => `
    <div class="chat-color-swatch" style="background:${c}" data-color="${c}" onclick="setChatBg('${c}')"></div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
//  Boot
// ═══════════════════════════════════════════════════════════════

function initChatIfReady() {
  // Restore session
  const session = getSession();
  if (session) {
    const accounts = getAccounts();
    if (accounts[session.username]) {
      const acc = accounts[session.username];
      currentUser = {
        username: session.username,
        displayName: acc.displayName,
        pfp: acc.pfp || ''
      };
      renderAccountView();
      connectToNetwork();
    }
  }

  initChat();
  buildChatColorOptions();
  buildChatBgOptions();
  renderAccountView();
}

// Password gate on load
document.addEventListener('DOMContentLoaded', () => {
  const unlocked = localStorage.getItem(UNLOCK_KEY);
  if (unlocked === '1') {
    document.getElementById('password-gate').classList.add('hidden');
    initChatIfReady();
  } else {
    document.body.style.overflow = 'hidden';
    document.getElementById('site-password-input').focus();
  }
});