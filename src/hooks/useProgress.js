/**
 * useProgress.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that exposes progress tracking to any component.
 *
 * Usage:
 *   const { progress, markDone, recordScore, loading } = useProgress(userId, moduleId);
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadProgress,
  markLessonComplete,
  recordQuizScore,
  getModuleProgress,
  resetModuleProgress,
} from '../services/progressTracker';

/**
 * @param {string}  userId       - current authenticated user's uid
 * @param {string}  moduleId     - the module being viewed
 * @param {number}  totalLessons - total lessons in this module (for % calc)
 */
export function useProgress(userId, moduleId, totalLessons = 0) {
  const [progress, setProgress] = useState(getModuleProgress(userId, moduleId));
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Initial load — merges local + remote
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    setLoading(true);
    loadProgress(userId)
      .then((all) => setProgress(all[moduleId] ?? { completedLessons: [], quizScores: {}, percentComplete: 0 }))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [userId, moduleId]);

  const markDone = useCallback(async (lessonId) => {
    const updated = await markLessonComplete(userId, moduleId, lessonId, totalLessons);
    setProgress((prev) => ({ ...prev, ...updated }));
  }, [userId, moduleId, totalLessons]);

  const recordScore = useCallback(async (quizId, score, total) => {
    const result = await recordQuizScore(userId, moduleId, quizId, score, total);
    setProgress((prev) => ({
      ...prev,
      quizScores: { ...(prev.quizScores ?? {}), [quizId]: result },
    }));
    return result;
  }, [userId, moduleId]);

  const reset = useCallback(async () => {
    await resetModuleProgress(userId, moduleId);
    setProgress({ completedLessons: [], quizScores: {}, percentComplete: 0 });
  }, [userId, moduleId]);

  const isLessonDone   = useCallback((lessonId) =>
    (progress.completedLessons ?? []).includes(lessonId), [progress]);

  const hasPassedQuiz  = useCallback((quizId) =>
    progress.quizScores?.[quizId]?.passed ?? false, [progress]);

  return { progress, loading, error, markDone, recordScore, reset, isLessonDone, hasPassedQuiz };
}

/**
 * Lighter hook for a dashboard overview — returns all modules at once.
 *
 * Usage:
 *   const { allProgress, loading } = useAllProgress(userId);
 */
export function useAllProgress(userId) {
  const [allProgress, setAllProgress] = useState({});
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    loadProgress(userId)
      .then(setAllProgress)
      .finally(() => setLoading(false));
  }, [userId]);

  return { allProgress, loading };
}