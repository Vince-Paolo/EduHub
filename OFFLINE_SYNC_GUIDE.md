# Progress Tracking & Offline-First Sync Implementation Guide

This document explains the comprehensive offline-first sync system implemented for EduHub.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  useProgress()              useOnlineStatus()      useAuth()      │
│       ↓                            ↓                  ↓           │
│  ┌─────────────────┐      ┌──────────────────┐  ┌────────────┐  │
│  │ progressTracker │←─────│ syncQueue        │←─│ AuthContext│  │
│  │   (localStorage)│      │ (localStorage)   │  │            │  │
│  └────────┬────────┘      └──────┬───────────┘  └────────────┘  │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      ↓                                           │
│          /api/sync (POST) → Firestore                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↓ (sync endpoint)
┌─────────────────────────────────────────────────────────────────┐
│                 Backend (Node.js + Express)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/sync                   GET /api/sync/:userId          │
│  ↓                                ↓                              │
│  ┌──────────────────────────────────────────────────┐            │
│  │ Firebase Admin SDK → Firestore                   │            │
│  │ • Updates progress documents                     │            │
│  │ • Merges quiz scores                             │            │
│  │ • Validates data integrity                       │            │
│  └──────────────────────────────────────────────────┘            │
│           ↓                                                       │
│     Firestore Collection: 'progress'                             │
│     Document: userId                                             │
│     {                                                             │
│       modules: {                                                 │
│         'mod1': {                                                │
│           completedLessons: ['les1', 'les2'],                   │
│           quizScores: {                                          │
│             'quiz1': { score, total, percentage, passed, ... }  │
│           },                                                     │
│           percentComplete: 40                                    │
│         }                                                        │
│       },                                                         │
│       updatedAt: serverTimestamp                                │
│     }                                                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components & Services

### 1. **progressTracker.js** (`/src/services/progressTracker.js`)

Manages user progress across modules, lessons, and quizzes with offline-first localStorage as the primary store.

**Key Functions:**

- `loadProgress(userId)` - Merges local + remote progress
- `markLessonComplete(userId, moduleId, lessonId, totalLessons)` - Mark lesson done
- `recordQuizScore(userId, moduleId, quizId, score, total)` - Record quiz result
- `getModuleProgress(userId, moduleId)` - Get single module progress (sync)
- `getAllProgress(userId)` - Get all progress for user (sync)
- `resetModuleProgress(userId, moduleId)` - Reset module (e.g., retake)

**Storage Strategy:**
- **Primary**: localStorage (`eduhub_progress_<userId>`)
- **Secondary**: Firestore (synced when online)
- **Merging**: Union of completed lessons, latest quiz scores

### 2. **syncQueue.js** (`/src/services/syncQueue.js`)

Manages an offline queue of pending sync items with exponential backoff retry logic.

**Key Functions:**

- `enqueue(userId, { type, payload })` - Add item to queue
- `peekQueue(userId)` - Get queue snapshot (read-only)
- `queueSize(userId)` - Get pending item count
- `flushQueue(userId)` - Send all queued items to server
- `initSyncQueue(userId)` - Initialize with online event listener
- `teardownSyncQueue()` - Cleanup on logout
- `clearQueue(userId)` - Empty queue

**Queue Item Types:**
```javascript
{
  id: "1716000000000-abc123",      // unique dedup ID
  type: "progress" | "quiz_result" | "lesson_event",
  payload: { ... },
  enqueuedAt: "2024-05-19T...",
  retries: 0
}
```

**Retry Strategy:**
- Max retries: 5
- Backoff: 1s → 2s → 4s → 8s → 16s
- Failed items dropped after max retries (logged as warning)

### 3. **api/sync.js** (`/api/sync.js`)

Express router handling sync operations on the backend.

**POST /api/sync**
- Accepts single item or batch array
- Validates item types and structure
- Writes to Firestore using batch operations
- Returns: `{ ok, synced, failed, serverTs }`

**GET /api/sync/:userId**
- Returns latest server-side progress snapshot
- Useful for conflict resolution on reconnection

**Supported Item Types:**
1. `progress` - Full module progress update
2. `quiz_result` - Individual quiz score
3. `lesson_event` - Individual lesson completion

