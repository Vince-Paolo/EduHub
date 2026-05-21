import { useNotifications } from '../context/NotificationContext'
import styles from './NotificationCenter.module.css'

export default function NotificationCenter() {
  const { notifications, removeNotification } = useNotifications()

  if (!notifications.length) {
    return null
  }

  return (
    <div className={styles.notificationContainer} aria-live="polite" aria-atomic="true">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${styles.notificationCard} ${styles[notification.type] || styles.info}`}
        >
          <div className={styles.notificationHeader}>
            <strong>{notification.title || (notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : 'Notification')}</strong>
            <button
              className={styles.closeButton}
              onClick={() => removeNotification(notification.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
          {notification.message && <p className={styles.notificationMessage}>{notification.message}</p>}
        </div>
      ))}
    </div>
  )
}
