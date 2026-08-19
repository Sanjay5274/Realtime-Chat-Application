// main.js — ChatApp entry point
// Handles: login, register, logout, conversations, messages, WebSocket

import './style.css';
import { saveAuth, getToken, getUser, clearAuth, isLoggedIn } from './auth.js';
import { api } from './api.js';
import {
  connectSocket,
  disconnectSocket,
  subscribeToConversation,
  unsubscribeFromConversation,
  sendStompMessage,
  isConnected
} from './socket.js';

// ─── State ────────────────────────────────────────────────────────────────────
let currentConversation = null;
let conversations = [];
let messages = [];
let allUsers = [];
let wsConnected = false;

// ─── Root element ─────────────────────────────────────────────────────────────
const app = document.getElementById('app');

// ─── Router ───────────────────────────────────────────────────────────────────
function route() {
  if (isLoggedIn()) {
    renderChat();
  } else {
    renderLogin();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH PAGES
// ═══════════════════════════════════════════════════════════════════════════════

function renderLogin() {
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="logo-icon">💬</span>
          <h1>ChatApp</h1>
          <p>Sign in to your account</p>
        </div>
        <form class="auth-form" id="login-form">
          <div class="form-group">
            <label for="login-email">Email</label>
            <input id="login-email" type="email" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input id="login-password" type="password" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <div class="error-msg" id="login-error"></div>
          <button type="submit" class="btn-primary" id="login-btn">Sign In</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="#" id="go-register">Register</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('go-register').addEventListener('click', (e) => {
    e.preventDefault();
    renderRegister();
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errEl.textContent = '';
    btn.textContent = 'Signing in…';
    btn.disabled = true;

    try {
      const data = await api.login(email, password);
      saveAuth(data.token, { id: data.userId, username: data.username, email: data.email });
      renderChat();
    } catch (err) {
      errEl.textContent = err.message || 'Login failed';
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
}

function renderRegister() {
  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="logo-icon">💬</span>
          <h1>ChatApp</h1>
          <p>Create a new account</p>
        </div>
        <form class="auth-form" id="register-form">
          <div class="form-group">
            <label for="reg-username">Username</label>
            <input id="reg-username" type="text" placeholder="yourname" required autocomplete="username" />
          </div>
          <div class="form-group">
            <label for="reg-email">Email</label>
            <input id="reg-email" type="email" placeholder="you@example.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <input id="reg-password" type="password" placeholder="••••••••" required autocomplete="new-password" />
          </div>
          <div class="error-msg" id="reg-error"></div>
          <button type="submit" class="btn-primary" id="reg-btn">Create Account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="#" id="go-login">Sign In</a>
        </div>
      </div>
    </div>
  `;

  document.getElementById('go-login').addEventListener('click', (e) => {
    e.preventDefault();
    renderLogin();
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('reg-error');
    const btn = document.getElementById('reg-btn');

    errEl.textContent = '';
    btn.textContent = 'Creating…';
    btn.disabled = true;

    try {
      const data = await api.register(username, email, password);
      saveAuth(data.token, { id: data.userId, username: data.username, email: data.email });
      renderChat();
    } catch (err) {
      errEl.textContent = err.message || 'Registration failed';
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHAT SHELL
// ═══════════════════════════════════════════════════════════════════════════════

async function renderChat() {
  const user = getUser();

  app.innerHTML = `
    <div class="chat-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-brand">💬 ChatApp</span>
        </div>

        <div class="user-info-block">
          <div class="user-avatar" id="my-avatar">
            ${initials(user.username)}
            <span class="status-dot" id="ws-dot"></span>
          </div>
          <div class="user-details">
            <div class="name">${esc(user.username)}</div>
            <div class="status-text" id="ws-status-text">Connecting…</div>
          </div>
        </div>

        <div class="section-label">
          Conversations
          <span style="display:flex;gap:6px">
            <button class="btn-sidebar" style="width:auto;padding:2px 8px;font-size:12px" id="btn-new-private" title="New private chat">+ Private</button>
            <button class="btn-sidebar" style="width:auto;padding:2px 8px;font-size:12px" id="btn-new-group" title="New group chat">+ Group</button>
          </span>
        </div>

        <div class="conv-list" id="conv-list">
          <div class="loading">Loading…</div>
        </div>

        <div class="sidebar-actions">
          <button class="btn-sidebar danger" id="btn-logout">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main class="message-pane" id="message-pane">
        <div class="empty-state">
          <span class="empty-icon">💬</span>
          <h3>Welcome, ${esc(user.username)}</h3>
          <p>Select a conversation or start a new one</p>
        </div>
      </main>
    </div>

    <div class="modal-overlay" id="modal-private">
      <div class="modal">
        <h2>New Private Chat</h2>
        <input type="search" id="private-search" placeholder="Search users…" />
        <div class="user-list" id="private-user-list"><div class="loading">Loading…</div></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="private-cancel">Cancel</button>
          <button class="btn-confirm" id="private-confirm">Start Chat</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="modal-group">
      <div class="modal">
        <h2>New Group Chat</h2>
        <input type="text" id="group-name" placeholder="Group name" />
        <input type="search" id="group-search" placeholder="Search members…" />
        <div class="user-list" id="group-user-list"><div class="loading">Loading…</div></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="group-cancel">Cancel</button>
          <button class="btn-confirm" id="group-confirm">Create Group</button>
        </div>
      </div>
    </div>

    <div id="toast-container"></div>
  `;

  document.getElementById('btn-logout').addEventListener('click', handleLogout);
  document.getElementById('btn-new-private').addEventListener('click', openPrivateModal);
  document.getElementById('btn-new-group').addEventListener('click', openGroupModal);
  document.getElementById('private-cancel').addEventListener('click', () => closeModal('modal-private'));
  document.getElementById('group-cancel').addEventListener('click', () => closeModal('modal-group'));
  document.getElementById('private-confirm').addEventListener('click', confirmPrivateChat);
  document.getElementById('group-confirm').addEventListener('click', confirmGroupChat);

  await refreshConversations();
  initWebSocket();
}

// ─── Logout ───────────────────────────────────────────────────────────────────
async function handleLogout() {
  try { await api.logout(); } catch (_) {}
  disconnectSocket();
  clearAuth();
  currentConversation = null;
  conversations = [];
  messages = [];
  renderLogin();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBSOCKET
// ═══════════════════════════════════════════════════════════════════════════════

function initWebSocket() {
  connectSocket(
    () => {
      wsConnected = true;
      updateWsBadge(true);
      if (currentConversation) {
        subscribeToConversation(currentConversation.id, onIncomingMessage);
      }
    },
    () => {
      wsConnected = false;
      updateWsBadge(false);
    }
  );
}

function updateWsBadge(connected) {
  const dot = document.getElementById('ws-dot');
  const txt = document.getElementById('ws-status-text');
  const badge = document.getElementById('ws-badge');
  if (dot) dot.className = 'status-dot' + (connected ? '' : ' offline');
  if (txt) {
    txt.textContent = connected ? 'Online' : 'Offline';
    txt.className = 'status-text' + (connected ? '' : ' offline');
  }
  if (badge) {
    badge.textContent = connected ? '⬤ Live' : '⬤ Offline';
    badge.className = 'ws-badge ' + (connected ? 'connected' : 'disconnected');
  }
}

function onIncomingMessage(msg) {
  if (!currentConversation || msg.conversationId !== currentConversation.id) return;

  const user = getUser();
  const isOwn = msg.senderId === user.id;

  if (!isOwn && msg.id) {
    api.markDelivered(msg.id).catch(() => {});
  }

  messages.push(msg);
  appendMessageRow(msg, isOwn);
  scrollToBottom();

  if (!isOwn && msg.id) {
    api.markRead(msg.id).catch(() => {});
  }

  refreshConversationsMeta();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONVERSATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function refreshConversations() {
  try {
    conversations = await api.getMyConversations();
    renderConvList();
  } catch (err) {
    toast('Failed to load conversations: ' + err.message, 'error');
  }
}

function refreshConversationsMeta() {
  api.getMyConversations().then(data => {
    conversations = data;
    renderConvList();
  }).catch(() => {});
}

function renderConvList() {
  const listEl = document.getElementById('conv-list');
  if (!listEl) return;

  if (!conversations.length) {
    listEl.innerHTML = `<div class="loading">No conversations yet.<br>Start one with the buttons above.</div>`;
    return;
  }

  const user = getUser();

  listEl.innerHTML = conversations.map(conv => {
    const isGroup = conv.type === 'GROUP';
    const name = convDisplayName(conv, user);
    const isActive = currentConversation?.id === conv.id;
    const avatarLetter = isGroup ? '👥' : initials(name);
    const avatarClass = isGroup ? 'conv-avatar group-avatar' : 'conv-avatar';

    let dotHtml = '';
    if (!isGroup) {
      const other = conv.members?.find(m => m.userId !== user.id);
      dotHtml = `<span class="conv-status-dot ${other?.online ? '' : 'offline'}"></span>`;
    }

    return `
      <div class="conv-item ${isActive ? 'active' : ''}" data-conv-id="${conv.id}">
        <div class="${avatarClass}">${avatarLetter}${dotHtml}</div>
        <div class="conv-details">
          <div class="conv-name">${esc(name)}</div>
          <div class="conv-meta">${isGroup ? 'Group' : 'Private'} · ${conv.members?.length ?? 0} members</div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.conv-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.convId);
      const conv = conversations.find(c => c.id === id);
      if (conv) openConversation(conv);
    });
  });
}

