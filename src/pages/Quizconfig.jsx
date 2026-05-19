import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { auth } from "../firebase"
import styles from "./QuizConfig.module.css"
import { quizEngine } from "../services/quizEngine"
import { saveQuizResult, getModuleFile, blobToFile } from "../services/db"
import { db } from "../services/database"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf"
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function readPdfAsText(file) {
  const data = await file.arrayBuffer()
  const pdf = await getDocument({ data }).promise
  const pageCount = Math.min(pdf.numPages, 5)
  let text = ""

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(" ")
    text += `${pageText}\n\n`
  }

  await pdf.destroy()
  return text
}

function buildPrompt(quizType, count) {
  const base = `CRITICAL: Return ONLY a raw JSON array. No markdown, no code fences, no explanation. Start with [ and end with ].`
  const schemas = {
    multiple_choice: `Generate ${count} multiple-choice questions, each with 4 options (A-D).
Schema: [{ "type": "multiple_choice", "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": <0-based index 0-3>, "explanation": "..." }]`,
    true_false: `Generate ${count} true/false questions.
Schema: [{ "type": "true_false", "question": "...", "answer": "True" or "False", "explanation": "..." }]`,
    identification: `Generate ${count} identification questions where the student writes a specific word or phrase.
Schema: [{ "type": "identification", "question": "...", "answer": "<exact answer>", "explanation": "..." }]`,
    mixed: `Generate exactly ${count} questions as a mix: ~40% multiple_choice, ~30% true_false, ~30% identification.
Multiple choice: { "type": "multiple_choice", "question": "...", "options": ["A...","B...","C...","D..."], "answer": <0-3>, "explanation": "..." }
True/false: { "type": "true_false", "question": "...", "answer": "True" or "False", "explanation": "..." }
Identification: { "type": "identification", "question": "...", "answer": "<exact>", "explanation": "..." }`
  }
  return `${schemas[quizType]}\n\n${base}`
}

