import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
  replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
  replaysOnErrorSampleRate: 1.0,
});
