// socket.js — STOMP WebSocket wrapper using @stomp/stompjs

import { Client } from '@stomp/stompjs';

let client = null;
const subscriptions = {}; // conversationId -> Subscription

/**
 * Connect to the backend STOMP endpoint.
 * The backend exposes raw WebSocket at /ws (no SockJS).
 * Vite proxy forwards ws://localhost:5173/ws → ws://localhost:8080/ws
 *
 * @param {function} onConnect  - called when STOMP is ready
 * @param {function} onDisconnect - called when disconnected
 */
export function connectSocket(onConnect, onDisconnect) {
  if (client?.active) return; // already connecting/connected

  client = new Client({
    webSocketFactory: () => {
  const wsUrl =
    import.meta.env.VITE_WS_URL ||
    `ws://${window.location.host}/ws`;

  return new WebSocket(wsUrl);
},
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('[WS] STOMP connected');
      onConnect?.();
    },
    onDisconnect: () => {
      console.log('[WS] STOMP disconnected');
      onDisconnect?.();
    },
    onStompError: (frame) => {
      console.error('[WS] STOMP error:', frame);
    },
    onWebSocketError: (evt) => {
      console.error('[WS] WebSocket error:', evt);
    }
  });

  client.activate();
}

/**
 * Subscribe to a conversation topic.
 * Unsubscribes any previous subscription for the same conversation.
 *
 * @param {number} conversationId
 * @param {function} callback - receives parsed message object
 */
export function subscribeToConversation(conversationId, callback) {
  if (!client?.connected) {
    console.warn('[WS] Cannot subscribe — STOMP not connected');
    return;
  }

  // Unsubscribe existing subscription for this conversation
  if (subscriptions[conversationId]) {
    subscriptions[conversationId].unsubscribe();
  }

  subscriptions[conversationId] = client.subscribe(
    `/topic/conversation/${conversationId}`,
    (stompMessage) => {
      try {
        const parsed = JSON.parse(stompMessage.body);
        callback(parsed);
      } catch (e) {
        console.error('[WS] Failed to parse message:', e);
      }
    }
  );

  console.log(`[WS] Subscribed to conversation ${conversationId}`);
}

/**
 * Unsubscribe from a conversation topic.
 */
export function unsubscribeFromConversation(conversationId) {
  if (subscriptions[conversationId]) {
    subscriptions[conversationId].unsubscribe();
    delete subscriptions[conversationId];
  }
}

/**
 * Send a chat message via STOMP.
 * senderEmail is included as fallback since STOMP Principal is not set.
 *
 * @param {object} payload - { conversationId, content, senderEmail }
 * @returns {boolean} true if sent, false if not connected
 */
export function sendStompMessage(payload) {
  if (!client?.connected) {
    console.warn('[WS] Cannot send — STOMP not connected');
    return false;
  }

  client.publish({
    destination: '/app/chat',
    body: JSON.stringify(payload)
  });

  return true;
}

/**
 * Disconnect and clean up all subscriptions.
 */
export function disconnectSocket() {
  Object.values(subscriptions).forEach(sub => {
    try { sub.unsubscribe(); } catch (_) {}
  });
  Object.keys(subscriptions).forEach(k => delete subscriptions[k]);

  if (client) {
    client.deactivate();
    client = null;
  }
}

export function isConnected() {
  return client?.connected === true;
}