function convDisplayName(conv, user) {
  if (conv.type === 'GROUP') return conv.name || 'Unnamed Group';
  const other = conv.members?.find(m => m.userId !== user.id);
  return other?.username || conv.name || 'Private Chat';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OPEN CONVERSATION
// ═══════════════════════════════════════════════════════════════════════════════

async function openConversation(conv) {
  const user = getUser();

  if (currentConversation) {
    unsubscribeFromConversation(currentConversation.id);
  }

  currentConversation = conv;
  messages = [];
  renderConvList();

  const isGroup = conv.type === 'GROUP';
  const name = convDisplayName(conv, user);
  const avatarLetter = isGroup ? '👥' : initials(name);
  const avatarClass = isGroup ? 'pane-avatar group' : 'pane-avatar';

  let subText = isGroup
    ? `${conv.members?.length ?? 0} members`
    : (() => {
        const other = conv.members?.find(m => m.userId !== user.id);
        return other?.online ? 'Online' : 'Offline';
      })();

  const pane = document.getElementById('message-pane');
  pane.innerHTML = `
    <div class="pane-header">
      <div class="${avatarClass}">${avatarLetter}</div>
      <div class="pane-header-info">
        <div class="pane-name">${esc(name)}</div>
        <div class="pane-sub">${esc(subText)}</div>
      </div>
      <span class="ws-badge ${wsConnected ? 'connected' : 'disconnected'}" id="ws-badge">
        ${wsConnected ? '⬤ Live' : '⬤ Offline'}
      </span>
    </div>
    <div class="messages-area" id="messages-area">
      <div class="loading">Loading messages…</div>
    </div>
    <div class="input-area">
      <input class="msg-input" id="msg-input" type="text" placeholder="Type a message…" maxlength="2000" autocomplete="off" />
      <button class="btn-send" id="btn-send" title="Send">➤</button>
    </div>
  `;

  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('msg-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (isConnected()) {
    subscribeToConversation(conv.id, onIncomingMessage);
  }

  try {
    const fetched = await api.getMessages(conv.id);
    messages = fetched;
    renderMessages();

    fetched.forEach(m => {
      if (m.senderId !== user.id) {
        if (!m.delivered) api.markDelivered(m.id).catch(() => {});
        if (!m.read)      api.markRead(m.id).catch(() => {});
      }
    });
  } catch (err) {
    toast('Failed to load messages: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

function renderMessages() {
  const area = document.getElementById('messages-area');
  if (!area) return;

  if (!messages.length) {
    area.innerHTML = `<div class="empty-state" style="flex:1">
      <span class="empty-icon">🗨️</span>
      <p>No messages yet. Say hello!</p>
    </div>`;
    return;
  }

  const user = getUser();
  area.innerHTML = '';
  let lastDate = null;

  messages.forEach(msg => {
    const isOwn = msg.senderId === user.id;
    const msgDate = formatDate(msg.createdAt);

    if (msgDate !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'day-separator';
      sep.textContent = msgDate;
      area.appendChild(sep);
      lastDate = msgDate;
    }

    area.appendChild(buildMessageRow(msg, isOwn));
  });

  scrollToBottom();
}

function buildMessageRow(msg, isOwn) {
  const row = document.createElement('div');
  row.className = 'message-row ' + (isOwn ? 'own' : '');
  row.dataset.msgId = msg.id;

  const avatarEl = document.createElement('div');
  avatarEl.className = 'msg-avatar';
  avatarEl.textContent = initials(msg.senderUsername || '?');

  const group = document.createElement('div');
  group.className = 'msg-group';

  if (!isOwn) {
    const label = document.createElement('div');
    label.className = 'sender-label';
    label.textContent = msg.senderUsername || '';
    group.appendChild(label);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (isOwn ? 'own' : 'other');
  bubble.textContent = msg.content;

  const meta = document.createElement('div');
  meta.className = 'bubble-meta';
  if (isOwn) {
    meta.innerHTML = `
      <span class="bubble-time">${formatTime(msg.createdAt)}</span>
      <span class="msg-status ${statusClass(msg)}">${statusIcon(msg)}</span>
    `;
  } else {
    meta.innerHTML = `<span class="bubble-time">${formatTime(msg.createdAt)}</span>`;
  }

  group.appendChild(bubble);
  group.appendChild(meta);

  if (isOwn) {
    row.appendChild(group);
    row.appendChild(avatarEl);
  } else {
    row.appendChild(avatarEl);
    row.appendChild(group);
  }

  return row;
}

function appendMessageRow(msg, isOwn) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const empty = area.querySelector('.empty-state');
  if (empty) empty.remove();
  area.appendChild(buildMessageRow(msg, isOwn));
}

function statusClass(msg) {
  if (msg.read) return 'read';
  if (msg.delivered) return 'delivered';
  return '';
}

function statusIcon(msg) {
  if (msg.read) return '✓✓';
  if (msg.delivered) return '✓✓';
  return '✓';
}

// ─── Send ─────────────────────────────────────────────────────────────────────
async function sendMessage() {
  if (!currentConversation) return;
  const inputEl = document.getElementById('msg-input');
  if (!inputEl) return;
  const content = inputEl.value.trim();
  if (!content) return;

  inputEl.value = '';
  const user = getUser();

  if (isConnected()) {
    const ok = sendStompMessage({
      conversationId: currentConversation.id,
      content,
      senderEmail: user.email
    });
    if (ok) return;
  }

  // Fallback: REST POST
  try {
    const saved = await api.sendMessage(currentConversation.id, content);
    messages.push(saved);
    appendMessageRow(saved, true);
    scrollToBottom();
  } catch (err) {
    toast('Failed to send: ' + err.message, 'error');
    inputEl.value = content;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════════════════════════════════════════════

let selectedPrivateUserId = null;
let selectedGroupUserIds = new Set();
let _privateFilteredUsers = [];
let _groupFilteredUsers = [];

async function openPrivateModal() {
  selectedPrivateUserId = null;
  openModal('modal-private');
  document.getElementById('private-search').value = '';

  try {
    allUsers = await api.getUsers();
  } catch (err) {
    toast('Failed to load users: ' + err.message, 'error');
    return;
  }

  const user = getUser();
  _privateFilteredUsers = allUsers.filter(u => u.id !== user.id);
  renderPrivateUserList(_privateFilteredUsers);

  const searchEl = document.getElementById('private-search');
  // Remove old listeners by cloning
  const newSearch = searchEl.cloneNode(true);
  searchEl.parentNode.replaceChild(newSearch, searchEl);
  newSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    _privateFilteredUsers = allUsers.filter(u =>
      u.id !== user.id &&
      (u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    );
    renderPrivateUserList(_privateFilteredUsers);
  });
}

function renderPrivateUserList(users) {
  const listEl = document.getElementById('private-user-list');
  if (!listEl) return;

  if (!users.length) {
    listEl.innerHTML = `<div class="loading">No users found.</div>`;
    return;
  }

  listEl.innerHTML = users.map(u => `
    <div class="user-list-item ${selectedPrivateUserId === u.id ? 'selected' : ''}" data-uid="${u.id}">
      <div class="user-list-avatar">${initials(u.username)}</div>
      <div>
        <div class="user-list-name">${esc(u.username)}</div>
        <div class="user-list-email">${esc(u.email)}</div>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.user-list-item').forEach(el => {
    el.addEventListener('click', () => {
      selectedPrivateUserId = Number(el.dataset.uid);
      renderPrivateUserList(users);
    });
  });
}

async function confirmPrivateChat() {
  if (!selectedPrivateUserId) { toast('Select a user first', 'error'); return; }
  const user = getUser();
  try {
    const conv = await api.createPrivateConversation(user.id, selectedPrivateUserId);
    closeModal('modal-private');
    await refreshConversations();
    const full = conversations.find(c => c.id === conv.id);
    if (full) openConversation(full);
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

async function openGroupModal() {
  selectedGroupUserIds = new Set();
  openModal('modal-group');
  document.getElementById('group-name').value = '';
  document.getElementById('group-search').value = '';

  try {
    allUsers = await api.getUsers();
  } catch (err) {
    toast('Failed to load users: ' + err.message, 'error');
    return;
  }

  const user = getUser();
  _groupFilteredUsers = allUsers.filter(u => u.id !== user.id);
  renderGroupUserList(_groupFilteredUsers);

  const searchEl = document.getElementById('group-search');
  const newSearch = searchEl.cloneNode(true);
  searchEl.parentNode.replaceChild(newSearch, searchEl);
  newSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    _groupFilteredUsers = allUsers.filter(u =>
      u.id !== user.id &&
      (u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    );
    renderGroupUserList(_groupFilteredUsers);
  });
}

function renderGroupUserList(users) {
  const listEl = document.getElementById('group-user-list');
  if (!listEl) return;

  if (!users.length) {
    listEl.innerHTML = `<div class="loading">No users found.</div>`;
    return;
  }

  listEl.innerHTML = users.map(u => `
    <div class="user-list-item ${selectedGroupUserIds.has(u.id) ? 'selected' : ''}" data-uid="${u.id}">
      <input type="checkbox" ${selectedGroupUserIds.has(u.id) ? 'checked' : ''} readonly />
      <div class="user-list-avatar">${initials(u.username)}</div>
      <div>
        <div class="user-list-name">${esc(u.username)}</div>
        <div class="user-list-email">${esc(u.email)}</div>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.user-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const uid = Number(el.dataset.uid);
      if (selectedGroupUserIds.has(uid)) {
        selectedGroupUserIds.delete(uid);
      } else {
        selectedGroupUserIds.add(uid);
      }
      renderGroupUserList(users);
    });
  });
}

async function confirmGroupChat() {
  const groupName = document.getElementById('group-name').value.trim();
  if (!groupName) { toast('Enter a group name', 'error'); return; }
  if (selectedGroupUserIds.size === 0) { toast('Select at least one member', 'error'); return; }

  const user = getUser();
  const memberIds = [user.id, ...selectedGroupUserIds];

  try {
    const conv = await api.createGroupConversation(groupName, memberIds);
    closeModal('modal-group');
    await refreshConversations();
    const full = conversations.find(c => c.id === conv.id);
    if (full) openConversation(full);
  } catch (err) {
    toast('Error: ' + err.message, 'error');
  }
}

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function toast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scrollToBottom() {
  const area = document.getElementById('messages-area');
  if (area) area.scrollTop = area.scrollHeight;
}

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ─── Start ────────────────────────────────────────────────────────────────────
route();
