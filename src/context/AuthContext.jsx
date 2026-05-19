// AuthContext.jsx — place this in /src/context/
// Provides auth state globally across your app

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../firebase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    // Firebase listener — fires on login, logout, and page refresh
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null)
    })
    return unsubscribe // cleanup on unmount
  }, [])

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, logout, loading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}