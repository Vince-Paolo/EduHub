// services/quizEngine.js
import { db } from './database'

export class QuizEngine {
  constructor() {
    this.currentQuiz = null
    this.answers = []
    this.startTime = null
  }

  async createQuiz(quizData) {
    const quiz = {
      id: quizData.id || Date.now(),
      moduleId: quizData.moduleId,
      title: quizData.title,
      type: quizData.type || 'mixed',
      questions: quizData.questions || [],
      totalQuestions: quizData.questions?.length || 0,
      timeLimit: quizData.timeLimit || null, // in minutes
      passingScore: quizData.passingScore || 60,
      status: 'created',
      createdAt: new Date().toISOString()
    }

    await db.add('quizzes', quiz)
    return quiz
  }

  async startQuiz(quizId, userId) {
    const quiz = await db.get('quizzes', quizId)
    if (!quiz) throw new Error('Quiz not found')

    this.currentQuiz = quiz
    this.answers = []
    this.startTime = Date.now()

    // Create a new attempt
    const attempt = {
      id: Date.now(),
      quizId,
      userId,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      answers: [],
      score: 0
    }

    await db.add('quizAttempts', attempt)
    
    // Shuffle questions if needed
    const questions = [...quiz.questions]
    if (quiz.randomOrder) {
      this.shuffleArray(questions)
    }

    return {
      attemptId: attempt.id,
      questions: questions,
      timeLimit: quiz.timeLimit
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }

  async submitAnswer(attemptId, questionIndex, answer) {
    const attempt = await db.get('quizAttempts', attemptId)
    if (!attempt) throw new Error('Attempt not found')

    const quiz = await db.get('quizzes', attempt.quizId)
    const question = quiz.questions[questionIndex]
    
    let isCorrect = false
    switch (question.type) {
      case 'multiple_choice':
        isCorrect = answer === question.answer
        break
      case 'true_false':
        isCorrect = answer === question.answer
        break
      case 'identification':
        isCorrect = answer.trim().toLowerCase() === question.answer.trim().toLowerCase()
        break
    }

    attempt.answers[questionIndex] = {
      questionIndex,
      userAnswer: answer,
      correctAnswer: question.answer,
      isCorrect,
      answeredAt: new Date().toISOString()
    }

    await db.update('quizAttempts', attempt)
    return { isCorrect, correctAnswer: question.answer }
  }

  async finishQuiz(attemptId) {
    const attempt = await db.get('quizAttempts', attemptId)
    if (!attempt) throw new Error('Attempt not found')

    const quiz = await db.get('quizzes', attempt.quizId)
    
    // Calculate score
    const correctAnswers = attempt.answers.filter(a => a.isCorrect).length
    const totalQuestions = quiz.totalQuestions
    const scorePercent = Math.round((correctAnswers / totalQuestions) * 100)
    const passed = scorePercent >= quiz.passingScore

    attempt.status = 'completed'
    attempt.score = scorePercent
    attempt.passed = passed
    attempt.completedAt = new Date().toISOString()
    attempt.timeSpent = Math.round((Date.now() - this.startTime) / 1000) // in seconds

    await db.update('quizAttempts', attempt)

    // Save to quiz history
    const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]')
    quizHistory.unshift({
      id: attempt.id,
      moduleName: quiz.title,
      moduleId: quiz.moduleId,
      score: correctAnswers,
      totalQuestions,
      scorePercent,
      status: 'completed',
      completedAt: attempt.completedAt
    })
    localStorage.setItem('quizHistory', JSON.stringify(quizHistory))

    return {
      score: correctAnswers,
      totalQuestions,
      scorePercent,
      passed,
      timeSpent: attempt.timeSpent,
      answers: attempt.answers
    }
  }

  async getQuizResults(quizId) {
    const attempts = await db.getByIndex('quizAttempts', 'quizId', quizId)
    return attempts.filter(a => a.status === 'completed')
  }

  async getOngoingQuizzes(moduleId) {
    try {
      const allAttempts = await db.getAll('quizAttempts')
      const quizzes = await db.getAll('quizzes')
      
      // Find all in-progress attempts for this module
      const ongoingAttempts = allAttempts.filter(attempt => {
        const quiz = quizzes.find(q => q.id === attempt.quizId)
        return attempt.status === 'in_progress' && quiz && quiz.moduleId === moduleId
      })

      // Enrich with quiz details
      return ongoingAttempts.map(attempt => {
        const quiz = quizzes.find(q => q.id === attempt.quizId)
        return {
          attemptId: attempt.id,
          quizId: attempt.quizId,
          moduleId: quiz.moduleId,
          title: quiz.title,
          type: quiz.type,
          totalQuestions: quiz.totalQuestions,
          currentQuestion: attempt.answers.filter(a => a).length,
          answeredCount: attempt.answers.filter(a => a).length,
          startedAt: attempt.startTime,
          status: 'in_progress'
        }
      })
    } catch (error) {
      console.warn('Error getting ongoing quizzes:', error)
      return []
    }
  }

  async resumeQuiz(attemptId) {
    try {
      const attempt = await db.get('quizAttempts', attemptId)
      if (!attempt || attempt.status !== 'in_progress') {
        throw new Error('Attempt not found or already completed')
      }

      const quiz = await db.get('quizzes', attempt.quizId)
      if (!quiz) throw new Error('Quiz not found')

      return {
        attemptId: attempt.id,
        quiz: quiz,
        currentQuestion: attempt.answers.filter(a => a).length,
        answers: attempt.answers || [],
        score: attempt.score || 0
      }
    } catch (error) {
      console.error('Error resuming quiz:', error)
      throw error
    }
  }

  async saveQuizProgress(attemptId, currentQuestion, answers, score) {
    try {
      const attempt = await db.get('quizAttempts', attemptId)
      if (!attempt) throw new Error('Attempt not found')

      attempt.answers = answers
      attempt.score = score
      attempt.lastUpdated = new Date().toISOString()

      await db.update('quizAttempts', attempt)
      return attempt
    } catch (error) {
      console.error('Error saving quiz progress:', error)
      throw error
    }
  }

  async getUserQuizHistory(userId) {
    return await db.getByIndex('quizAttempts', 'userId', userId)
  }
}

export const quizEngine = new QuizEngine()