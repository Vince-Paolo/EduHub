# Integration Examples - How to Use the New Features

## Quick Integration Guide

This guide shows exactly how to integrate the new offline-first features into your existing components.

---

## 1. Add Testing UI to App.jsx

**Location**: `src/App.jsx`

```javascript
import { useAuth } from './context/AuthContext';
import OfflineTransitionTest from './components/OfflineTransitionTest';

export default function App() {
  const { user } = useAuth();

  return (
    <AuthProvider>
      {/* Your existing app content */}
      <YourMainApp />

      {/* Add this for offline testing (development only) */}
      {process.env.NODE_ENV === 'development' && user?.uid && (
        <OfflineTransitionTest userId={user.uid} />
      )}
    </AuthProvider>
  );
}
```

---

## 2. Display Offline Indicator in Dashboard

**Location**: `src/pages/Dashboard.jsx`

```javascript
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { isOnline, pendingItems } = useOnlineStatus(user?.uid);

  return (
    <div className={styles.dashboard}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          <span className={styles.indicator}>🔴 OFFLINE</span>
          <span className={styles.message}>
            {pendingItems > 0
              ? `${pendingItems} item(s) pending sync`
              : 'Waiting for connection...'}
          </span>
        </div>
      )}

      {/* Rest of your dashboard content */}
      <h1>Dashboard</h1>
      {/* ... */}
    </div>
  );
}
```

**Add to Dashboard.module.css**:
```css
.offlineBanner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin-bottom: 20px;
  animation: slideDown 0.3s ease-out;
}

.indicator {
  font-weight: 700;
  color: #dc2626;
}

.message {
  color: #991b1b;
  font-size: 14px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 3. Mark Lessons Complete in Modules

**Location**: `src/pages/Modules.jsx` or lesson component

```javascript
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../hooks/useProgress';
import styles from './Modules.module.css';

