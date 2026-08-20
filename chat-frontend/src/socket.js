// socket.js — STOMP WebSocket wrapper using @stomp/stompjs

import { Client } from '@stomp/stompjs';

let client = null;
const subscriptions = {}; // conversationId -> Subscription

/**
 * Connect to the backend STOMP endpoint.
 *
 * Local development:
 *   ws://localhost:5173/ws
 *   Vite proxies this to ws://localhost:8080/ws
 *
 * Production:
 *   wss://realtime-chat-application-o4qd.onrender.com/ws
 */
export function connectSocket(onConnect, onDisconnect) {
  if (client?.active) return;

  const wsBaseUrl =
    import.meta.env.VITE_WS_URL ||
    `ws://${window.location.host}`;

  const wsUrl = `${wsBaseUrl}/ws`;

  console.log('[WS] Connecting to:', wsUrl);

  client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),

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
 */
export function subscribeToConversation(conversationId, callback) {
  if (!client?.connected) {
    console.warn('[WS] Cannot subscribe — STOMP not connected');
    return;
  }

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
 * Unsubscribe from a conversation.
 */
export function unsubscribeFromConversation(conversationId) {
  if (subscriptions[conversationId]) {
    subscriptions[conversationId].unsubscribe();
    delete subscriptions[conversationId];
  }
}

/**
 * Send a chat message via STOMP.
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
 * Disconnect and clean up.
 */
export function disconnectSocket() {
  Object.values(subscriptions).forEach((sub) => {
    try {
      sub.unsubscribe();
    } catch (_) {}
  });

  Object.keys(subscriptions).forEach(
    (key) => delete subscriptions[key]
  );

  if (client) {
    client.deactivate();
    client = null;
  }
}

export function isConnected() {
  return client?.connected === true;
}
