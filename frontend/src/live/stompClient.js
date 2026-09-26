/**
 * Shared STOMP + SockJS client for live-raid invites and position sync.
 * Connects through the Vite `/ws` proxy to Spring's SockJS endpoint.
 */
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let client = null;
let connectPromise = null;
const subscriptions = new Map();

function wsUrl() {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8080/ws';
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (apiBase) {
    return `${apiBase}/ws`;
  }
  const proto = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${proto}://${window.location.host}/ws`;
}

export function getStompClient() {
  return client;
}

export function ensureStompConnected() {
  if (client?.connected) return Promise.resolve(client);
  if (connectPromise) return connectPromise;

  connectPromise = new Promise((resolve, reject) => {
    const c = new Client({
      webSocketFactory: () => new SockJS(wsUrl()),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        client = c;
        resolve(c);
      },
      onStompError: (frame) => {
        reject(new Error(frame.headers?.message || 'STOMP error'));
      },
    });
    c.activate();
    // Timeout so callers aren't stuck forever if backend is down.
    setTimeout(() => {
      if (!c.connected) {
        connectPromise = null;
        reject(new Error('STOMP connect timeout'));
      }
    }, 8000);
  }).catch((err) => {
    connectPromise = null;
    throw err;
  });

  return connectPromise;
}

export async function stompSubscribe(destination, onMessage) {
  const c = await ensureStompConnected();
  const prev = subscriptions.get(destination);
  if (prev) {
    try {
      prev.unsubscribe();
    } catch {
      /* ignore */
    }
  }
  const sub = c.subscribe(destination, (frame) => {
    let body = null;
    try {
      body = JSON.parse(frame.body);
    } catch {
      body = frame.body;
    }
    onMessage(body, frame);
  });
  subscriptions.set(destination, sub);
  return sub;
}

export function stompUnsubscribe(destination) {
  const sub = subscriptions.get(destination);
  if (sub) {
    try {
      sub.unsubscribe();
    } catch {
      /* ignore */
    }
    subscriptions.delete(destination);
  }
}

export async function stompPublish(destination, body) {
  const c = await ensureStompConnected();
  c.publish({
    destination,
    body: JSON.stringify(body ?? {}),
    headers: { 'content-type': 'application/json' },
  });
}

export async function disconnectStomp() {
  for (const [dest, sub] of subscriptions) {
    try {
      sub.unsubscribe();
    } catch {
      /* ignore */
    }
    subscriptions.delete(dest);
  }
  connectPromise = null;
  if (client) {
    try {
      await client.deactivate();
    } catch {
      /* ignore */
    }
    client = null;
  }
}
