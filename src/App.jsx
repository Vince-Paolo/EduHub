import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { db } from './services/database'
import { getScopedJson } from './services/storage'
import { useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationCenter from './components/NotificationCenter'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Modules from './pages/Modules'
import Quizzes from './pages/Quizzes'
import Profile from './pages/Profile'
import MFASettings from './components/MFASettings'
import Quiz from './pages/Quiz'
import Register from './pages/Register'
import QuizConfig from './pages/QuizConfig'
import Groups from './pages/Groups'
import OfflineLessonViewer from './components/OfflineLessonViewer'

function App() {
  // Wait for IndexedDB to be ready before rendering any page.
  // This prevents race conditions where services try to use db before init.
  const [dbReady, setDbReady] = useState(false)
  const [dbError, setDbError] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    db.init()
      .then(() => {
        console.log('IndexedDB ready')
        setDbReady(true)
      })
      .catch((err) => {
        console.error('IndexedDB failed to initialise:', err)
        // Still let the app run — localStorage fallback will be used
        setDbReady(true)
        setDbError(true)
      })
  }, [])

  useEffect(() => {
    if (!user) return

    const savedSettings = getScopedJson('userSettings', user.uid, null)
    if (savedSettings && savedSettings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [user])

  if (!dbReady) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #fef3c7 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '3rem', height: '3rem',
            border: '3px solid #bbf7d0', borderTopColor: '#22c55e',
            borderRadius: '50%', margin: '0 auto 1rem',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#6b7280', fontWeight: 500 }}>Loading EduHub…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <NotificationProvider>
      {dbError && (
        <div style={{
          background: '#fef3c7', borderBottom: '1px solid #fcd34d',
          padding: '0.5rem 1rem', textAlign: 'center',
          fontSize: '0.85rem', color: '#92400e',
        }}>
          ⚠️ Offline storage unavailable — quiz results and downloads won't persist between sessions.
        </div>
      )}
      <NotificationCenter />
      <Routes>
        <Route path="/"              element={<Login />} />
        <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/modules"       element={<PrivateRoute><Modules /></PrivateRoute>} />
        <Route path="/quizzes"       element={<PrivateRoute><Quizzes /></PrivateRoute>} />
        <Route path="/profile"       element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/mfa"           element={<PrivateRoute><MFASettings /></PrivateRoute>} />
        <Route path="/quiz"          element={<PrivateRoute><Quiz /></PrivateRoute>} />
        <Route path="/register"      element={<Register />} />
        <Route path="/quiz-config/:id"    element={<PrivateRoute><QuizConfig /></PrivateRoute>} />
        <Route path="/groups"        element={<PrivateRoute><Groups /></PrivateRoute>} />
        <Route path="/offline/:id"        element={<PrivateRoute><OfflineLessonViewer /></PrivateRoute>} />
      </Routes>
    </NotificationProvider>
  )
}

export default App