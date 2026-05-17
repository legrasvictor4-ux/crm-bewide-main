import { useRef, useEffect, useState, useCallback } from 'react';

type PerformanceMark = {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
};

const marks: PerformanceMark[] = [];
  const isMonitoring = false;

export function startPerformanceMark(name: string): void {
  marks.push({ name, startTime: performance.now() });
}

export function endPerformanceMark(name: string): number | null {
  const mark = marks.find((m) => m.name === name && !m.endTime);
  if (!mark) return null;
  mark.endTime = performance.now();
  mark.duration = mark.endTime - mark.startTime;
  return mark.duration;
}

export function getPerformanceReport(): PerformanceMark[] {
  return marks.filter((m) => m.duration !== undefined);
}

export function clearPerformanceMarks(): void {
  marks.length = 0;
}

export function useRenderTiming(componentName: string): void {
  const mountTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - mountTime.current;
    if (duration > 16) {
      console.warn(`[PERF] Slow render: ${componentName} took ${duration.toFixed(1)}ms`);
    }
  });
}

export function useRenderCount(componentName: string): number {
  const countRef = useRef(0);
  countRef.current++;

  useEffect(() => {
    if (countRef.current > 5) {
      console.warn(`[PERF] Excessive re-renders: ${componentName} rendered ${countRef.current} times`);
    }
  });

  return countRef.current;
}

export function estimateMemoryUsage(): Record<string, number> {
  const usage: Record<string, number> = {};

  if ((performance as any).memory) {
    const mem = (performance as any).memory;
    usage.jsHeapSizeLimit = mem.jsHeapSizeLimit;
    usage.totalJSHeapSize = mem.totalJSHeapSize;
    usage.usedJSHeapSize = mem.usedJSHeapSize;
  }

  usage.activeTimers = (window as any).__activeTimers?.size ?? 0;
  usage.eventListeners = (window as any).__eventListeners?.size ?? 0;

  return usage;
}