async function callClaude(file, quizType, count) {
  let text = ""
  if (file.type === "application/pdf") {
    text = await readPdfAsText(file)
    console.debug("PDF extraction result", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      textLength: text?.length,
      trimmedLength: text?.trim().length
    })
    if (!text.trim()) {
      throw new Error("Unable to extract text from this PDF. Please upload a searchable PDF or convert it to TXT/MD.")
    }
  } else if (file.type === "text/plain" || file.type === "text/markdown" || file.name.endsWith(".md")) {
    text = await readFileAsText(file)
    console.debug("Text file read result", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      textLength: text?.length,
      trimmedLength: text?.trim().length
    })
  } else {
    throw new Error("Only PDF, TXT, or MD files are supported. Please upload a supported file.")
  }

  if (!text || !text.trim()) {
    throw new Error("File is empty or contains no extractable text. Please upload a valid searchable module file.")
  }

  // Call backend endpoint via same-origin /api path
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("You must be signed in to generate quizzes.")
    }

    // Use secure HTTP-only session cookie created at login.
    const response = await fetch("/api/generate-quiz", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileContent: text,
        quizType,
        count
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Server error: ${response.status}`)
    }

    const data = await response.json()
    return data.questions || []
  } catch (error) {
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Could not connect to the backend server. Make sure it's running on http://localhost:5000. Run 'npm run dev:server' in a new terminal.")
    }
    throw error
  }
}

const QUIZ_TYPES = [
  { id: "multiple_choice", label: "Multiple Choice", icon: "☑️", desc: "4 options per question" },
  { id: "true_false",      label: "True / False",    icon: "⚖️", desc: "Binary answer questions" },
  { id: "identification",  label: "Identification",  icon: "✏️", desc: "Write the correct answer" },
  { id: "mixed",           label: "Mixed",           icon: "🎲", desc: "All types combined" },
]

export default function QuizConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [module, setModule]           = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [savedFileRecord, setSavedFileRecord] = useState(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [quizType, setQuizType]       = useState("multiple_choice")
  const [count, setCount]             = useState(10)
  const [phase, setPhase]             = useState("config") // config | generating | active | finished
  const [questions, setQuestions]     = useState([])
  const [currentQ, setCurrentQ]       = useState(0)
  const [selected, setSelected]       = useState(null)
  const [identInput, setIdentInput]   = useState("")
  const [answered, setAnswered]       = useState(false)
  const [score, setScore]             = useState(0)
  const [answers, setAnswers]         = useState([])
  const [quizId, setQuizId]           = useState(null)
  const [attemptId, setAttemptId]     = useState(null)
  const [genError, setGenError]       = useState("")
  const [ongoingQuizzes, setOngoingQuizzes] = useState([])

  const refreshOngoingQuizzes = async (moduleId) => {
    try {
      const ongoing = await quizEngine.getOngoingQuizzes(moduleId)
      setOngoingQuizzes(ongoing)
    } catch (err) {
      console.warn('Failed to load ongoing quizzes:', err)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("uploadedModules")
    if (saved) {
      const all = JSON.parse(saved)
      const current = all.find(m => String(m.id) === String(id)) || null
      setModule(current)

      if (current) {
        getModuleFile(current.id)
          .then(record => setSavedFileRecord(record))
          .catch(() => setSavedFileRecord(null))

        refreshOngoingQuizzes(current.id)
      }
    }
  }, [id])

  const processFile = (file) => {
    setUploadError("")
    if (!file) return
    const OK = ["application/pdf", "text/plain", "text/markdown"]
    if (!OK.includes(file.type) && !file.name.endsWith(".md")) {
      setUploadError("Only PDF, TXT, or MD files are supported.")
      return
    }
    if (file.size > 10 * 1024 * 1024) { setUploadError("File must be under 10 MB."); return }
    setUploadedFile(file)
  }

  const handleGenerate = async () => {
    const fileToUse = uploadedFile || (savedFileRecord ? blobToFile(savedFileRecord) : null)
    if (!fileToUse) {
      setUploadError("Please upload the module file first, or save the module for offline use from the Modules page.")
      return
    }

    setGenError(""); setPhase("generating")
    try {
      const qs = await callClaude(fileToUse, quizType, count)
      setQuestions(qs)
      setCurrentQ(0); setSelected(null); setIdentInput(""); setAnswered(false)
      setScore(0); setAnswers([])
      setPhase("active")

      try {
        const created = await quizEngine.createQuiz({
          moduleId: module.id,
          title: module.title,
          type: quizType,
          questions: qs,
          totalQuestions: qs.length,
        })
        setQuizId(created.id)

        // Create an attempt for this quiz
        const attempt = {
          id: Date.now(),
          quizId: created.id,
          startTime: new Date().toISOString(),
          status: 'in_progress',
          answers: [],
          score: 0
        }
        await db.add('quizAttempts', attempt)
        setAttemptId(attempt.id)
        refreshOngoingQuizzes(module.id)
      } catch (saveError) {
        console.warn("Could not persist quiz definition:", saveError)
      }
    } catch (err) {
      console.error(err)
      setGenError(err.message || "Failed to generate quiz. Please try again.")
      setPhase("config")
    }
  }

  const handleResumeQuiz = async (ongoingQuiz) => {
    try {
      setGenError("")
      const resumed = await quizEngine.resumeQuiz(ongoingQuiz.attemptId)
      
      setQuizId(resumed.quiz.id)
      setAttemptId(ongoingQuiz.attemptId)
      setQuestions(resumed.quiz.questions)
      setCurrentQ(resumed.currentQuestion)
      setScore(resumed.score || 0)
      setAnswers(resumed.answers || [])
      setSelected(null)
      setIdentInput("")
      setAnswered(false)
      setPhase("active")
      refreshOngoingQuizzes(module.id)
    } catch (err) {
      console.error(err)
      setGenError("Failed to resume quiz: " + err.message)
    }
  }

  const q = questions[currentQ]

  const handleSubmit = async () => {
    if (answered) {
      if (currentQ + 1 >= questions.length) {
        setPhase("finished")
        const scorePercent = questions.length ? Math.round((score / questions.length) * 100) : 0
        try {
          // Mark attempt as completed
          if (attemptId) {
            const attempt = await db.get('quizAttempts', attemptId)
            if (attempt) {
              attempt.status = 'completed'
              attempt.score = score
              attempt.answers = answers
              attempt.completedAt = new Date().toISOString()
              await db.update('quizAttempts', attempt)
            }
          }

          await saveQuizResult({
            moduleId: module.id,
            moduleName: module.title,
            score,
            totalQuestions: questions.length,
            scorePercent,
            completedAt: new Date().toISOString(),
            status: "completed"
          })
        } catch (err) {
          console.warn("Failed to save quiz result:", err)
        }
        await refreshOngoingQuizzes(module.id)
        return
      }
      setCurrentQ(c => c + 1); setSelected(null); setIdentInput(""); setAnswered(false)
      return
    }

    let correct = false
    if (q.type === "multiple_choice") correct = selected === q.answer
    else if (q.type === "true_false") correct = selected === q.answer
    else if (q.type === "identification")
      correct = identInput.trim().toLowerCase() === String(q.answer).trim().toLowerCase()

    const nextScore = correct ? score + 1 : score
    const newAnswers = [...answers, { selected, identInput, correct }]
    setAnswers(newAnswers)
    setScore(nextScore)
    setAnswered(true)

    // Auto-save progress
    if (attemptId) {
      try {
        await quizEngine.saveQuizProgress(attemptId, currentQ, newAnswers, nextScore)
      } catch (err) {
        console.warn("Failed to auto-save progress:", err)
      }
    }
  }

  const canSubmit = q?.type === "identification"
    ? identInput.trim().length > 0
    : selected !== null

  const scorePercent = questions.length ? Math.round((score / questions.length) * 100) : 0
  const typeObj = QUIZ_TYPES.find(t => t.id === quizType)

  if (!module) return (
    <div className={styles.page}><Navbar />
      <div className={styles.notFound}>
        <p>Module not found.</p>
        <button className={styles.backBtn} onClick={() => navigate("/modules")}>← Back</button>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <Navbar />
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md"
        onChange={e => processFile(e.target.files[0])} style={{ display: "none" }} />

      <div className={styles.content}>
        <button className={styles.backBtn} onClick={() => navigate("/modules")}>← Back to Modules</button>

        {/* Module hero */}
        <div className={styles.hero}>
          <div className={styles.heroIcon}>{module.icon || "📚"}</div>
          <div>
            <h1 className={styles.heroTitle}>{module.title}</h1>
            <div className={styles.heroMeta}>
              {module.fileSize && <span>📄 {module.fileSize}</span>}
              {module.uploadedAt && <span>🗓 {new Date(module.uploadedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
            </div>
          </div>
        </div>

        {/* ── CONFIG ── */}
        {(phase === "config" || phase === "generating") && (
          <div className={styles.configPanel}>

            {/* Ongoing Quizzes */}
            {ongoingQuizzes.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>📝 Ongoing Quizzes</h2>
                <div className={styles.ongoingList}>
                  {ongoingQuizzes.map(quiz => (
                    <div key={quiz.attemptId} className={styles.ongoingCard}>
                      <div className={styles.ongoingInfo}>
                        <div>
                          <p className={styles.ongoingType}>
                            {QUIZ_TYPES.find(t => t.id === quiz.type)?.icon} {QUIZ_TYPES.find(t => t.id === quiz.type)?.label}
                          </p>
                          <p className={styles.ongoingProgress}>
                            Question {quiz.currentQuestion + 1} of {quiz.totalQuestions}
                          </p>
                        </div>
                        <div className={styles.ongoingBar}>
                          <div className={styles.ongoingBarFill} style={{ width: `${(quiz.currentQuestion / quiz.totalQuestions) * 100}%` }} />
                        </div>
                      </div>
                      <button
                        className={styles.resumeBtn}
                        onClick={() => handleResumeQuiz(quiz)}
                      >
                        Resume →
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Step 1 – File Source */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><span className={styles.stepNum}>1</span> File Source</h2>
              {savedFileRecord && !uploadedFile ? (
                <div className={styles.fileReady}>
                  <span className={styles.fileReadyIcon}>{savedFileRecord.fileType === "application/pdf" ? "📄" : "📝"}</span>
                  <div className={styles.fileReadyInfo}>
                    <p className={styles.fileReadyName}>{savedFileRecord.fileName}</p>
                    <p className={styles.fileReadySize}>{savedFileRecord.fileSize} · ✅ Ready from uploaded module</p>
                  </div>
                  <button className={styles.removeBtn} onClick={() => setSavedFileRecord(null)}>✕</button>
                </div>
              ) : !uploadedFile ? (
                <div
                  className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]) }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.dropzoneIcon}>{isDragging ? "📥" : "☁️"}</div>
                  <p className={styles.dropzoneText}>{isDragging ? "Drop to upload!" : "Drag & drop your file here"}</p>
                  <p className={styles.dropzoneSub}>or click to browse &nbsp;·&nbsp; PDF · TXT · MD &nbsp;·&nbsp; Max 10 MB</p>
                </div>
              ) : (
                <div className={styles.fileReady}>
                  <span className={styles.fileReadyIcon}>{uploadedFile.type === "application/pdf" ? "📄" : "📝"}</span>
                  <div className={styles.fileReadyInfo}>
                    <p className={styles.fileReadyName}>{uploadedFile.name}</p>
                    <p className={styles.fileReadySize}>{(uploadedFile.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; ✅ Ready</p>
                  </div>
                  <button className={styles.removeBtn} onClick={() => setUploadedFile(null)}>✕</button>
                </div>
              )}
              {savedFileRecord && !uploadedFile && (
                <p className={styles.hintText}>Using the file already saved from your module upload. You can still upload a new file to override it.</p>
              )}
              {uploadError && <p className={styles.errMsg}>⚠️ {uploadError}</p>}
            </section>

            {/* Step 2 – Quiz type */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><span className={styles.stepNum}>2</span> Quiz Type</h2>
              <div className={styles.typeGrid}>
                {QUIZ_TYPES.map(t => (
                  <button
                    key={t.id}
                    className={`${styles.typeCard} ${quizType === t.id ? styles.typeCardOn : ""}`}
                    onClick={() => setQuizType(t.id)}
                  >
                    <span className={styles.typeIcon}>{t.icon}</span>
                    <span className={styles.typeLabel}>{t.label}</span>
                    <span className={styles.typeDesc}>{t.desc}</span>
                    {quizType === t.id && <span className={styles.typeCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3 – Count */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}><span className={styles.stepNum}>3</span> Number of Questions</h2>
              <div className={styles.countRow}>
                <button className={styles.countBtn} onClick={() => setCount(c => Math.max(10, c - 5))} disabled={count <= 10}>−5</button>
                <button className={styles.countBtn} onClick={() => setCount(c => Math.max(10, c - 1))} disabled={count <= 10}>−</button>
                <div className={styles.countDisplay}>
                  <span className={styles.countNum}>{count}</span>
                  <span className={styles.countUnit}>questions</span>
                </div>
                <button className={styles.countBtn} onClick={() => setCount(c => Math.min(50, c + 1))} disabled={count >= 50}>+</button>
                <button className={styles.countBtn} onClick={() => setCount(c => Math.min(50, c + 5))} disabled={count >= 50}>+5</button>
              </div>
              <input
                type="range" min="10" max="50" step="1" value={count}
                onChange={e => setCount(Number(e.target.value))}
                className={styles.slider}
              />
              <div className={styles.sliderLabels}><span>10 min</span><span>50 max</span></div>
            </section>

            {genError && <p className={styles.errMsg}>⚠️ {genError}</p>}

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={phase === "generating" || (!uploadedFile && !savedFileRecord)}
            >
              {phase === "generating"
                ? <span className={styles.spinRow}><span className={styles.spin}></span> Generating {count} questions…</span>
                : `✨ Generate ${count}-Question ${typeObj?.label} Quiz`}
            </button>
          </div>
        )}

        {/* ── ACTIVE QUIZ ── */}
        {phase === "active" && q && (
          <div className={styles.quizPanel}>
            <div className={styles.quizTopBar}>
              <div className={styles.quizLeft}>
                <span className={styles.typeBadge}>{QUIZ_TYPES.find(t => t.id === q.type)?.icon} {QUIZ_TYPES.find(t => t.id === q.type)?.label}</span>
                <span className={styles.qCounter}>Q {currentQ + 1} / {questions.length}</span>
              </div>
              <span className={styles.scoreBadge}>Score: {score}</span>
            </div>

            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${(currentQ / questions.length) * 100}%` }} />
            </div>

            <p className={styles.questionText}>{q.question}</p>

            {/* Multiple Choice */}
            {q.type === "multiple_choice" && (
              <div className={styles.options}>
                {q.options.map((opt, i) => {
                  let cls = styles.option
                  if (answered) {
                    if (i === q.answer) cls = `${styles.option} ${styles.optCorrect}`
                    else if (i === selected) cls = `${styles.option} ${styles.optWrong}`
                  } else if (i === selected) cls = `${styles.option} ${styles.optSelected}`
                  return (
                    <button key={i} className={cls} onClick={() => !answered && setSelected(i)} disabled={answered}>
                      <span className={styles.optLetter}>{String.fromCharCode(65 + i)}</span>
                      <span>{opt.replace(/^[A-D]\.\s*/, "")}</span>
                      {answered && i === q.answer && <span className={styles.tag}>✓</span>}
                      {answered && i === selected && i !== q.answer && <span className={styles.tag}>✗</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* True / False */}
            {q.type === "true_false" && (
              <div className={styles.tfRow}>
                {["True", "False"].map(val => {
                  let cls = styles.tfBtn
                  if (answered) {
                    if (val === q.answer) cls = `${styles.tfBtn} ${styles.tfCorrect}`
                    else if (val === selected) cls = `${styles.tfBtn} ${styles.tfWrong}`
                  } else if (val === selected) cls = `${styles.tfBtn} ${styles.tfSelected}`
                  return (
                    <button key={val} className={cls} onClick={() => !answered && setSelected(val)} disabled={answered}>
                      {val === "True" ? "✅ True" : "❌ False"}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Identification */}
            {q.type === "identification" && (
              <div className={styles.identWrap}>
                <input
                  autoFocus
                  type="text"
                  className={`${styles.identInput} ${answered ? (answers[answers.length-1]?.correct ? styles.identOk : styles.identBad) : ""}`}
                  placeholder="Type your answer…"
                  value={identInput}
                  onChange={e => !answered && setIdentInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (canSubmit || answered) && handleSubmit()}
                  disabled={answered}
                />
                {answered && (
                  <p className={styles.identResult}>
                    {answers[answers.length-1]?.correct ? "✅ Correct!" : `❌ Answer: "${q.answer}"`}
                  </p>
                )}
              </div>
            )}

            {/* Explanation */}
            {answered && (
              <div className={`${styles.explanation} ${answers[answers.length-1]?.correct ? styles.expOk : styles.expBad}`}>
                <strong>{answers[answers.length-1]?.correct ? "✅ Correct!" : "❌ Incorrect"}</strong>
                <p>{q.explanation}</p>
              </div>
            )}

            <div className={styles.quizActions}>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!answered && !canSubmit}
              >
                {!answered ? "Submit Answer"
                  : currentQ + 1 >= questions.length ? "See Results →"
                  : "Next Question →"}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "finished" && (
          <div className={styles.results}>
            <div className={styles.resultsEmoji}>{scorePercent >= 80 ? "🏆" : scorePercent >= 60 ? "👍" : "📚"}</div>
            <h2 className={styles.resultsTitle}>Quiz Complete!</h2>
            <p className={styles.resultsSub}>{module.title} · {typeObj?.label} · {questions.length} questions</p>

            <div className={styles.scoreCircle}>
              <span className={styles.scoreNum}>{score}/{questions.length}</span>
              <span className={styles.scorePct}>{scorePercent}%</span>
            </div>

            <p className={styles.resultsFeedback}>
              {scorePercent >= 80 ? "Excellent work! You've mastered this material." :
               scorePercent >= 60 ? "Good job! A bit more review and you'll ace it." :
               "Keep studying! Review the material and try again."}
            </p>

            <div className={styles.breakdown}>
              {questions.map((ques, i) => (
                <div key={i} className={`${styles.bItem} ${answers[i]?.correct ? styles.bOk : styles.bBad}`}>
                  <span className={styles.bIcon}>{answers[i]?.correct ? "✓" : "✗"}</span>
                  <span className={styles.bQ}>Q{i+1}: {ques.question.slice(0,60)}{ques.question.length>60?"…":""}</span>
                  <span>{QUIZ_TYPES.find(t => t.id === ques.type)?.icon}</span>
                </div>
              ))}
            </div>

            <div className={styles.resultsBtns}>
              <button className={`${styles.rBtn} ${styles.rPrimary}`}
                onClick={() => { setCurrentQ(0); setSelected(null); setIdentInput(""); setAnswered(false); setScore(0); setAnswers([]); setPhase("active") }}>
                🔄 Retry Quiz
              </button>
              <button className={`${styles.rBtn} ${styles.rSecondary}`}
                onClick={() => { setPhase("config"); setQuestions([]); setAnswers([]); setScore(0) }}>
                ⚙️ New Config
              </button>
              <button className={`${styles.rBtn} ${styles.rOutline}`} onClick={() => navigate("/modules")}>
                ← Modules
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}