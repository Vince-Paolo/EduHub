import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "./Sidebar"
import UploadModal from "./UploadModal"
import logoIcon from "../assets/logo-icon.svg"
import styles from "./Navbar.module.css"

export default function Navbar({ onUpload = () => {} }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    navigate("/")
  }

  return (
    <>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onUploadClick={() => {
        setIsSidebarOpen(false)
        setIsUploadModalOpen(true)
      }} />
      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={onUpload} />
      
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <div className={styles.wrapper}>
            <div className={styles.brandContainer}>
              <button 
                className={styles.sidebarToggle}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <a href="/dashboard" className={styles.brand}>
                <img src={logoIcon} alt="EduHub" className={styles.logoIcon} />
                <span className={styles.brandText}>EduHub</span>
              </a>
            </div>
            <div className={`${styles.navLinks} ${isMenuOpen ? styles.visible : ''}`}>
              <a href="/dashboard" className={styles.navLink}>
                Dashboard
              </a>
              <a href="/modules" className={styles.navLink}>
                Modules
              </a>
              <a href="/quizzes" className={styles.navLink}>
                Quizzes
              </a>
              <a href="/profile" className={styles.navLink}>
                Profile
              </a>
              <button 
                className={styles.uploadNavBtn}
                onClick={() => setIsUploadModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Upload Module
              </button>
              <button 
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
            <button 
              className={styles.mobileMenuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className={styles.hamburgerIcon} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}