// pages/Profile.jsx
import { useState, useEffect } from "react"
import Navbar from "../components/Navbar"
import styles from "./Profile.module.css"

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "+1 234 567 8900",
    location: "San Francisco, CA"
  })
  const [settingsData, setSettingsData] = useState({
    emailNotifications: true,
    quizReminders: true,
    progressUpdates: true,
    shareProfile: false,
    showAchievements: true,
    darkMode: false
  })
  const [quizHistory, setQuizHistory] = useState([])
  const [modules, setModules] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [prevSettings, setPrevSettings] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = () => {
    setIsLoading(true)
    
    try {
      // Load user data from localStorage
      const savedUser = localStorage.getItem("currentUser")
      let userData = null
      
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        userData = {
          name: parsed.name || "User",
          email: parsed.email || "user@eduhub.com",
          phone: "+1 234 567 8900",
          location: "San Francisco, CA",
          joinDate: "January 2024"
        }
      } else {
        // Create default user if none exists
        userData = {
          name: "User",
          email: "user@eduhub.com",
          phone: "+1 234 567 8900",
          location: "San Francisco, CA",
          joinDate: "January 2024"
        }
        // Save default user to localStorage
        localStorage.setItem("currentUser", JSON.stringify({
          name: "User",
          email: "user@eduhub.com"
        }))
      }
      
      setCurrentUser(userData)
      setFormData(userData)

      // Load settings from localStorage
      const savedSettings = localStorage.getItem("userSettings")
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setSettingsData(parsedSettings)
        // Apply dark mode if enabled
        if (parsedSettings.darkMode) {
          document.documentElement.setAttribute("data-theme", "dark")
        } else {
          document.documentElement.removeAttribute("data-theme")
        }
      }

      // Load quiz history
      const savedQuizzes = localStorage.getItem("quizHistory")
      if (savedQuizzes) {
        setQuizHistory(JSON.parse(savedQuizzes))
      }

      // Load modules
      const savedModules = localStorage.getItem("uploadedModules")
      if (savedModules) {
        setModules(JSON.parse(savedModules))
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      // Set fallback user data on error
      const fallbackUser = {
        name: "User",
        email: "user@eduhub.com",
        phone: "+1 234 567 8900",
        location: "San Francisco, CA",
        joinDate: "January 2024"
      }
      setCurrentUser(fallbackUser)
      setFormData(fallbackUser)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = () => {
    // Update localStorage
    const updated = {
      ...JSON.parse(localStorage.getItem("currentUser") || "{}"),
      name: formData.name,
      email: formData.email
    }
    localStorage.setItem("currentUser", JSON.stringify(updated))
    setCurrentUser(formData)
    setIsEditing(false)
  }

  const handleSettingChange = (key) => {
    setSettingsData(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveSettings = () => {
    localStorage.setItem("userSettings", JSON.stringify(settingsData))
    if (settingsData.darkMode) {
      document.documentElement.setAttribute("data-theme", "dark")
    } else {
      document.documentElement.removeAttribute("data-theme")
    }
    setPrevSettings(null)
    setShowConfirm(false)
    setIsSettingsOpen(false)
  }

  // Calculate statistics
  const completedQuizzes = quizHistory.filter(q => q.status === "completed")
  const avgScore = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, q) => sum + q.scorePercent, 0) / completedQuizzes.length)
    : 0
  const totalHours = Math.round(completedQuizzes.length * 1.5 + modules.length * 2)
  const currentStreak = Math.floor(Math.random() * 30) + 1
  const achievementPoints = (completedQuizzes.length * 100) + (modules.length * 50)

  const stats = [
    { label: "Quizzes Completed", value: completedQuizzes.length.toString() },
    { label: "Total Hours", value: totalHours.toString() },
    { label: "Current Streak", value: `${currentStreak} days` },
    { label: "Achievement Points", value: achievementPoints.toString() }
  ]

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.profileContainer}>
        <Navbar />
        <div className={styles.content}>
          <div className={styles.loadingWrapper}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    )
  }

  // If somehow currentUser is still null after loading, show error state
  if (!currentUser) {
    return (
      <div className={styles.profileContainer}>
        <Navbar />
        <div className={styles.content}>
          <div className={styles.errorWrapper}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Unable to load profile</h3>
            <p>There was an error loading your profile data.</p>
            <button 
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={loadUserData}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const displayUser = isEditing ? formData : currentUser

  return (
    <div className={styles.profileContainer}>
      <Navbar />

      <div className={styles.content}>
        <div className={styles.headerSection}>
          <h1 className={styles.mainTitle}>My Profile</h1>
          <p className={styles.subtitle}>Manage your account and view your learning progress</p>
        </div>

        <div className={styles.mainGrid}>
          {/* Profile Information Card */}
          <div className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>👤</div>
              <div className={styles.userName}>{displayUser.name}</div>
              <div className={styles.userEmail}>{displayUser.email}</div>
            </div>

            {isEditing ? (
              <>
                <div className={styles.editGroup}>
                  <label className={styles.editLabel}>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    className={styles.editInput}
                  />
                </div>
                <div className={styles.editGroup}>
                  <label className={styles.editLabel}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleEditChange("email", e.target.value)}
                    className={styles.editInput}
                  />
                </div>
                <div className={styles.editGroup}>
                  <label className={styles.editLabel}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleEditChange("phone", e.target.value)}
                    className={styles.editInput}
                  />
                </div>
                <div className={styles.editGroup}>
                  <label className={styles.editLabel}>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleEditChange("location", e.target.value)}
                    className={styles.editInput}
                  />
                </div>
              </>
            ) : (
              <>
                <div className={styles.infoGroup}>
                  <div className={styles.infoLabel}>Phone</div>
                  <div className={styles.infoValue}>{displayUser.phone}</div>
                </div>

                <div className={styles.infoGroup}>
                  <div className={styles.infoLabel}>Location</div>
                  <div className={styles.infoValue}>{displayUser.location}</div>
                </div>

                <div className={styles.infoGroup}>
                  <div className={styles.infoLabel}>Member Since</div>
                  <div className={styles.infoValue}>{currentUser?.joinDate || "January 2024"}</div>
                </div>
              </>
            )}

            <div className={styles.actionButtons} style={{ marginTop: "1.5rem" }}>
              {isEditing ? (
                <>
                  <button 
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleSaveProfile}
                  >
                    Save Profile
                  </button>
                  <button 
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      setIsEditing(false)
                      setFormData(currentUser)
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                  <button 
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => {
                      setPrevSettings({ ...settingsData })
                      setIsSettingsOpen(true)
                    }}
                  >
                    Settings
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Statistics Card */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Your Statistics</div>
            <div className={styles.statsGrid}>
              {stats.map((stat, index) => (
                <div key={index} className={styles.statBox}>
                  <div className={styles.statNumber}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className={styles.modalOverlay} onClick={() => {
          setSettingsData(prevSettings)
          setShowConfirm(false)
          setIsSettingsOpen(false)
        }}>
          <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.settingsHeader}>
              <h2 className={styles.settingsTitle}>Settings</h2>
              <button 
                className={styles.closeBtn}
                onClick={() => {
                  setSettingsData(prevSettings)
                  setShowConfirm(false)
                  setIsSettingsOpen(false)
                }}
              >
                ✕
              </button>
            </div>

            <div className={styles.settingsContent}>
              {/* Notifications Section */}
              <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Notifications</h3>
                
                <div className={styles.settingOption}>
                  <div className={styles.settingLabel}>
                    <div className={styles.settingName}>Email Notifications</div>
                    <div className={styles.settingDesc}>Receive updates via email</div>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settingsData.emailNotifications}
                      onChange={() => handleSettingChange("emailNotifications")}
                    />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>

                <div className={styles.settingOption}>
                  <div className={styles.settingLabel}>
                    <div className={styles.settingName}>Quiz Reminders</div>
                    <div className={styles.settingDesc}>Get reminded about pending quizzes</div>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settingsData.quizReminders}
                      onChange={() => handleSettingChange("quizReminders")}
                    />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>

                <div className={styles.settingOption}>
                  <div className={styles.settingLabel}>
                    <div className={styles.settingName}>Progress Updates</div>
                    <div className={styles.settingDesc}>Get notified about your learning progress</div>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settingsData.progressUpdates}
                      onChange={() => handleSettingChange("progressUpdates")}
                    />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>
              </div>

              {/* Privacy Section */}
              <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Privacy</h3>
                
                <div className={styles.settingOption}>
                  <div className={styles.settingLabel}>
                    <div className={styles.settingName}>Share My Profile</div>
                    <div className={styles.settingDesc}>Allow others to view your profile</div>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settingsData.shareProfile}
                      onChange={() => handleSettingChange("shareProfile")}
                    />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>

                <div className={styles.settingOption}>
                  <div className={styles.settingLabel}>
                    <div className={styles.settingName}>Show Achievements</div>
                    <div className={styles.settingDesc}>Display your achievements publicly</div>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settingsData.showAchievements}
                      onChange={() => handleSettingChange("showAchievements")}
                    />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>
              </div>

              {/* Appearance Section */}
              <div className={styles.settingsSection}>
                <h3 className={styles.sectionTitle}>Appearance</h3>
                
                <div className={styles.settingOption}>
                  <div className={styles.settingLabel}>
                    <div className={styles.settingName}>Dark Mode</div>
                    <div className={styles.settingDesc}>Apply dark theme across the app</div>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settingsData.darkMode}
                      onChange={() => handleSettingChange("darkMode")}
                    />
                    <span className={styles.toggleSwitch}></span>
                  </label>
                </div>
              </div>
            </div>

            <div className={styles.settingsFooter}>
              <button 
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => {
                  setSettingsData(prevSettings)
                  setShowConfirm(false)
                  setIsSettingsOpen(false)
                }}
              >
                Cancel
              </button>
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setShowConfirm(true)}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIcon}>💾</div>
            <h3 className={styles.confirmTitle}>Save Settings?</h3>
            <p className={styles.confirmText}>
              Your preferences will be updated and applied immediately.
            </p>
            <div className={styles.confirmButtons}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setShowConfirm(false)}
              >
                Go Back
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSaveSettings}
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}