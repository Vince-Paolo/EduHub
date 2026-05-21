import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../context/NotificationContext'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const { notifications, removeNotification } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeNotifications = notifications.filter((notification) => notification)
  const badgeCount = activeNotifications.length

  return (
    <div className={styles.notificationBell} ref={panelRef}>
      <button
        className={styles.bellButton}
        onClick={() => setOpen((current) => !current)}
        aria-label="Toggle notifications"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badgeCount > 0 && <span className={styles.badge}>{badgeCount}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Notifications</span>
            <span className={styles.dropdownCount}>{badgeCount} new</span>
          </div>
          {activeNotifications.length === 0 ? (
            <div className={styles.emptyState}>No new notifications</div>
          ) : (
            <div className={styles.notificationList}>
              {activeNotifications.map((notification) => (
                <div key={notification.id} className={styles.notificationItem}>
                  <div className={styles.messageRow}>
                    <strong>{notification.title}</strong>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeNotification(notification.id)}
                      aria-label="Dismiss notification"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                  {notification.message && (
                    <p className={styles.messageText}>{notification.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