### 4. **useProgress Hook** (`/src/hooks/useProgress.js`)

React hook providing progress tracking to any component.

```javascript
const { progress, loading, error, markDone, recordScore, reset } = useProgress(userId, moduleId, totalLessons);

// progress = { completedLessons, quizScores, percentComplete, ... }
// markDone(lessonId) - async function
// recordScore(quizId, score, total) - async function
// reset() - async function to reset module
```

### 5. **useOnlineStatus Hook** (`/src/hooks/useOnlineStatus.js`)

React hook tracking browser online/offline status in real time.

```javascript
const { isOnline, pendingItems } = useOnlineStatus(userId);

// isOnline = true/false
// pendingItems = number of queued sync items
// Auto-flushes when coming online
```

### 6. **useOfflineSimulation Hook** (`/src/hooks/useOfflineSimulation.js`)

Development-only hook to simulate offline/online transitions for testing.

```javascript
const { simulateOffline, simulateOnline, reset, isSimulated } = useOfflineSimulation();

// simulateOffline() - simulate network loss
// simulateOnline(userId) - restore connection + auto-flush
// reset() - stop simulation
```

### 7. **OfflineTransitionTest Component** (`/src/components/OfflineTransitionTest.jsx`)

Dev-only UI component for testing offline-first behavior:
- Simulate network transitions
- View pending queue items
- Manual flush trigger
- Retry count tracking

## Integration Steps

### Step 1: Update AuthContext (Already Done ✓)

The AuthContext now automatically:
1. Calls `initSyncQueue(uid)` when user logs in
2. Calls `teardownSyncQueue()` when user logs out
3. Registers online event listeners globally

### Step 2: Use Progress Hooks in Components

**Example - Dashboard:**
```javascript
import { useProgress } from '../hooks/useProgress';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function Dashboard() {
  const { user } = useAuth();
  const { progress, markDone, loading } = useProgress(user?.uid, moduleId, 10);
  const { isOnline, pendingItems } = useOnlineStatus(user?.uid);

  return (
    <>
      {!isOnline && <OfflineIndicator pendingItems={pendingItems} />}
      
      {progress.completedLessons.map(lesson => (
        <LessonItem key={lesson} {...} />
      ))}
      
      <button onClick={() => markDone('lesson-1')}>
        Mark Lesson 1 Complete
      </button>
    </>
  );
}
```

### Step 3: Add Test Component in App

**Development only:**
```javascript
import OfflineTransitionTest from './components/OfflineTransitionTest';

function App() {
  const { user } = useAuth();
  
  return (
    <>
      <Router>
        {/* ... */}
      </Router>
      
      {/* Dev-only testing UI */}
      {process.env.NODE_ENV === 'development' && user?.uid && (
        <OfflineTransitionTest userId={user.uid} />
      )}
    </>
  );
}
```

## Testing Offline Behavior

### Manual Testing Steps

1. **Go to Dashboard/Modules**
2. **Click the "Offline Test" button** (bottom right corner)
3. **Click "Go Offline"**
4. **Perform actions:**
   - Complete a lesson
   - Submit a quiz
   - Check that items appear in the queue
5. **Click "Come Online"**
6. **Verify:**
   - Queue items disappear
   - Progress is reflected in UI
   - Console shows sync logs

### Running Unit Tests

```bash
cd eduhub
npm test                  # Run all tests
npm test sync.test.js     # Run sync tests only
npm test -- --coverage    # With coverage report
```

**Test Coverage:**
- ✓ Queue operations (enqueue, peek, clear, flush)
- ✓ Progress tracking (mark complete, record scores)
- ✓ Offline queuing behavior
- ✓ Local storage persistence
- ✓ Progress merging logic
- ✓ Retry mechanism

## Offline-First Data Flow

### Scenario 1: Online → Complete Lesson

```
User clicks "Complete" 
    ↓
markLessonComplete() called
    ↓
✓ Update localStorage (instant)
✓ Update React state
    ↓
writeRemote() → Firestore
    ↓
Success: Done
```

### Scenario 2: Offline → Complete Lesson

