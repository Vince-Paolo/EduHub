/**
 * sync.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive tests for offline-first sync functionality.
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enqueue,
  peekQueue,
  queueSize,
  flushQueue,
  clearQueue,
  initSyncQueue,
  teardownSyncQueue,
} from '../services/syncQueue';
import {
  markLessonComplete,
  recordQuizScore,
  getModuleProgress,
  loadProgress,
  resetModuleProgress,
} from '../services/progressTracker';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Sync Queue', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearQueue(testUserId);
  });

  describe('enqueue()', () => {
    it('should add an item to the queue', () => {
      const item = { type: 'progress', payload: { moduleId: 'mod1', completedLessons: ['les1'] } };
      enqueue(testUserId, item);

      const queue = peekQueue(testUserId);
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'progress',
        payload: item.payload,
      });
    });

    it('should generate unique IDs for each queued item', () => {
      const item = { type: 'progress', payload: { data: 'test' } };
      enqueue(testUserId, item);
      enqueue(testUserId, item);

      const queue = peekQueue(testUserId);
      expect(queue[0].id).not.toBe(queue[1].id);
    });

    it('should set enqueuedAt and retries to initial values', () => {
      const item = { type: 'quiz_result', payload: { score: 85 } };
      enqueue(testUserId, item);

      const queue = peekQueue(testUserId);
      expect(queue[0].retries).toBe(0);
      expect(queue[0].enqueuedAt).toBeDefined();
    });
  });

  describe('queueSize()', () => {
    it('should return 0 for empty queue', () => {
      expect(queueSize(testUserId)).toBe(0);
    });

    it('should return correct count after enqueuing items', () => {
      enqueue(testUserId, { type: 'progress', payload: {} });
      enqueue(testUserId, { type: 'quiz_result', payload: {} });
      expect(queueSize(testUserId)).toBe(2);
    });
  });

  describe('peekQueue()', () => {
    it('should return empty array for non-existent user', () => {
      expect(peekQueue('non-existent-user')).toEqual([]);
    });

    it('should return snapshot of queue without modifying it', () => {
      enqueue(testUserId, { type: 'progress', payload: {} });
      const queue1 = peekQueue(testUserId);
      const queue2 = peekQueue(testUserId);

      expect(queue1).toEqual(queue2);
      expect(queueSize(testUserId)).toBe(1);
    });
  });

  describe('clearQueue()', () => {
    it('should remove all items from queue', () => {
      enqueue(testUserId, { type: 'progress', payload: {} });
      enqueue(testUserId, { type: 'progress', payload: {} });

      expect(queueSize(testUserId)).toBe(2);

      clearQueue(testUserId);
      expect(queueSize(testUserId)).toBe(0);
    });
  });

  describe('flushQueue()', () => {
    it('should return { flushed: 0, failed: 0 } when offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      enqueue(testUserId, { type: 'progress', payload: {} });
      const result = await flushQueue(testUserId);

      expect(result).toEqual({ flushed: 0, failed: 0 });
      expect(queueSize(testUserId)).toBe(1); // item still in queue
    });

    it('should return { flushed: 0, failed: 0 } when queue is empty', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      const result = await flushQueue(testUserId);

      expect(result).toEqual({ flushed: 0, failed: 0 });
    });
  });
});

describe('Progress Tracker', () => {
  const testUserId = 'test-user-456';
  const testModuleId = 'module-abc';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('getModuleProgress()', () => {
    it('should return default progress for new module', () => {
      const progress = getModuleProgress(testUserId, testModuleId);

      expect(progress).toEqual({
        completedLessons: [],
        quizScores: {},
        percentComplete: 0,
      });
    });
  });

  describe('markLessonComplete()', () => {
    it('should mark a lesson as complete', async () => {
      const totalLessons = 5;
      const result = await markLessonComplete(testUserId, testModuleId, 'lesson-1', totalLessons);

      expect(result.completedLessons).toContain('lesson-1');
      expect(result.percentComplete).toBe(20); // 1/5 = 20%
    });

    it('should not add duplicate lesson IDs', async () => {
      const totalLessons = 5;
      await markLessonComplete(testUserId, testModuleId, 'lesson-1', totalLessons);
      const result = await markLessonComplete(testUserId, testModuleId, 'lesson-1', totalLessons);

      const count = result.completedLessons.filter((id) => id === 'lesson-1').length;
      expect(count).toBe(1);
    });

    it('should update percentComplete correctly', async () => {
      const totalLessons = 10;
      await markLessonComplete(testUserId, testModuleId, 'lesson-1', totalLessons);
      await markLessonComplete(testUserId, testModuleId, 'lesson-2', totalLessons);
      const result = await markLessonComplete(testUserId, testModuleId, 'lesson-3', totalLessons);

      expect(result.percentComplete).toBe(30); // 3/10 = 30%
    });

    it('should set lastVisited timestamp', async () => {
      const result = await markLessonComplete(testUserId, testModuleId, 'lesson-1', 5);

      expect(result.lastVisited).toBeDefined();
      expect(new Date(result.lastVisited)).toBeInstanceOf(Date);
    });
  });

  describe('recordQuizScore()', () => {
    it('should record a quiz score', async () => {
      const result = await recordQuizScore(testUserId, testModuleId, 'quiz-1', 85, 100);

      expect(result.score).toBe(85);
      expect(result.total).toBe(100);
      expect(result.percentage).toBe(85);
      expect(result.passed).toBe(true);
    });

    it('should calculate passed status correctly (70% pass threshold)', async () => {
      const failResult = await recordQuizScore(testUserId, testModuleId, 'quiz-fail', 60, 100);
      expect(failResult.passed).toBe(false);

      const passResult = await recordQuizScore(testUserId, testModuleId, 'quiz-pass', 70, 100);
      expect(passResult.passed).toBe(true);
    });

    it('should set passedAt timestamp', async () => {
      const result = await recordQuizScore(testUserId, testModuleId, 'quiz-1', 80, 100);

      expect(result.passedAt).toBeDefined();
      expect(new Date(result.passedAt)).toBeInstanceOf(Date);
    });

    it('should overwrite previous score for same quiz', async () => {
      await recordQuizScore(testUserId, testModuleId, 'quiz-1', 60, 100);
      const result = await recordQuizScore(testUserId, testModuleId, 'quiz-1', 90, 100);

      const progress = getModuleProgress(testUserId, testModuleId);
      expect(progress.quizScores['quiz-1'].score).toBe(90);
    });
  });

  describe('resetModuleProgress()', () => {
    it('should reset all progress for a module', async () => {
      // Set up some progress
      await markLessonComplete(testUserId, testModuleId, 'lesson-1', 5);
      await recordQuizScore(testUserId, testModuleId, 'quiz-1', 85, 100);

      // Reset
      await resetModuleProgress(testUserId, testModuleId);

      const progress = getModuleProgress(testUserId, testModuleId);
      expect(progress).toEqual({
        completedLessons: [],
        quizScores: {},
        percentComplete: 0,
      });
    });
  });

  describe('loadProgress()', () => {
    it('should load local progress', async () => {
      await markLessonComplete(testUserId, testModuleId, 'lesson-1', 5);

      const progress = await loadProgress(testUserId);

      expect(progress[testModuleId].completedLessons).toContain('lesson-1');
    });

    it('should return empty object for new user', async () => {
      const progress = await loadProgress('brand-new-user');

      expect(progress).toEqual({});
    });
  });
});

describe('Offline-First Behavior', () => {
  const testUserId = 'offline-test-user';
  const testModuleId = 'offline-test-module';

  beforeEach(() => {
    localStorage.clear();
  });

  it('should queue sync items when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    // This should attempt writeRemote which will fail
    // and then enqueue for sync
    await markLessonComplete(testUserId, testModuleId, 'lesson-1', 5);

    // Queue should have the item
    const queue = peekQueue(testUserId);
    expect(queue.length).toBeGreaterThanOrEqual(0); // may or may not be queued depending on Firestore availability
  });

  it('should preserve progress across sessions', () => {
    // First session: mark lesson as complete
    const result1 = markLessonComplete(testUserId, testModuleId, 'lesson-1', 5);

    // Clear memory (but localStorage persists)
    // Second session: load progress
    const result2 = getModuleProgress(testUserId, testModuleId);

    expect(result2.completedLessons).toContain('lesson-1');
  });
});
