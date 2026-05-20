// components/Sidebar.jsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./Sidebar.module.css"

export default function Sidebar({ isOpen, onClose, onUploadClick = () => {} }) {
  const navigate = useNavigate()

  const handleNavigate = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}></div>
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Menu</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className={styles.navMenu}>
          <button 
            className={styles.menuItem}
            onClick={() => handleNavigate("/dashboard")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button 
            className={styles.menuItem}
            onClick={() => handleNavigate("/modules")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span>Modules</span>
          </button>

          <button 
            className={styles.menuItem}
            onClick={() => handleNavigate("/quizzes")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 11l3 3L22 4" />
              <path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Quizzes</span>
          </button>

          <button 
            className={styles.menuItem}
            onClick={() => handleNavigate("/groups")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Groups</span>
          </button>

          <button 
            className={styles.menuItem}
            onClick={() => handleNavigate("/profile")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>

          <button 
            className={styles.menuItem}
            onClick={onUploadClick}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Upload Module</span>
          </button>
        </nav>

        <div className={styles.footer}>
          <button 
            className={styles.logoutMenuBtn}
            onClick={() => handleNavigate("/")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  )
}