import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkQuality = 'offline' | 'poor' | 'fair' | 'good';

export type NetworkStatus = {
  online: boolean;
  quality: NetworkQuality;
  lastChanged: number;
};

function detectQuality(): NetworkQuality {
  if (!navigator.onLine) return 'offline';

  const conn = (navigator as any).connection;
  if (!conn) return 'good';

  if (conn.downlink === 0) return 'offline';
  if (conn.downlink < 0.5) return 'poor';
  if (conn.downlink < 1.5) return 'fair';
  return 'good';
}

function getInitialStatus(): NetworkStatus {
  return {
    online: navigator.onLine,
    quality: detectQuality(),
    lastChanged: Date.now(),
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(getInitialStatus);

  const updateStatus = useCallback(() => {
    setStatus({
      online: navigator.onLine,
      quality: detectQuality(),
      lastChanged: Date.now(),
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', updateStatus);
    }

    const intervalId = setInterval(updateStatus, 30000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (conn) conn.removeEventListener('change', updateStatus);
      clearInterval(intervalId);
    };
  }, [updateStatus]);

  return status;
}
