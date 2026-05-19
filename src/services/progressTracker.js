/**
 * progressTracker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tracks per-user progress for modules, lessons, and quizzes.
 *
 * Storage strategy:
 *   • Primary  → localStorage  (instant reads, works offline)
 *   • Mirror   → Firebase Firestore (persists across devices when online)
 *
 * Shape stored per userId:
 * {
 *   [moduleId]: {
 *     completedLessons : string[],   // lesson IDs the user finished
 *     quizScores       : { [quizId]: { score, total, passedAt } },
 *     lastVisited      : ISO string,
 *     percentComplete  : number      // 0–100
 *   }
 * }
 */

import { db } from '../firebase';           // re-use existing Firebase init
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY_PREFIX = 'eduhub_progress_';

// ─── Local-storage helpers ───────────────────────────────────────────────────

function lsKey(userId) {
  return `${LS_KEY_PREFIX}${userId}`;
}

function readLocal(userId) {
  try {
    const raw = localStorage.getItem(lsKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocal(userId, data) {
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(data));
  } catch (err) {
    console.warn('[progressTracker] localStorage write failed:', err);
  }
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

function progressRef(userId) {
  return doc(db, 'progress', userId);
}

async function readRemote(userId) {
  try {
    const snap = await getDoc(progressRef(userId));
    return snap.exists() ? snap.data().modules ?? {} : {};
  } catch {
    return null;   // signal: offline or permission error
  }
}

async function writeRemote(userId, modules) {
  try {
    await setDoc(
      progressRef(userId),
      { modules, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return true;
  } catch {
    return false;  // will be retried via syncQueue
  }
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Load progress for a user.
 * Merges local + remote, preferring the copy with the most completed lessons.
 */
export async function loadProgress(userId) {
  const local  = readLocal(userId);
  const remote = await readRemote(userId);

  if (!remote) return local;          // offline → local only

  // Merge: for each moduleId take whichever side has more completions
  const merged = { ...remote };
  for (const [moduleId, localMod] of Object.entries(local)) {
    const remoteMod = remote[moduleId];
    if (!remoteMod) {
      merged[moduleId] = localMod;
    } else {
      const localSet  = new Set(localMod.completedLessons ?? []);
      const remoteSet = new Set(remoteMod.completedLessons ?? []);
      const union     = [...new Set([...localSet, ...remoteSet])];
      merged[moduleId] = {
        ...remoteMod,
        ...localMod,
        completedLessons: union,
        quizScores: { ...(remoteMod.quizScores ?? {}), ...(localMod.quizScores ?? {}) },
      };
    }
  }

  writeLocal(userId, merged);
  return merged;
}

/**
 * Mark a lesson as complete and update the module's percentComplete.
 *
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} lessonId
 * @param {number} totalLessons  - total lessons in the module (for % calc)
 */
export async function markLessonComplete(userId, moduleId, lessonId, totalLessons) {
  const data = readLocal(userId);
  const mod  = data[moduleId] ?? { completedLessons: [], quizScores: {} };

  if (!mod.completedLessons.includes(lessonId)) {
    mod.completedLessons.push(lessonId);
  }

  mod.lastVisited      = new Date().toISOString();
  mod.percentComplete  = totalLessons > 0
    ? Math.round((mod.completedLessons.length / totalLessons) * 100)
    : 0;

  data[moduleId] = mod;
  writeLocal(userId, data);

  const saved = await writeRemote(userId, data);
  if (!saved) {
    // Queue for later sync when back online
    enqueueSyncItem(userId, { type: 'progress', payload: data });
  }

  return mod;
}

/**
 * Record a quiz result.
 *
 * @param {string} userId
 * @param {string} moduleId
 * @param {string} quizId
 * @param {number} score
 * @param {number} total
 */
export async function recordQuizScore(userId, moduleId, quizId, score, total) {
  const data = readLocal(userId);
  const mod  = data[moduleId] ?? { completedLessons: [], quizScores: {} };

  mod.quizScores         = mod.quizScores ?? {};
  mod.quizScores[quizId] = {
    score,
    total,
    percentage : Math.round((score / total) * 100),
    passed     : score / total >= 0.7,
    passedAt   : new Date().toISOString(),
  };

  data[moduleId] = mod;
  writeLocal(userId, data);

  const saved = await writeRemote(userId, data);
  if (!saved) {
    enqueueSyncItem(userId, { type: 'progress', payload: data });
  }

  return mod.quizScores[quizId];
}

/**
 * Get the progress summary for a single module.
 */
export function getModuleProgress(userId, moduleId) {
  const data = readLocal(userId);
  return data[moduleId] ?? { completedLessons: [], quizScores: {}, percentComplete: 0 };
}

/**
 * Get all progress data for a user (local read, instant).
 */
export function getAllProgress(userId) {
  return readLocal(userId);
}

/**
 * Reset progress for a specific module (e.g. retake flow).
 */
export async function resetModuleProgress(userId, moduleId) {
  const data    = readLocal(userId);
  data[moduleId] = { completedLessons: [], quizScores: {}, percentComplete: 0 };
  writeLocal(userId, data);
  await writeRemote(userId, data);
}

// ─── Internal helper used by this module only ─────────────────────────────────
// (avoids a circular import — the real syncQueue exports this too)
function enqueueSyncItem(userId, item) {
  try {
    const key   = `eduhub_syncqueue_${userId}`;
    const queue = JSON.parse(localStorage.getItem(key) ?? '[]');
    queue.push({ ...item, enqueuedAt: new Date().toISOString(), retries: 0 });
    localStorage.setItem(key, JSON.stringify(queue));
  } catch { /* silent */ }
}