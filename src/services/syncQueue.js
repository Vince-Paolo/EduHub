/**
 * syncQueue.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Durable offline-first sync queue for EduHub.
 *
 * How it works:
 *   1. Any write that fails while offline is pushed onto an array stored in
 *      localStorage under the key `eduhub_syncqueue_<userId>`.
 *   2. When the browser comes back online, `flushQueue()` is called
 *      automatically (via the `online` event listener registered in `init()`).
 *   3. Each item is POSTed to /api/sync.  On success it's removed from the
 *      queue.  On failure it's retried up to MAX_RETRIES times with
 *      exponential back-off, then dropped to avoid blocking the queue forever.
 *
 * Queue item shape:
 * {
 *   id         : string   (uuid-ish, for dedup)
 *   type       : 'progress' | 'quiz_result' | 'lesson_event'
 *   payload    : object   (data to send)
 *   enqueuedAt : ISO string
 *   retries    : number
 * }
 */

import { apiFetch } from './api'

const LS_KEY_PREFIX  = 'eduhub_syncqueue_';
const API_SYNC_URL   = '/api/sync';
const MAX_RETRIES    = 5;
const BASE_DELAY_MS  = 1_000;   // 1 s → 2 s → 4 s … (exponential)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lsKey(userId) {
  return `${LS_KEY_PREFIX}${userId}`;
}

function readQueue(userId) {
  try {
    return JSON.parse(localStorage.getItem(lsKey(userId)) ?? '[]');
  } catch {
    return [];
  }
}

function writeQueue(userId, queue) {
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(queue));
  } catch (err) {
    console.warn('[syncQueue] Could not persist queue:', err);
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add an item to the sync queue.
 *
 * @param {string} userId
 * @param {{ type: string, payload: object }} item
 */
export function enqueue(userId, item) {
  const queue = readQueue(userId);
  queue.push({
    id         : makeId(),
    type       : item.type,
    payload    : item.payload,
    enqueuedAt : new Date().toISOString(),
    retries    : 0,
  });
  writeQueue(userId, queue);
  console.info(`[syncQueue] Enqueued "${item.type}" (queue length: ${queue.length})`);
}

/**
 * Return the current queue contents (read-only snapshot).
 */
export function peekQueue(userId) {
  return readQueue(userId);
}

/**
 * Return the number of pending items.
 */
export function queueSize(userId) {
  return readQueue(userId).length;
}

/**
 * Attempt to flush all queued items to the server.
 * Safe to call at any time — it bails immediately if offline.
 *
 * @param {string} userId
 * @returns {Promise<{ flushed: number, failed: number }>}
 */
export async function flushQueue(userId) {
  if (!navigator.onLine) {
    console.info('[syncQueue] Offline — skipping flush');
    return { flushed: 0, failed: 0 };
  }

  let queue   = readQueue(userId);
  if (!queue.length) return { flushed: 0, failed: 0 };

  console.info(`[syncQueue] Flushing ${queue.length} item(s)…`);

  let flushed = 0;
  let failed  = 0;

  // Process items one-by-one so a single bad item doesn't block the rest
  const remaining = [];

  for (const item of queue) {
    const success = await trySend(userId, item);
    if (success) {
      flushed++;
    } else {
      item.retries++;
      if (item.retries < MAX_RETRIES) {
        remaining.push(item);   // keep for next flush
        failed++;
      } else {
        console.warn(`[syncQueue] Dropping item "${item.id}" after ${MAX_RETRIES} retries.`);
        failed++;
      }
    }
  }

  writeQueue(userId, remaining);
  console.info(`[syncQueue] Flush complete — flushed: ${flushed}, failed: ${failed}`);
  return { flushed, failed };
}

/**
 * Send a single item to /api/sync with retry back-off.
 * Returns true on success.
 */
async function trySend(userId, item) {
  const delay = BASE_DELAY_MS * Math.pow(2, item.retries);
  if (item.retries > 0) await sleep(delay);

  try {
    // Try to get ID token from Firebase Auth
    let idToken = null;
    try {
      const { auth } = await import('../firebase');
      const user = auth.currentUser;
      if (user) {
        idToken = await user.getIdToken();
      }
    } catch {
      // Firebase not available or user not signed in — proceed without token
      // Server session cookie will be sent automatically
    }

    const headers = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await apiFetch(API_SYNC_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, ...item }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[syncQueue] trySend failed for item ${item.id}:`, err.message);
    return false; // network error → will be retried
  }
}

/**
 * Clear the entire queue for a user (e.g. on sign-out).
 */
export function clearQueue(userId) {
  writeQueue(userId, []);
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let _initialised = false;
let _currentUserId = null;

/**
 * Call once (e.g. in App.jsx or AuthContext) after the user signs in.
 * Registers the `online` event listener and does an immediate flush attempt.
 *
 * @param {string} userId
 */
export function initSyncQueue(userId) {
  _currentUserId = userId;

  if (!_initialised) {
    window.addEventListener('online', () => {
      console.info('[syncQueue] Back online — flushing queue…');
      if (_currentUserId) flushQueue(_currentUserId);
    });
    _initialised = true;
  }

  // Attempt an immediate flush in case items were queued in a previous session
  flushQueue(userId);
}

/**
 * Call on sign-out to stop automatic flushes for this user.
 */
export function teardownSyncQueue() {
  _currentUserId = null;
}