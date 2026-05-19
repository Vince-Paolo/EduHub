/**
 * useOfflineSimulation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Development hook to simulate offline/online transitions for testing.
 *
 * Usage (development only):
 *   const { simulateOffline, simulateOnline, isSimulated } = useOfflineSimulation();
 *   <button onClick={simulateOffline}>Go Offline</button>
 */

import { useState, useEffect } from 'react';
import { flushQueue } from '../services/syncQueue';

let simulatedOnlineStatus = navigator.onLine;

export function useOfflineSimulation() {
  const [isSimulated, setIsSimulated] = useState(false);
  const [forceStatus, setForceStatus] = useState(null);

  // Override navigator.onLine getter
  useEffect(() => {
    if (!isSimulated) return;

    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => forceStatus ?? simulatedOnlineStatus,
    });

    return () => {
      if (descriptor) {
        Object.defineProperty(navigator, 'onLine', descriptor);
      }
    };
  }, [isSimulated, forceStatus]);

  const simulateOffline = () => {
    console.info('[useOfflineSimulation] Simulating offline state');
    setForceStatus(false);
    setIsSimulated(true);
    
    // Dispatch offline event
    window.dispatchEvent(new Event('offline'));
  };

  const simulateOnline = (userId) => {
    console.info('[useOfflineSimulation] Simulating online state');
    setForceStatus(true);
    setIsSimulated(true);

    // Dispatch online event
    window.dispatchEvent(new Event('online'));

    // Auto-flush queue when coming back online
    if (userId) {
      setTimeout(() => {
        flushQueue(userId).then((result) => {
          console.info('[useOfflineSimulation] Auto-flush result:', result);
        });
      }, 100);
    }
  };

  const reset = () => {
    console.info('[useOfflineSimulation] Resetting simulation');
    setIsSimulated(false);
    setForceStatus(null);
  };

  return { simulateOffline, simulateOnline, reset, isSimulated, forceStatus };
}
