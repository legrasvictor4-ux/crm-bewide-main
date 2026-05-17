import { vi, afterEach, beforeEach } from 'vitest';

const IGNORED_CONSOLE_PATTERNS = [
  /^\[LOGGER\]/,
  /^\[CLIENT_SANITIZE_REJECT\]/,
  /^\[DEV_GUARD\]/,
  /^\[VOICE_TRACE\]/,
  /^\[SCHEMA_DRIFT\]/,
];

type ConsoleMethod = 'log' | 'warn' | 'error';
const CONSOLE_METHODS: ConsoleMethod[] = ['log', 'warn', 'error'];

const consoleErrors: Array<{ method: ConsoleMethod; args: unknown[] }> = [];

export function setupConsoleGuard(): void {
  const originals = {} as Record<ConsoleMethod, (...args: unknown[]) => void>;

  beforeEach(() => {
    consoleErrors.length = 0;

    for (const method of CONSOLE_METHODS) {
      originals[method] = console[method].bind(console);
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        const msg = args.join(' ');
        if (IGNORED_CONSOLE_PATTERNS.some((p) => p.test(msg))) {
          originals[method](...args);
          return;
        }
        consoleErrors.push({ method, args });
        originals[method](...args);
      });
    }
  });

  afterEach(() => {
    for (const method of CONSOLE_METHODS) {
      (console[method] as unknown as ReturnType<typeof vi.spyOn>)?.mockRestore?.();
    }

    const errors = consoleErrors.filter((e) => e.method === 'error');
    const warnings = consoleErrors.filter((e) => e.method === 'warn');

    if (errors.length > 0) {
      const detail = errors.map((e) => e.args.join(' ')).join('\n  ');
      throw new Error(`[CONSOLE_GUARD] ${errors.length} console.error(s) detected:\n  ${detail}`);
    }

    if (warnings.length > 0) {
      const detail = warnings.map((w) => w.args.join(' ')).join('\n  ');
      throw new Error(`[CONSOLE_GUARD] ${warnings.length} console.warn(s) detected (use logger instead):\n  ${detail}`);
    }
  });
}
