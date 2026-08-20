// api.js — all REST API calls to the Spring Boot backend

import { getToken } from './auth.js';

const BASE = import.meta.env.VITE_API_URL || '/api';

// ------------------------------------------------------------------
// Core fetch helpers
// ------------------------------------------------------------------

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(method, path, { body, json } = {}) {
  const headers = authHeaders();
  let bodyData;

  if (json) {
    headers['Content-Type'] = 'application/json';
    bodyData = JSON.stringify(json);
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: bodyData
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }

  // 204 No Content — return null
  if (res.status === 204) return null;

  return res.json().catch(() => null);
}

const get  = (path)         => request('GET',  path);
const post = (path, opts)   => request('POST', path, opts || {});

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------

export const api = {

  register: (username, email, password) =>
    post('/auth/register', { json: { username, email, password } }),

  login: (email, password) =>
    post('/auth/login', { json: { email, password } }),

  logout: () =>
    post('/auth/logout'),

  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------

  getUsers: () => get('/users'),

  // ------------------------------------------------------------------
  // Conversations
  // ------------------------------------------------------------------

  getMyConversations: () => get('/conversations/my'),

  createPrivateConversation: (userId1, userId2) =>
    post(`/conversations/private?userId1=${userId1}&userId2=${userId2}`),

  createGroupConversation: (name, memberIds) =>
    post('/conversations/group', { json: { name, memberIds } }),

  addMemberToGroup: (conversationId, userId) =>
    post(`/conversations/${conversationId}/members?userId=${userId}`),

  // ------------------------------------------------------------------
  // Messages
  // ------------------------------------------------------------------

  sendMessage: (conversationId, content) =>
    post(`/messages?conversationId=${conversationId}&content=${encodeURIComponent(content)}`),

  getMessages: (conversationId) =>
    get(`/messages/conversation/${conversationId}`),

  markDelivered: (messageId) =>
    post(`/messages/${messageId}/delivered`),

  markRead: (messageId) =>
    post(`/messages/${messageId}/read`),
};
