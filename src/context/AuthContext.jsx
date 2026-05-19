// AuthContext.jsx — place this in /src/context/
// Provides auth state globally across your app

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../firebase"
import { initSyncQueue, teardownSyncQueue } from "../services/syncQueue"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    // Firebase listener — fires on login, logout, and page refresh
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null)
      
      // Initialize sync queue on login, teardown on logout
      if (firebaseUser?.uid) {
        console.info('[AuthContext] User logged in — initializing sync queue')
        initSyncQueue(firebaseUser.uid)
      } else {
        console.info('[AuthContext] User logged out — tearing down sync queue')
        teardownSyncQueue()
      }
    })
    return unsubscribe // cleanup on unmount
  }, [])

  const logout = () => signOut(auth)
  // Clear server session cookie as well
  const logoutSecure = async () => {
    try {
      await fetch('/sessionLogout', { method: 'POST', credentials: 'include' })
    } catch (e) {
      // ignore
    }
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, logout: logoutSecure, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}