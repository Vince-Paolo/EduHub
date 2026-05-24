import styles from "./LogoutConfirmModal.module.css"

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconCircle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M16 17l5-5-5-5" />
            <path d="M8 17V7" />
            <path d="M12 19h-2a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
          </svg>
        </div>
        <h2 className={styles.title}>Confirm Logout</h2>
        <p className={styles.text}>
          Are you sure you want to sign out of EduHub? You will need to log in again to continue.
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={styles.confirmBtn} type="button" onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
