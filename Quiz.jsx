import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import ModuleUpload from "../components/ModuleUpload"
import { useNavigate } from "react-router-dom"
import { getScopedJson, setScopedJson } from "../services/storage"
import styles from "./Quiz.module.css"

const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "What is the primary objective of this module?",
    options: [
      "To provide foundational knowledge",
      "To assess existing skills",
      "To prepare for advanced topics",
      "To review previous concepts"
    ],
    correctAnswer: 0
  },
  {
    id: 2,
    question: "Which of the following is a key concept covered?",
    options: [
      "Advanced techniques",
      "Fundamental principles",
      "Complex implementations",
      "Historical context"
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "How would you apply what you've learned?",
    options: [
      "In theoretical scenarios only",
      "In real-world practical situations",
      "Only for examination purposes",
      "Not applicable outside the course"
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "What is the next logical step after mastering this topic?",
    options: [
      "Start a different module",
      "Practice exercises",
      "Review previous concepts",
      "Complete an assessment"
    ],
    correctAnswer: 1
  },
  {
    id: 5,
    question: "Which resource would be most helpful for deeper understanding?",
    options: [
      "Quick reference guides",
      "Comprehensive documentation",
      "Simple overviews",
      "Video summaries"
    ],
    correctAnswer: 1
  }
]

export default function Quiz() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [uploadedModule, setUploadedModule] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)

  const handleModuleUpload = (moduleData) => {
    setUploadedModule(moduleData)
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
  }

  const handleAnswerSelect = (optionIndex) => {
    if (!showResults) {
      setAnswers({
        ...answers,
        [currentQuestion]: optionIndex
      })
    }
  }

  const handleNext = () => {
    if (currentQuestion < SAMPLE_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = () => {
    const score = calculateScore()
    // Save quiz to history
    const quizEntry = {
      id: Date.now(),
      moduleName: uploadedModule.name,
      moduleId: uploadedModule.id,
      score: score.correct,
      totalQuestions: score.total,
      scorePercent: score.percentage,
      completedAt: new Date().toISOString(),
      status: "completed"
    }
    
    const quizHistory = getScopedJson('quizHistory', user?.uid, [])
    quizHistory.unshift(quizEntry)
    setScopedJson('quizHistory', quizHistory, user?.uid)
    
    setShowResults(true)
  }

  const calculateScore = () => {
    let correct = 0
    SAMPLE_QUESTIONS.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correct++
      }
    })
    return {
      correct,
      total: SAMPLE_QUESTIONS.length,
      percentage: Math.round((correct / SAMPLE_QUESTIONS.length) * 100)
    }
  }

  const resetQuiz = () => {
    setUploadedModule(null)
    setCurrentQuestion(0)
    setAnswers({})
    setShowResults(false)
  }

  if (!uploadedModule) {
    return (
      <div className={styles.quizContainer}>
        <Navbar />
        <div className={styles.content}>
          <div className={styles.headerSection}>
            <button 
              onClick={() => navigate('/dashboard')}
              className={styles.backBtn}
            >
              ← Back to Dashboard
            </button>
            <h1 className={styles.mainTitle}>Quiz Generator</h1>
            <p className={styles.subtitle}>Upload your course materials and we'll generate a quiz for you</p>
          </div>

          <ModuleUpload onModuleUpload={handleModuleUpload} />
        </div>
      </div>
    )
  }

  if (showResults) {
    const score = calculateScore()
    return (
      <div className={styles.quizContainer}>
        <Navbar />
        <div className={styles.content}>
          <div className={styles.resultsCard}>
            <div className={styles.resultsHeader}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2 className={styles.resultsTitle}>Quiz Complete!</h2>
            </div>

            <div className={styles.scoreCard}>
              <div className={styles.scoreCircle}>
                <div className={styles.scorePercentage}>{score.percentage}%</div>
              </div>
              <p className={styles.scoreText}>You got {score.correct} out of {score.total} questions correct</p>
            </div>

            <div className={styles.resultsDetails}>
              <h3>Review Your Answers</h3>
              <div className={styles.questionReview}>
                {SAMPLE_QUESTIONS.map((question, index) => (
                  <div key={question.id} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <span className={styles.questionNum}>Question {index + 1}</span>
                      <span className={`${styles.reviewBadge} ${answers[index] === question.correctAnswer ? styles.correct : styles.incorrect}`}>
                        {answers[index] === question.correctAnswer ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                    </div>
                    <p className={styles.reviewQuestion}>{question.question}</p>
                    <p className={styles.reviewAnswer}>Your answer: {question.options[answers[index]]}</p>
                    {answers[index] !== question.correctAnswer && (
                      <p className={styles.correctAnswer}>Correct answer: {question.options[question.correctAnswer]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.resultsActions}>
              <button 
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={resetQuiz}
              >
                Take Quiz Again
              </button>
              <button 
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const question = SAMPLE_QUESTIONS[currentQuestion]
  const selectedAnswer = answers[currentQuestion]

  return (
    <div className={styles.quizContainer}>
      <Navbar />
      <div className={styles.content}>
        <div className={styles.quizHeader}>
          <button 
            onClick={() => navigate('/dashboard')}
            className={styles.backBtn}
          >
            ← Back to Dashboard
          </button>
          <div className={styles.moduleInfo}>
            <h2 className={styles.moduleName}>{uploadedModule.name}</h2>
            <p className={styles.uploadedAt}>Uploaded: {uploadedModule.uploadedAt}</p>
          </div>
        </div>

        <div className={styles.quizCard}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${((currentQuestion + 1) / SAMPLE_QUESTIONS.length) * 100}%` }}></div>
          </div>
          <p className={styles.progressText}>Question {currentQuestion + 1} of {SAMPLE_QUESTIONS.length}</p>

          <h3 className={styles.questionText}>{question.question}</h3>

          <div className={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <button
                key={index}
                className={`${styles.option} ${selectedAnswer === index ? styles.selected : ""}`}
                onClick={() => handleAnswerSelect(index)}
              >
                <span className={styles.optionIndex}>{String.fromCharCode(65 + index)}.</span>
                <span className={styles.optionText}>{option}</span>
                {selectedAnswer === index && (
                  <svg className={styles.checkmark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className={styles.navigationButtons}>
            <button
              className={`${styles.btn} ${styles.btnOutline}`}
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              ← Previous
            </button>

            {currentQuestion === SAMPLE_QUESTIONS.length - 1 ? (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSubmit}
              >
                Submit Quiz
              </button>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleNext}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
