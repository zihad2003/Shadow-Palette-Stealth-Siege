/**
 * Shared STOMP + SockJS client for live-raid invites and position sync.
 * Connects through the Vite `/ws` proxy to Spring's SockJS endpoint.
 */
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getApiBaseUrl, getJwtToken } from '../api.js';

let client = null;
let connectPromise = null;
const connectWaiters = [];
/** destination -> { sub, listeners: Set<Function> } */
const subscriptions = new Map();
const pendingSubs = new Map();

function dispatchFrame(entry, frame) {
  let body = null;
  try {
    body = JSON.parse(frame.body);
  } catch {
    body = frame.body;
  }
  for (const fn of entry.listeners) {
    try {
      fn(body, frame);
    } catch {
      /* one listener must not drop the others */
    }
  }
}

function resubscribeAll() {
  if (!client?.connected) return;
  for (const [dest, entry] of subscriptions) {
    try {
      entry.sub?.unsubscribe();
    } catch {
      /* old socket is already gone */
    }
    entry.sub = client.subscribe(dest, (frame) => dispatchFrame(entry, frame));
  }
}

function wsUrl() {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8080/ws';
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    return `${apiBase}/ws`;
  }
  const proto = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${proto}://${window.location.host}/ws`;
}

export function getStompClient() {
  return client;
}

function waitForReconnect() {
  return new Promise((resolve, reject) => {
    const waiter = { resolve, reject, timer: 0 };
    waiter.timer = setTimeout(() => {
      const i = connectWaiters.indexOf(waiter);
      if (i >= 0) connectWaiters.splice(i, 1);
      reject(new Error('STOMP connect timeout'));
    }, 40000);
    connectWaiters.push(waiter);
  });
}

function flushWaiters(c) {
  const pending = connectWaiters.splice(0);
  for (const waiter of pending) {
    clearTimeout(waiter.timer);
    waiter.resolve(c);
  }
}

export function ensureStompConnected() {
  if (client?.connected) return Promise.resolve(client);
  if (connectPromise) return connectPromise;
  if (client) return waitForReconnect();

  connectPromise = new Promise((resolve, reject) => {
    let settled = false;
    const connectHeaders = {};
    const jwt = getJwtToken();
    if (jwt) {
      connectHeaders['Authorization'] = `Bearer ${jwt}`;
    }
    const c = new Client({
      webSocketFactory: () => new SockJS(wsUrl()),
      connectHeaders,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        if (!c.active) return;
        client = c;
        resubscribeAll();
        connectPromise = null;
        flushWaiters(c);
        if (!settled) {
          settled = true;
          resolve(c);
        }
      },
      onStompError: (frame) => {
        if (!settled) {
          settled = true;
          connectPromise = null;
          reject(new Error(frame.headers?.message || 'STOMP error'));
        }
      },
    });
    c.activate();
    // Render free tier can take half a minute to wake. Don't give up at 8s.
    setTimeout(() => {
      if (!settled && !c.connected) {
        settled = true;
        connectPromise = null;
        try {
          c.deactivate();
        } catch {
          /* ignore */
        }
        client = null;
        reject(new Error('STOMP connect timeout'));
      }
    }, 40000);
  }).catch((err) => {
    connectPromise = null;
    throw err;
  });

  return connectPromise;
}

export async function stompSubscribe(destination, onMessage) {
  const c = await ensureStompConnected();
  let entry = subscriptions.get(destination);
  if (!entry) {
    let opening = pendingSubs.get(destination);
    if (!opening) {
      opening = Promise.resolve().then(() => {
        const listeners = new Set();
        const created = { sub: null, listeners };
        created.sub = c.subscribe(destination, (frame) => dispatchFrame(created, frame));
        subscriptions.set(destination, created);
        return created;
      });
      pendingSubs.set(destination, opening);
      opening.finally(() => {
        if (pendingSubs.get(destination) === opening) pendingSubs.delete(destination);
      });
    }
    entry = await opening;
  }
  entry.listeners.add(onMessage);
  return entry.sub;
}

export function stompUnsubscribe(destination, onMessage) {
  const entry = subscriptions.get(destination);
  if (!entry) return;
  if (onMessage) {
    entry.listeners.delete(onMessage);
    if (entry.listeners.size > 0) return;
  }
  try {
    entry.sub.unsubscribe();
  } catch {
    /* ignore */
  }
  subscriptions.delete(destination);
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
  const pending = connectWaiters.splice(0);
  for (const waiter of pending) {
    clearTimeout(waiter.timer);
    waiter.reject(new Error('STOMP disconnected'));
  }
  for (const [dest, entry] of subscriptions) {
    try {
      entry.sub.unsubscribe();
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
