/**
 * api/sync.js  ──  mount in server.js with:
 *
 *   import syncRouter from './api/sync.js';
 *   app.use('/api/sync', syncRouter);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/sync
 *   Receives a batched or single sync item from the client and writes it to
 *   Firestore via the Firebase Admin SDK that server.js already configures.
 *
 * GET  /api/sync/:userId
 *   Returns the server-side progress for a user (useful for SSR hydration or
 *   conflict resolution when the client reconnects).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Expected POST body (single item):
 * {
 *   "userId"  : "uid123",
 *   "id"      : "1716000000000-abc123",   // client-generated dedup ID
 *   "type"    : "progress",               // "progress" | "quiz_result" | "lesson_event"
 *   "payload" : { ... }                   // type-specific data
 * }
 *
 * OR batch:
 * {
 *   "userId" : "uid123",
 *   "batch"  : [ { id, type, payload }, … ]
 * }
 */

import express from 'express'
import admin from 'firebase-admin'

const router = express.Router()

function getFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    })
  }
  return admin.firestore()
}

const ALLOWED_TYPES = new Set(['progress', 'quiz_result', 'lesson_event'])

function validateItem(item) {
  if (!item || typeof item !== 'object') return 'Item must be an object'
  if (typeof item.id !== 'string') return 'item.id must be a string'
  if (!ALLOWED_TYPES.has(item.type)) return `item.type must be one of: ${[...ALLOWED_TYPES].join(', ')}`
  if (!item.payload || typeof item.payload !== 'object') return 'item.payload must be an object'
  return null
}

router.post('/', async (req, res) => {
  const { userId, batch, ...singleItem } = req.body ?? {}

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' })
  }

  const items = batch
    ? batch
    : [{ id: singleItem.id, type: singleItem.type, payload: singleItem.payload }]

  if (!items.length) {
    return res.status(400).json({ error: 'No items to sync' })
  }

  for (const item of items) {
    const err = validateItem(item)
    if (err) return res.status(400).json({ error: `Validation error: ${err}`, item })
  }

  const db = getFirestore()
  const results = { synced: [], failed: [] }
  const batchOp = db.batch()

  for (const item of items) {
    try {
      await applyItem(db, batchOp, userId, item, results)
    } catch (err) {
      console.error(`[/api/sync] Failed to prepare item ${item.id}:`, err)
      results.failed.push({ id: item.id, error: err.message })
    }
  }

  try {
    await batchOp.commit()
  } catch (err) {
    console.error('[/api/sync] Firestore batch commit failed:', err)
    return res.status(500).json({ error: 'Firestore write failed', details: err.message })
  }

  return res.json({
    ok: true,
    synced: results.synced,
    failed: results.failed,
    serverTs: new Date().toISOString(),
  })
})

router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const db = getFirestore()
    const snap = await db.collection('progress').doc(userId).get()

    if (!snap.exists) return res.json({ userId, modules: {} })

    return res.json({ userId, ...snap.data() })
  } catch (err) {
    console.error('[/api/sync GET] Error:', err)
    return res.status(500).json({ error: err.message })
  }
})

async function applyItem(db, batchOp, userId, item, results) {
  const progressRef = db.collection('progress').doc(userId)

  switch (item.type) {
    case 'progress': {
      batchOp.set(
        progressRef,
        {
          modules: item.payload,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      results.synced.push(item.id)
      break
    }

    case 'quiz_result': {
      const { moduleId, quizId, ...scoreData } = item.payload
      batchOp.set(
        progressRef,
        {
          [`modules.${moduleId}.quizScores.${quizId}`]: scoreData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      results.synced.push(item.id)
      break
    }

    case 'lesson_event': {
      const { moduleId, lessonId, completedAt, totalLessons } = item.payload
      const existing = await progressRef.get()
      const lessons = existing.exists
        ? (existing.data()?.modules?.[moduleId]?.completedLessons ?? [])
        : []

      if (!lessons.includes(lessonId)) lessons.push(lessonId)

      const percent = totalLessons > 0
        ? Math.round((lessons.length / totalLessons) * 100)
        : 0

      batchOp.set(
        progressRef,
        {
          [`modules.${moduleId}.completedLessons`]: lessons,
          [`modules.${moduleId}.percentComplete`]: percent,
          [`modules.${moduleId}.lastVisited`]: completedAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      results.synced.push(item.id)
      break
    }

    default:
      results.failed.push({ id: item.id, error: `Unknown type: ${item.type}` })
  }
}

export default router
