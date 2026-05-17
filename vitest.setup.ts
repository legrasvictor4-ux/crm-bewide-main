import '@testing-library/jest-dom';
import { afterEach, beforeAll, beforeEach, expect } from 'vitest';
import logger from '@/lib/logger';
import { reportError, installGlobalErrorHandlers } from '@/lib/globalErrorHandler';

// ─── JSDOM polyfills ──────────────────────────────────────────────────────────
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ─── Global error handler — en mode tests on classe plutôt que crasher ──────────
beforeAll(() => {
  installGlobalErrorHandlers({ source: "test" });
});

// ─── Log buffer reset entre chaque test ───────────────────────────────────────
beforeEach(() => {
  logger.clearBuffer();
});

// ─── Debug output en cas d'échec de test ─────────────────────────────────────
afterEach(() => {
  const failures = (globalThis as any).__vitest_errors__ ?? [];
  if (failures.length > 0) {
    const buffer = logger.getBuffer();
    const errors = buffer.filter(e => e.level === "ERROR" || e.level === "CRITICAL");
    if (errors.length > 0) {
      console.group("🔴 Test failed — errors captured by global handler");
      for (const e of errors) {
        console.error(`[${e.domain}][${e.level}][${e.component}] ${e.message}`);
      }
      console.groupEnd();
    }
  }
});

// ─── vitest expect extension — snapshot des erreurs ───────────────────────────
declare module 'vitest' {
  interface Assertion {
    toHaveNoErrors(): this;
  }
}

expect.extend({
  toHaveNoErrors(received) {
    const buffer = (logger as any).getBuffer?.();
    if (!buffer || buffer.length === 0) {
      return { pass: true, message: () => "No errors in log buffer" };
    }
    const errors = (buffer as any[]).filter(
      (e) => e.level === "ERROR" || e.level === "CRITICAL"
    );
    if (errors.length === 0) {
      return { pass: true, message: () => "No errors in log buffer" };
    }
    const details = errors.map((e) => `[${e.domain}][${e.level}][${e.component}] ${e.message}`).join("\n  ");
    return {
      pass: false,
      message: () => `Expected no errors but found ${errors.length}:\n  ${details}`,
    };
  },
});