export default function ModuleView({ moduleId, lessons }) {
  const { user } = useAuth();
  const { progress, markDone, loading } = useProgress(user?.uid, moduleId, lessons.length);

  if (loading) return <div>Loading progress...</div>;

  const handleLessonComplete = async (lessonId) => {
    try {
      await markDone(lessonId);
      // UI automatically updates via React state
      console.info(`Lesson ${lessonId} marked complete (synced or queued)`);
    } catch (err) {
      console.error('Error marking lesson complete:', err);
    }
  };

  return (
    <div className={styles.moduleContainer}>
      <h2>Module: {moduleId}</h2>
      <div className={styles.progressBar}>
        <div 
          className={styles.fill}
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
      <span>{progress.percentComplete}% Complete</span>

      <div className={styles.lessonList}>
        {lessons.map((lesson) => {
          const isComplete = progress.completedLessons?.includes(lesson.id);
          
          return (
            <div key={lesson.id} className={styles.lessonItem}>
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
              
              {isComplete ? (
                <span className={styles.badge}>✓ Completed</span>
              ) : (
                <button
                  onClick={() => handleLessonComplete(lesson.id)}
                  className={styles.button}
                >
                  Mark Complete
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 4. Record Quiz Scores

**Location**: `src/pages/Quiz.jsx`

```javascript
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../hooks/useProgress';
import styles from './Quiz.module.css';

export default function QuizPage({ moduleId, quizId }) {
  const { user } = useAuth();
  const { progress, recordScore } = useProgress(user?.uid, moduleId, 0);
  const [answers, setAnswers] = useState({});

  const handleSubmit = async () => {
    const score = calculateScore(answers); // Your scoring logic
    const total = questions.length;

    try {
      const result = await recordScore(quizId, score, total);
      
      // Show result to user
      alert(`You scored ${result.percentage}%! ${result.passed ? '✓ Passed!' : '✗ Please try again'}`);
      
      // UI updates automatically
      console.info('Quiz result recorded (synced or queued):', result);
    } catch (err) {
      console.error('Error recording quiz score:', err);
    }
  };

  // Check if already passed
  const hasPassedAlready = progress.quizScores?.[quizId]?.passed;

  return (
    <div className={styles.quizContainer}>
      <h1>Quiz: {quizId}</h1>
      
      {hasPassedAlready && (
        <div className={styles.passedBanner}>
          ✓ You already passed this quiz!
          Score: {progress.quizScores[quizId].score}/{progress.quizScores[quizId].total}
        </div>
      )}

      {/* Quiz questions */}
      <form onSubmit={handleSubmit}>
        {/* Your questions here */}
        <button type="submit" className={styles.submitButton}>
          Submit Quiz
        </button>
      </form>
    </div>
  );
}
```

---

## 5. Show Sync Status in Navbar

**Location**: `src/components/Navbar.jsx`

```javascript
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user } = useAuth();
  const { isOnline, pendingItems } = useOnlineStatus(user?.uid);

  return (
    <nav className={styles.navbar}>
      {/* Your existing navbar content */}
      
      {/* Add sync status indicator */}
      <div className={styles.syncStatus}>
        <span className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`}>
          ●
        </span>
        <span className={styles.statusText}>
          {isOnline 
            ? pendingItems > 0 
              ? `Syncing (${pendingItems})...` 
              : 'Synced'
            : 'Offline'}
        </span>
      </div>
    </nav>
  );
}
```

**Add to Navbar.module.css**:
```css
.syncStatus {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f0f4f8;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.statusDot {
  display: inline-block;
  font-size: 16px;
  animation: blink 1s infinite;
}

.statusDot.online {
  color: #10b981;
}

.statusDot.offline {
  color: #ef4444;
}

.statusText {
  color: #475569;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 6. Handle Offline Mode in Components

**Location**: Any component that does data operations

```javascript
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useProgress } from '../hooks/useProgress';

export default function MyComponent({ userId, moduleId }) {
  const { isOnline, pendingItems } = useOnlineStatus(userId);
  const { progress, loading, error } = useProgress(userId, moduleId, 10);

  // Disable certain actions when offline
  const isActionDisabled = loading || (!isOnline && pendingItems > 5);

  return (
    <div>
      {error && <div className="error">Error loading progress: {error.message}</div>}
      
      {!isOnline && (
        <div className="warning">
          You're offline. Changes will be synced when you're back online.
        </div>
      )}

      <button 
        disabled={isActionDisabled}
        onClick={handleAction}
      >
        {loading ? 'Loading...' : !isOnline ? 'Offline' : 'Action'}
      </button>
    </div>
  );
}
```

---

## 7. Debug Sync Issues

**In browser console during development**:

```javascript
// Import modules
import { peekQueue, queueSize, flushQueue } from './services/syncQueue';
import { getAllProgress } from './services/progressTracker';

const userId = 'current-user-id';

// Check current state
console.log('Progress:', getAllProgress(userId));
console.log('Queue size:', queueSize(userId));
console.log('Queue items:', peekQueue(userId));

// Manually flush
await flushQueue(userId).then(result => {
  console.log('Flush result:', result);
});

// Check localStorage directly
localStorage.getItem(`eduhub_progress_${userId}`);
localStorage.getItem(`eduhub_syncqueue_${userId}`);
```

---

## 8. Complete Example: Dashboard with Offline Support

**Location**: `src/pages/Dashboard.jsx` (complete example)

```javascript
import { useAuth } from '../context/AuthContext';
import { useAllProgress } from '../hooks/useProgress';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import ModuleCard from '../components/ModuleCard';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { allProgress, loading } = useAllProgress(user?.uid);
  const { isOnline, pendingItems } = useOnlineStatus(user?.uid);

  if (loading) return <div className={styles.loading}>Loading your progress...</div>;

  return (
    <div className={styles.dashboard}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          <span className={styles.icon}>🔴</span>
          <div>
            <strong>You're Offline</strong>
            <p>
              {pendingItems > 0
                ? `${pendingItems} changes will sync when you're back online`
                : 'Changes will sync automatically when connected'}
            </p>
          </div>
        </div>
      )}

      {/* Sync Status */}
      <div className={styles.syncStatus}>
        <span className={isOnline ? styles.online : styles.offline}>
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span>
          {isOnline 
            ? pendingItems > 0 
              ? `Syncing ${pendingItems} changes...` 
              : 'All synced'
            : `Offline mode (${pendingItems} pending)`}
        </span>
      </div>

      {/* Modules Grid */}
      <div className={styles.modulesGrid}>
        {Object.entries(allProgress).map(([moduleId, progress]) => (
          <ModuleCard
            key={moduleId}
            moduleId={moduleId}
            progress={progress}
            isOnline={isOnline}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Open app and note initial online status
- [ ] Click "Offline Test" button (bottom right)
- [ ] Click "Go Offline"
- [ ] Complete a lesson
- [ ] Check that queue shows 1+ item
- [ ] Click "Come Online"
- [ ] Verify queue clears automatically
- [ ] Check Firestore console for updated data
- [ ] Repeat with quiz scores
- [ ] Test on multiple pages
- [ ] Run: `npm test` and verify all tests pass

---

## Troubleshooting

### Queue items not syncing
1. Check browser console for errors
2. Verify Firebase credentials in `.env`
3. Check network tab to see if POST requests are being sent
4. Manually trigger flush in dev panel

### Progress not saving offline
1. Check localStorage in DevTools
2. Verify `initSyncQueue` was called (check console logs)
3. Ensure user is signed in with valid UID

### Tests failing
1. Clear node_modules: `rm -r node_modules && npm install`
2. Run: `npm test -- --clearCache`
3. Check for TypeScript errors: `npm run type-check`

---

## Next Steps

1. Copy/paste examples above into your components
2. Test offline by using the dev panel
3. Run `npm test` to verify functionality
4. Deploy when confident

