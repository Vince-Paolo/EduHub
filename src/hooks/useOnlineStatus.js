/**
 * useOnlineStatus.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that tracks the browser's online/offline status in real time.
 *
 * Usage:
 *   const { isOnline, pendingItems } = useOnlineStatus(userId);
 *   if (!isOnline) { <OfflineIndicator /> }
 */

import { useState, useEffect } from 'react';
import { queueSize, flushQueue } from '../services/syncQueue';

export function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingItems, setPendingItems] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      console.info('[useOnlineStatus] Back online');
      setIsOnline(true);
      
      // Attempt to flush immediately
      if (userId) {
        flushQueue(userId).then((result) => {
          console.info(`[useOnlineStatus] Flush result:`, result);
        });
      }
    };

    const handleOffline = () => {
      console.info('[useOnlineStatus] Gone offline');
      setIsOnline(false);
    };

    // Track pending items whenever online status changes or userId changes
    const updatePendingCount = () => {
      if (userId) {
        setPendingItems(queueSize(userId));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count on mount and when userId changes
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  return { isOnline, pendingItems };
}