```
User clicks "Complete" (offline)
    ↓
markLessonComplete() called
    ↓
✓ Update localStorage (instant)
✓ Update React state
    ↓
writeRemote() → Firestore (fails)
    ↓
enqueue() → Add to syncQueue in localStorage
    ↓
Queued for later
```

### Scenario 3: Offline → Go Online → Auto-sync

```
Browser `online` event fires
    ↓
useOnlineStatus detects change
    ↓
flushQueue(userId) called automatically
    ↓
POST /api/sync with queued items
    ↓
Server Firestore batch write
    ↓
✓ Success → Queue cleared
✗ Failure → Retry (exponential backoff)
```

## API Endpoint Reference

### POST /api/sync

**Request:**
```javascript
{
  userId: "uid123",
  id: "1716000000000-abc123",
  type: "progress",
  payload: {
    "mod1": {
      completedLessons: ["les1", "les2"],
      quizScores: { "quiz1": { score: 85, total: 100, ... } },
      percentComplete: 40
    }
  }
}
```

**Response:**
```javascript
{
  ok: true,
  synced: ["1716000000000-abc123"],
  failed: [],
  serverTs: "2024-05-19T10:30:00Z"
}
```

### GET /api/sync/:userId

**Response:**
```javascript
{
  userId: "uid123",
  modules: {
    "mod1": {
      completedLessons: ["les1", "les2"],
      quizScores: { ... },
      lastVisited: "2024-05-19T...",
      updatedAt: firebaseTimestamp
    }
  }
}
```

## LocalStorage Schema

### Progress Data
```
Key: eduhub_progress_<userId>
Value: {
  "mod1": {
    completedLessons: ["les1", "les2"],
    quizScores: { "quiz1": { score, total, percentage, passed, passedAt } },
    lastVisited: "ISO string",
    percentComplete: number
  },
  "mod2": { ... }
}
```

### Sync Queue
```
Key: eduhub_syncqueue_<userId>
Value: [
  {
    id: "unique-id",
    type: "progress" | "quiz_result" | "lesson_event",
    payload: { ... },
    enqueuedAt: "ISO string",
    retries: number
  },
  ...
]
```

## Debugging

### Enable Verbose Logging

Set in console:
```javascript
localStorage.setItem('DEBUG_EDUHUB_SYNC', 'true');
```

Logs will appear for:
- Queue operations
- Sync attempts
- Online/offline transitions
- Merge conflicts

### Check Current State

```javascript
// In browser console:
import { peekQueue, queueSize } from './services/syncQueue';
import { getAllProgress } from './services/progressTracker';

const userId = currentUser.uid;

console.log('Progress:', getAllProgress(userId));
console.log('Queue:', peekQueue(userId));
console.log('Pending:', queueSize(userId));
```

## Known Limitations & Future Improvements

1. **No conflict resolution UI** - Automatic merge favors latest/most data
2. **No offline indicators per-action** - Global online/offline status only
3. **Limited retry strategies** - Fixed exponential backoff, no custom delays
4. **No sync history** - No audit trail of what was synced when
5. **No bandwidth optimization** - Sends all data, no delta sync

## File Structure Summary

```
src/
├── hooks/
│   ├── useProgress.js              # Progress tracking hook
│   ├── useOnlineStatus.js          # Online/offline detection
│   └── useOfflineSimulation.js     # Dev testing tool
├── services/
│   ├── progressTracker.js          # Core progress logic
│   └── syncQueue.js                # Offline queue management
├── components/
│   ├── OfflineTransitionTest.jsx   # Dev test UI
│   └── OfflineTransitionTest.module.css
├── context/
│   └── AuthContext.jsx             # Updated with sync init
└── tests/
    └── sync.test.js                # Comprehensive tests

api/
└── sync.js                          # Backend sync endpoint

server.js                            # Already mounts /api/sync
```

## Checklist for Development

- [ ] User can mark lessons complete offline
- [ ] User can submit quizzes offline
- [ ] Progress is saved to localStorage instantly
- [ ] Queue items show in dev panel
- [ ] "Go Online" triggers auto-flush
- [ ] Manual flush button works
- [ ] Firestore updates after sync
- [ ] Multiple devices sync correctly
- [ ] No console errors
- [ ] Tests pass: `npm test`

