export async function getUsersByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.map(String).filter(Boolean)))
  if (!uniqueIds.length) return []

  const response = await fetch(`/auth/users?ids=${encodeURIComponent(uniqueIds.join(','))}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Failed to load user profiles')
  }

  const data = await response.json()
  return data.users || []
}

export async function getUserById(id) {
  if (!id) return null

  const response = await fetch(`/auth/user/${encodeURIComponent(id)}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data.user || null
}
