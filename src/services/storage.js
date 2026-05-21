const STORAGE_PREFIX = 'eduhub_' 

function buildKey(key, userId) {
  if (userId) {
    return `${STORAGE_PREFIX}${key}_${userId}`
  }
  return `${STORAGE_PREFIX}${key}`
}

export function getScopedItem(key, userId) {
  try {
    return localStorage.getItem(buildKey(key, userId))
  } catch (error) {
    console.warn(`[storage] Failed to read ${key} for user ${userId}:`, error)
    return null
  }
}

export function setScopedItem(key, value, userId) {
  try {
    localStorage.setItem(buildKey(key, userId), value)
  } catch (error) {
    console.warn(`[storage] Failed to write ${key} for user ${userId}:`, error)
  }
}

export function removeScopedItem(key, userId) {
  try {
    localStorage.removeItem(buildKey(key, userId))
  } catch (error) {
    console.warn(`[storage] Failed to remove ${key} for user ${userId}:`, error)
  }
}

export function getScopedJson(key, userId, fallback = null) {
  const raw = getScopedItem(key, userId)
  if (raw == null) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function setScopedJson(key, value, userId) {
  setScopedItem(key, JSON.stringify(value), userId)
}
