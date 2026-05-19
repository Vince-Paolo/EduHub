/**
 * OfflineTransitionTest.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Component to test and visualize offline/online transitions.
 *
 * Features:
 *   - Simulates network connectivity changes
 *   - Shows pending sync items
 *   - Triggers manual sync operations
 *   - Dev-only component
 *
 * Usage:
 *   import OfflineTransitionTest from './OfflineTransitionTest';
 *   {process.env.NODE_ENV === 'development' && <OfflineTransitionTest userId={user.uid} />}
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useOfflineSimulation } from '../hooks/useOfflineSimulation';
import { peekQueue, flushQueue } from '../services/syncQueue';
import styles from './OfflineTransitionTest.module.css';

export default function OfflineTransitionTest({ userId }) {
  const { user } = useAuth();
  const { isOnline, pendingItems } = useOnlineStatus(userId);
  const { simulateOffline, simulateOnline, reset, isSimulated } = useOfflineSimulation();
  const [queueItems, setQueueItems] = useState([]);
  const [flushStatus, setFlushStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSimulateOffline = () => {
    simulateOffline();
    updateQueueDisplay();
  };

  const handleSimulateOnline = async () => {
    simulateOnline(userId);
    await new Promise((r) => setTimeout(r, 200));
    updateQueueDisplay();
  };

  const handleReset = () => {
    reset();
    updateQueueDisplay();
  };

  const updateQueueDisplay = () => {
    if (userId) {
      const queue = peekQueue(userId);
      setQueueItems(queue);
    }
  };

  const handleManualFlush = async () => {
    if (!userId) return;

    setFlushStatus('Flushing...');
    try {
      const result = await flushQueue(userId);
      setFlushStatus(`✓ Flushed ${result.flushed}, Failed ${result.failed}`);
      updateQueueDisplay();
      setTimeout(() => setFlushStatus(null), 3000);
    } catch (err) {
      setFlushStatus(`✗ Error: ${err.message}`);
    }
  };

  if (!userId || !user) return null;

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Toggle offline testing panel"
      >
        {isExpanded ? '▼' : '▶'} Offline Test
      </button>

      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h4>Offline-First Testing</h4>
            <span className={styles.status}>
              {isOnline ? (
                <span className={styles.online}>🟢 Online</span>
              ) : (
                <span className={styles.offline}>🔴 Offline</span>
              )}
            </span>
          </div>

          <div className={styles.section}>
            <h5>Network Simulation</h5>
            <div className={styles.buttonGroup}>
              <button
                className={styles.button}
                onClick={handleSimulateOffline}
                disabled={!isOnline && isSimulated}
              >
                Go Offline
              </button>
              <button
                className={styles.button}
                onClick={handleSimulateOnline}
                disabled={isOnline && isSimulated}
              >
                Come Online
              </button>
              <button className={styles.buttonReset} onClick={handleReset}>
                Reset
              </button>
            </div>
            {isSimulated && (
              <p className={styles.info}>📝 Network state is being simulated (dev only)</p>
            )}
          </div>

          <div className={styles.section}>
            <h5>Queue Status</h5>
            <div className={styles.stat}>
              <span>Pending Items:</span>
              <strong>{queueItems.length}</strong>
            </div>

            {queueItems.length > 0 && (
              <>
                <button className={styles.buttonPrimary} onClick={handleManualFlush}>
                  Manual Flush
                </button>
                {flushStatus && (
                  <div className={styles.flushStatus}>{flushStatus}</div>
                )}
                <div className={styles.queueList}>
                  {queueItems.map((item, idx) => (
                    <div key={item.id} className={styles.queueItem}>
                      <span className={styles.index}>{idx + 1}</span>
                      <div className={styles.itemDetails}>
                        <strong>{item.type}</strong>
                        <small>{item.id}</small>
                        <small className={styles.retries}>
                          Retries: {item.retries}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={styles.section}>
            <h5>Test Workflow</h5>
            <ol className={styles.instructions}>
              <li>Click "Go Offline" to simulate network loss</li>
              <li>Perform actions in the app (complete lessons, take quizzes)</li>
              <li>Click "Come Online" to restore connection</li>
              <li>Check that pending items are automatically synced</li>
              <li>Use "Manual Flush" to force sync without waiting</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
