import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

type CleanupTask = () => void;

export function useSafeNavigation(): {
  onRouteChange: (handler: (previousPath: string, newPath: string) => void) => void;
  registerCleanup: (task: CleanupTask) => void;
  abortController: React.MutableRefObject<AbortController>;
} {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const routeHandlers = useRef<Array<(prev: string, next: string) => void>>([]);
  const cleanupTasks = useRef<Array<CleanupTask>>([]);
  const abortRef = useRef(new AbortController());

  useEffect(() => {
    const prev = prevPathRef.current;
    const next = location.pathname;

    if (prev !== next) {
      // Abort all pending requests
      abortRef.current.abort();
      abortRef.current = new AbortController();

      // Run cleanup tasks
      for (const task of cleanupTasks.current) {
        try { task(); } catch { /* ignore */ }
      }
      cleanupTasks.current = [];

      // Notify route change handlers
      for (const handler of routeHandlers.current) {
        try { handler(prev, next); } catch { /* ignore */ }
      }

      prevPathRef.current = next;
    }
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      abortRef.current.abort();
      for (const task of cleanupTasks.current) {
        try { task(); } catch { /* ignore */ }
      }
      cleanupTasks.current = [];
    };
  }, []);

  return {
    onRouteChange: (handler) => {
      routeHandlers.current.push(handler);
    },
    registerCleanup: (task) => {
      cleanupTasks.current.push(task);
    },
    abortController: abortRef,
  };
}
