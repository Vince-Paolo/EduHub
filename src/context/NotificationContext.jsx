import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const removeNotification = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }, [])

  const addNotification = useCallback((notification) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const payload = {
      id,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message || '',
      duration: typeof notification.duration === 'number' ? notification.duration : 4000,
      createdAt: new Date().toISOString()
    }

    setNotifications((current) => [...current, payload])

    if (payload.duration > 0) {
      window.setTimeout(() => removeNotification(id), payload.duration)
    }

    return id
  }, [removeNotification])

  const value = useMemo(
    () => ({ notifications, addNotification, removeNotification }),
    [notifications, addNotification, removeNotification]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
