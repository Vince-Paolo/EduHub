const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || ''

function buildUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${BASE_URL}${path}`
}

export async function apiFetch(path, options = {}) {
  const url = buildUrl(path)
  return fetch(url, { credentials: 'include', ...options })
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `${response.status} ${response.statusText}`)
  }

  return response.json()
}
