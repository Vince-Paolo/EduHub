import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import styles from "./Quizzes.module.css"
import { quizEngine } from "../services/quizEngine"

export default function Quizzes() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [ongoingQuizzes, setOngoingQuizzes] = useState([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoading(true)
      try {
        // Load completed quizzes from localStorage
        const savedQuizzes = localStorage.getItem("quizHistory")
        if (savedQuizzes) {
          setQuizzes(JSON.parse(savedQuizzes))
        }

        // Load ongoing quizzes from IndexedDB
        const ongoing = await quizEngine.getAllOngoingQuizzes()
        setOngoingQuizzes(ongoing)
      } catch (error) {
        console.warn('Failed to load quizzes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuizzes()
  }, [])

  const filteredQuizzes = filterStatus === "all" 
    ? quizzes 
    : quizzes.filter(q => q.status === filterStatus)

  const handleResumeQuiz = (quiz) => {
    // Navigate to the module's quiz config page with the quiz context
    const moduleId = quiz.moduleId
    if (moduleId) {
      navigate(`/quiz-config/${moduleId}`)
    }
  }

  const handleCancelQuiz = async (attemptId) => {
    if (!window.confirm("Are you sure you want to cancel this quiz? Your progress will not be saved.")) {
      return
    }

    try {
      await quizEngine.cancelQuiz(attemptId)
      // Refresh the ongoing quizzes list
      const ongoing = await quizEngine.getAllOngoingQuizzes()
      setOngoingQuizzes(ongoing)
    } catch (error) {
      console.error('Failed to cancel quiz:', error)
      alert('Failed to cancel quiz. Please try again.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#22c55e"
      case "ongoing":
        return "#0ea5e9"
      case "pending":
        return "#eab308"
      default:
        return "#6b7280"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "completed":
        return "✓ Completed"
      case "ongoing":
        return "⚡ Ongoing"
      case "pending":
        return "⏱ Pending"
      default:
        return status
    }
  }

  const scorePercentage = (score, total) => {
    return total > 0 ? Math.round((score / total) * 100) : 0
  }

  const getScoreBadgeColor = (percentage) => {
    if (percentage >= 80) return "#22c55e" // Green - Excellent
    if (percentage >= 60) return "#0ea5e9" // Blue - Good
    if (percentage >= 40) return "#eab308" // Yellow - Fair
    return "#ef4444" // Red - Poor
  }

  return (
    <div className={styles.quizzesContainer}>
      <Navbar />

      <div className={styles.content}>
        <div className={styles.headerSection}>
          <h1 className={styles.mainTitle}>My Quizzes</h1>
          <p className={styles.subtitle}>Track your quiz performance and progress</p>
        </div>

        {/* Filter Buttons */}
        <div className={styles.filterSection}>
          <button 
            className={`${styles.filterBtn} ${filterStatus === "all" ? styles.filterActive : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All ({quizzes.length + ongoingQuizzes.length})
          </button>
          <button 
            className={`${styles.filterBtn} ${filterStatus === "completed" ? styles.filterActive : ""}`}
            onClick={() => setFilterStatus("completed")}
          >
            Completed ({quizzes.filter(q => q.status === "completed").length})
          </button>
          <button 
            className={`${styles.filterBtn} ${filterStatus === "ongoing" ? styles.filterActive : ""}`}
            onClick={() => setFilterStatus("ongoing")}
          >
            Ongoing ({ongoingQuizzes.length})
          </button>
        </div>

        {/* Ongoing Quizzes Section */}
        {(filterStatus === "all" || filterStatus === "ongoing") && ongoingQuizzes.length > 0 && (
          <div className={styles.ongoingSection}>
            <h2 className={styles.sectionTitle}>⏳ Ongoing Quizzes</h2>
            <div className={styles.quizzesList}>
              {ongoingQuizzes.map((quiz) => {
                const percentage = (quiz.answeredCount / quiz.totalQuestions) * 100
                return (
                  <div key={quiz.attemptId} className={styles.quizCard}>
                    <div className={styles.quizHeader}>
                      <div className={styles.quizInfo}>
                        <h3 className={styles.quizTitle}>{quiz.title}</h3>
                        <p className={styles.quizDate}>Started {new Date(quiz.startedAt).toLocaleDateString()}</p>
                      </div>
                      <div className={styles.quizStatus} style={{ color: "#0ea5e9" }}>
                        ⚡ In Progress
                      </div>
                    </div>

                    <div className={styles.quizContent}>
                      <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressBarFill}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className={styles.progressText}>
                          Question {quiz.answeredCount} of {quiz.totalQuestions}
                        </p>
                      </div>

                      <div className={styles.quizMeta}>
                        <span className={styles.metaItem}>
                          <span className={styles.metaIcon}>📝</span>
                          {quiz.totalQuestions} questions
                        </span>
                        <span className={styles.metaItem}>
                          <span className={styles.metaIcon}>🎯</span>
                          {quiz.type === 'mixed' ? 'Mixed' : quiz.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className={styles.quizActions}>
                        <button 
                          className={`${styles.actionBtn} ${styles.resumeBtn}`}
                          onClick={() => handleResumeQuiz(quiz)}
                        >
                          Resume →
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.cancelBtn}`}
                          onClick={() => handleCancelQuiz(quiz.attemptId)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed Quizzes Section */}
        {(filterStatus === "all" || filterStatus === "completed") && filteredQuizzes.length > 0 && (
          <div className={styles.completedSection}>
            <h2 className={styles.sectionTitle}>✅ Completed Quizzes</h2>
            <div className={styles.quizzesList}>
              {filteredQuizzes.map((quiz) => {
                const percentage = scorePercentage(quiz.score, quiz.totalQuestions)
                const statusColor = getStatusColor(quiz.status)
                const scoreBadgeColor = getScoreBadgeColor(percentage)
                
                return (
                  <div key={quiz.id} className={styles.quizCard}>
                    <div className={styles.quizHeader}>
                      <div className={styles.quizInfo}>
                        <h3 className={styles.quizTitle}>{quiz.moduleName}</h3>
                        <p className={styles.quizDate}>{formatDate(quiz.completedAt)}</p>
                      </div>
                      <div className={styles.quizStatus} style={{ color: statusColor }}>
                        {getStatusLabel(quiz.status)}
                      </div>
                    </div>

                    <div className={styles.quizContent}>
                      <div className={styles.scoreSection}>
                        <div className={styles.scoreBadge} style={{ borderColor: scoreBadgeColor }}>
                          <div className={styles.scorePercentage} style={{ color: scoreBadgeColor }}>
                            {percentage}%
                          </div>
                          <div className={styles.scoreLabel}>Score</div>
                        </div>
                        <div className={styles.scoreDetails}>
                          <p className={styles.scoreText}>
                            <strong>{quiz.score}</strong> of <strong>{quiz.totalQuestions}</strong> correct
                          </p>
                          <div className={styles.scoreBar}>
                            <div 
                              className={styles.scoreBarFill}
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: scoreBadgeColor
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className={styles.quizMeta}>
                        <span className={styles.metaItem}>
                          <span className={styles.metaIcon}>📝</span>
                          {quiz.totalQuestions} questions
                        </span>
                        <span className={styles.metaItem}>
                          <span className={styles.metaIcon}>✓</span>
                          {quiz.status === "completed" ? "Done" : "In Progress"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {quizzes.length === 0 && ongoingQuizzes.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3 className={styles.emptyTitle}>No quizzes yet</h3>
            <p className={styles.emptyDesc}>Start a quiz to see your results here</p>
          </div>
        )}
      </div>
    </div>
  )
}
