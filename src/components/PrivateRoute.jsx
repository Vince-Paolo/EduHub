// PrivateRoute.jsx — place this in /src/components/
// Wraps any route that requires authentication

import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  // Still checking Firebase session — render nothing (or a spinner)
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#22c55e",
        fontSize: "1rem",
        fontWeight: 500
      }}>
        Loading...
      </div>
    )
  }

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/" replace />

  // Logged in → render the protected page
  return children
}