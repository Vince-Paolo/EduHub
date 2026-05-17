// services/db.js
// ─────────────────────────────────────────────────────────────────────────────
// Bridge adapter — wraps database.js to provide the specific functions that
// QuizConfig.jsx and ModuleCard.jsx import from "../services/db"
// ─────────────────────────────────────────────────────────────────────────────
import { db } from './database'

// Ensure DB is initialised before any call.
let _initPromise = null
function ensureReady() {
  if (!_initPromise) _initPromise = db.init()
  return _initPromise
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE FILE STORAGE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Save the raw file bytes of a module to IndexedDB.
 */
export async function saveModuleFile(meta, file) {
  await ensureReady()
  const arrayBuffer = await file.arrayBuffer()

  const record = {
    id          : `file_${meta.id}`,
    moduleId    : meta.id,
    title       : meta.title,
    fileName    : file.name,
    fileType    : file.type,
    fileSize    : `${(file.size / 1024).toFixed(1)} KB`,
    fileBlob    : arrayBuffer,
    downloadedAt: new Date().toISOString(),
    contentType : 'blob',
  }

  const moduleRecord = {
    ...meta,
    id: meta.id,
    downloadStatus: 'downloaded',
    fileSize: record.fileSize,
    offlineSavedAt: record.downloadedAt,
  }

  // Persist module metadata and offline file content together.
  await db.update('modules', moduleRecord).catch(() => db.add('modules', moduleRecord))
  await db.update('offlineContent', record).catch(() => db.add('offlineContent', record))

  return record
}

/**
 * Retrieve the stored file record for a module (includes fileBlob ArrayBuffer).
 */
export async function getModuleFile(moduleId) {
  await ensureReady()
  return db.get('offlineContent', `file_${moduleId}`).catch(() => null)
}

/**
 * Reconstruct a File object from a stored record.
 */
export function blobToFile(record) {
  if (!record?.fileBlob) return null
  const blob = new Blob([record.fileBlob], {
    type: record.fileType || 'application/octet-stream',
  })
  return new File([blob], record.fileName || 'module', { type: record.fileType })
}

/**
 * Return module IDs (strings) that have offline files stored.
 */
export async function listStoredModuleIds() {
  await ensureReady()
  const all = await db.getAll('offlineContent').catch(() => [])
  return all
    .filter(r => r.contentType === 'blob' && r.moduleId != null)
    .map(r => String(r.moduleId))
}

/**
 * Delete the stored offline file for a module.
 */
export async function deleteModuleFile(moduleId) {
  await ensureReady()
  await db.delete('offlineContent', `file_${moduleId}`).catch(() => {})
  const mod = await db.get('modules', moduleId).catch(() => null)
  if (mod) {
    await db.update('modules', { ...mod, downloadStatus: 'not_downloaded' }).catch(() => {})
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// QUIZ HISTORY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Persist a completed quiz result to IndexedDB and sync to localStorage.
 */
export async function saveQuizResult(result) {
  await ensureReady()
  const record = { ...result, id: Date.now(), savedAt: new Date().toISOString() }

  await db.add('quizAttempts', record).catch(() => db.update('quizAttempts', record))

  // Keep localStorage in sync for Dashboard / Quizzes pages
  const existing = JSON.parse(localStorage.getItem('quizHistory') || '[]')
  localStorage.setItem('quizHistory', JSON.stringify([record, ...existing]))

  return record.id
}

/**
 * Get all quiz attempts for a module, newest first.
 */
export async function getQuizResultsByModule(moduleId) {
  await ensureReady()
  const id = typeof moduleId === 'string' ? (Number(moduleId) || moduleId) : moduleId
  const results = await db.getByIndex('quizAttempts', 'moduleId', id).catch(() => [])
  return results.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
}

/**
 * Get all quiz attempts across all modules, newest first.
 */
export async function getAllQuizResults() {
  await ensureReady()
  const all = await db.getAll('quizAttempts').catch(() => [])
  return all.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
}

// ═════════════════════════════════════════════════════════════════════════════
// OFFLINE VIEWER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Returns a { url, type, name } object for the stored file, or null.
 * Caller must call URL.revokeObjectURL(url) when done.
 */
export async function getModuleViewerData(moduleId) {
  const record = await getModuleFile(moduleId)
  if (!record?.fileBlob) return null
  const blob = new Blob([record.fileBlob], { type: record.fileType || 'application/octet-stream' })
  return {
    url     : URL.createObjectURL(blob),
    type    : record.fileType,
    name    : record.fileName,
    moduleId: record.moduleId,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// NETWORK STATUS
// ═════════════════════════════════════════════════════════════════════════════

export function isOffline() {
  return !navigator.onLine
}