# API Contracts

- **Base URL**: Provided by environment (e.g., `VITE_API_URL`). Use a centralized HTTP client with interceptors for auth and error handling.
- **Auth**: Use bearer tokens in `Authorization` header where required. Store tokens securely (never in source control).
- **Common Response**:
  ```json
  { "status": "success|error", "code": "string", "message": "string", "data": {} }
  ```
- **Errors**: Services throw `ApiError { statusCode, code, message, details? }`.
- **Versioning**: Keep routes under `/api/v1/*`.
- **Validation**: Validate payloads server-side; return 4xx on bad input with `code` and `message`.
- **Pagination**: Use `page`, `pageSize`, return `total`.
