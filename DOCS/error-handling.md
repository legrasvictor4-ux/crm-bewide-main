# Error Handling & Logging

- **Frontend**: Wrap pages/sections with error boundaries. Show toasts for recoverable issues and inline error panels for blocking issues. Provide retry actions. Log errors with context (user, route, query key).
- **Backend**: Use a centralized error middleware returning `{ status, code, message, details? }`. Log with timestamp, level, request id, user id when available. Add `/health` endpoint returning uptime/build info.
- **Levels**: `info` for normal ops, `warn` for unexpected but recoverable, `error` for failures, `debug` for diagnostics.
- **Observability**: Capture request latency and error rates; add minimal console logger now, pluggable for external sinks later.
