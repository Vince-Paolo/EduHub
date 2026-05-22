// AuthContext.jsx — place this in /src/context/
// Provides auth state globally across your app

import { createContext, useContext, useEffect, useState } from "react"
import { initSyncQueue, teardownSyncQueue } from "../services/syncQueue"
import { apiFetch } from "../services/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await apiFetch('/auth/me')
        if (!response.ok) {
          setUser(null)
          teardownSyncQueue()
          return
        }

        const data = await response.json()
        if (data.user) {
          setUser(data.user)
          initSyncQueue(data.user.uid)
        } else {
          setUser(null)
          teardownSyncQueue()
        }
      } catch (error) {
        console.error('[AuthContext] Session check failed:', error)
        setUser(null)
        teardownSyncQueue()
      }
    }

    checkSession()
  }, [])

  const login = async (email, password) => {
    const response = await apiFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Login failed.')
    }

    const data = await response.json()

    if (data.mfaRequired) {
      return data
    }

    setUser(data.user)
    initSyncQueue(data.user.uid)
    return data.user
  }

  const setUserAfterMFA = (user) => {
    setUser(user)
    initSyncQueue(user.uid)
  }

  const register = async (fullName, username, email, password) => {
    const response = await apiFetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, email, password })
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || 'Registration failed.')
    }

    const data = await response.json()
    return data.user
  }

  const logoutSecure = async () => {
    try {
      await apiFetch('/logout', { method: 'POST' })
    } catch (e) {
      // ignore network error
    }
    teardownSyncQueue()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, setUserAfterMFA, logout: logoutSecure, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}