import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getScopedJson, setScopedJson } from "../services/storage"
import Navbar from "../components/Navbar"
import ModuleCard from "../components/ModuleCard"
import { quizEngine } from "../services/quizEngine"
import { collaborationService } from "../services/collaborationService"
import styles from "./Dashboard.module.css"

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [modules, setModules] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [quizzes, setQuizzes] = useState([])
  const [userName, setUserName] = useState("Learner")
  const [quizHistory, setQuizHistory] = useState([])
  const [engineOngoingQuizzes, setEngineOngoingQuizzes] = useState([])
  const [pendingInvites, setPendingInvites] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      // Load user info from auth state
      if (user) {
        setUserName(user.fullName || user.username || "Learner")
      }

      // Load modules scoped to the current user
      const savedModules = getScopedJson('uploadedModules', user?.uid, [])
      setModules(savedModules)

      // Load quiz history scoped to the current user
      const savedQuizzes = getScopedJson('quizHistory', user?.uid, [])
      setQuizHistory(savedQuizzes)

      if (user) {
        try {
          const pending = await collaborationService.getPendingInvitations(user.uid, user.email)
          setPendingInvites(pending.length)
        } catch (error) {
          console.warn('Failed to load pending invitations:', error)
          setPendingInvites(0)
        }
      }

      try {
        const ongoing = await quizEngine.getAllOngoingQuizzes()
        setEngineOngoingQuizzes(ongoing)
      } catch (error) {
        console.warn('Failed to load ongoing quizzes:', error)
      }
    }

    loadDashboardData()
  }, [user])

  const handleUploadModule = (newModule) => {
    const updatedModules = [newModule, ...modules]
    setModules(updatedModules)
    setScopedJson('uploadedModules', updatedModules, user?.uid)
  }

  const handleDeleteModule = (moduleId) => {
    const updatedModules = modules.filter(m => m.id !== moduleId)
    setModules(updatedModules)
    setScopedJson('uploadedModules', updatedModules, user?.uid)
  }

  const handleEditModule = (moduleId, newTitle) => {
    const updatedModules = modules.map(m =>
      m.id === moduleId ? { ...m, title: newTitle } : m
    )
    setModules(updatedModules)
    setScopedJson('uploadedModules', updatedModules, user?.uid)
  }

  const ACCEPTED_TYPES = ["application/pdf", "text/plain", "text/markdown"]

  const processFile = (file) => {
    setUploadError("")
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith(".md")) {
      setUploadError("Only PDF, TXT, or MD files are supported.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10 MB.")
      return
    }
    const newModule = {
      id: Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      desc: `${file.type === "application/pdf" ? "PDF" : "Text"} file · ${(file.size / 1024).toFixed(1)} KB`,
      icon: file.type === "application/pdf" ? "📄" : "📝",
      fileName: file.name,
      fileType: file.type,
      uploadedAt: new Date().toISOString()
    }
    handleUploadModule(newModule)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleFileInput = (e) => processFile(e.target.files[0])

  // Derived stats
  const completedQuizzes = quizHistory.filter(q => q.status === "completed")
  const ongoingQuizzes   = engineOngoingQuizzes
  const avgScore = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, q) => sum + q.scorePercent, 0) / completedQuizzes.length)
    : 0
  const totalQuestionsAnswered = completedQuizzes.reduce((sum, q) => sum + (q.totalQuestions || 0), 0)

  const getScoreBadge = (pct) => {
    if (pct >= 80) return { label: "Excellent", color: "#15803d", bg: "#dcfce7" }
    if (pct >= 60) return { label: "Good",      color: "#92400e", bg: "#fef3c7" }
    return               { label: "Keep going", color: "#991b1b", bg: "#fef2f2" }
  }

  const getTimeAgo = (isoDate) => {
    const diff = Date.now() - new Date(isoDate).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins  < 1)  return "Just now"
    if (mins  < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const handleResumeQuiz = (quiz) => {
    if (quiz?.moduleId) {
      navigate(`/quiz-config/${quiz.moduleId}?attemptId=${quiz.attemptId}`)
    } else {
      navigate(`/quizzes`)
    }
  }

  const getFirstName = (name) => name.split(" ")[0]

  const overallProgress = modules.length
    ? Math.min(100, Math.round((completedQuizzes.length / Math.max(modules.length, 1)) * 100))
    : 0

  return (
    <div className={styles.dashboardContainer}>
      <Navbar onUpload={handleUploadModule} />

      <div className={styles.content}>

        {/* ── Welcome Header ── */}
        <div className={styles.headerSection}>
          <h1 className={styles.mainTitle}>
            Welcome back, <span className={styles.userName}>{getFirstName(userName)}</span>! 👋
          </h1>
          <p className={styles.subtitle}>Continue your learning journey</p>
        </div>

        {/* ── Stats Row ── */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{modules.length}</div>
              <div className={styles.statLabel}>Modules Uploaded</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{completedQuizzes.length}</div>
              <div className={styles.statLabel}>Quizzes Completed</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{completedQuizzes.length ? `${avgScore}%` : "—"}</div>
              <div className={styles.statLabel}>Average Score</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🧠</div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{totalQuestionsAnswered}</div>
              <div className={styles.statLabel}>Questions Answered</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📬</div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{pendingInvites}</div>
              <div className={styles.statLabel}>Pending Invitations</div>
            </div>
          </div>
        </div>

        {/* ── Modules ── */}
        <div className={styles.modulesSection}>
          <h2 className={styles.modulesTitle}>My Modules</h2>
          {modules.length === 0 ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileInput}
                style={{ display: "none" }}
              />
              <div
                className={`${styles.emptyState} ${isDragging ? styles.emptyStateDragging : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false) }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {isDragging ? (
                  <>
                    <div className={styles.emptyIconDrop}>📥</div>
                    <h3 className={styles.emptyTitle}>Drop your file here!</h3>
                    <p className={styles.emptyDesc}>Release to upload your module</p>
                  </>
                ) : (
                  <>
                    <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <h3 className={styles.emptyTitle}>No modules currently uploaded</h3>
                    <p className={styles.emptyDesc}>Drag &amp; drop a file here, or <span className={styles.emptyLink}>click to browse</span></p>
                    <p className={styles.emptyFormats}>PDF · TXT · MD &nbsp;|&nbsp; Max 10 MB</p>
                  </>
                )}
                {uploadError && (
                  <p className={styles.emptyError} onClick={(e) => e.stopPropagation()}>⚠️ {uploadError}</p>
                )}
              </div>
            </>
          ) : (
            <div className={styles.modulesGrid}>
              {modules.map((module) => (
                <div key={module.id} className={styles.moduleCardWrapper}>
                  <ModuleCard
                    module={module}
                    onDelete={handleDeleteModule}
                    onEdit={handleEditModule}
                    isUserModule={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Ongoing + Recent Quizzes ── */}
        <div className={styles.quizRow}>

          {/* Ongoing */}
          <div className={styles.quizPanel}>
            <div className={styles.quizPanelHeader}>
              <h3 className={styles.quizPanelTitle}>⏳ Ongoing Quizzes</h3>
              <span className={styles.quizCount}>{ongoingQuizzes.length}</span>
            </div>
            {ongoingQuizzes.length === 0 ? (
              <div className={styles.quizEmpty}>
                <span className={styles.quizEmptyIcon}>🎯</span>
                <p>No quizzes in progress</p>
              </div>
            ) : (
              <div className={styles.quizList}>
                {ongoingQuizzes.map((q) => (
                  <div key={q.attemptId || q.id} className={styles.quizItem}
                    onClick={() => handleResumeQuiz(q)}
                  >
                    <div className={styles.quizItemLeft}>
                      <p className={styles.quizItemTitle}>{q.title || q.moduleName}</p>
                      <p className={styles.quizItemMeta}>
                        Q{q.answeredCount || q.currentQuestion}/{q.totalQuestions} · {getTimeAgo(q.startedAt)}
                      </p>
                      <div className={styles.quizMiniBar}>
                        <div
                          className={styles.quizMiniBarFill}
                          style={{ width: `${((q.answeredCount || q.currentQuestion) / Math.max(q.totalQuestions, 1)) * 100}%`, background: "#0ea5e9" }}
                        />
                      </div>
                    </div>
                    <button className={styles.resumeBtn} onClick={(e) => { e.stopPropagation(); handleResumeQuiz(q) }}>Resume →</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent */}
          <div className={styles.quizPanel}>
            <div className={styles.quizPanelHeader}>
              <h3 className={styles.quizPanelTitle}>🕐 Recent Quizzes</h3>
              <span className={styles.quizCount}>{completedQuizzes.length}</span>
            </div>
            {completedQuizzes.length === 0 ? (
              <div className={styles.quizEmpty}>
                <span className={styles.quizEmptyIcon}>📝</span>
                <p>No completed quizzes yet</p>
              </div>
            ) : (
              <div className={styles.quizList}>
                {completedQuizzes.slice(0, 5).map((q) => {
                  const badge = getScoreBadge(q.scorePercent)
                  return (
                    <div key={q.id} className={styles.quizItem}
                      onClick={() => navigate(`/quizzes`)}
                    >
                      <div className={styles.quizItemLeft}>
                        <p className={styles.quizItemTitle}>{q.moduleName}</p>
                        <p className={styles.quizItemMeta}>
                          {q.score}/{q.totalQuestions} correct · {getTimeAgo(q.completedAt)}
                        </p>
                        <div className={styles.quizMiniBar}>
                          <div
                            className={styles.quizMiniBarFill}
                            style={{ width: `${q.scorePercent}%`, background: q.scorePercent >= 60 ? "#22c55e" : "#ef4444" }}
                          />
                        </div>
                      </div>
                      <span className={styles.scoreBadge} style={{ color: badge.color, background: badge.bg }}>
                        {q.scorePercent}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Progress ── */}
        <div className={styles.progressSection}>
          <h3 className={styles.progressTitle}>Learning Progress</h3>
          <div className={styles.progressItem}>
            <div className={styles.progressLabel}>
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${overallProgress}%` }}></div>
            </div>
          </div>
          <div className={styles.progressItem}>
            <div className={styles.progressLabel}>
              <span>Quiz Accuracy</span>
              <span>{completedQuizzes.length ? `${avgScore}%` : "0%"}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFillBlue} style={{ width: `${completedQuizzes.length ? avgScore : 0}%` }}></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}