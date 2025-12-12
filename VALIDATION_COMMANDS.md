# Validation Commands

## Start Development Server
```bash
npm run dev
```
This starts both frontend (Vite on port 8080) and backend (Express on port 3000) concurrently.

## Test API Endpoints

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```
Expected: `{"success":true,"status":"healthy","timestamp":"...","uptime":...}`

### 2. Import Prospection (Valid)
```bash
curl -X POST http://localhost:3000/api/import/prospection \
  -H "Content-Type: application/json" \
  -d '{"prospects":[{"name":"Test Prospect","email":"test@example.com"}]}'
```
Expected: `{"success":true,"message":"Successfully imported 1 prospect(s)","count":1,"prospects":[...]}`

### 3. Import Prospection (Invalid - Missing Field)
```bash
curl -X POST http://localhost:3000/api/import/prospection \
  -H "Content-Type: application/json" \
  -d '{}'
```
Expected: `{"success":false,"error":"Missing required field: prospects"}`

### 4. Import Prospection (Invalid - Not Array)
```bash
curl -X POST http://localhost:3000/api/import/prospection \
  -H "Content-Type: application/json" \
  -d '{"prospects":"not an array"}'
```
Expected: `{"success":false,"error":"prospects must be an array"}`

### 5. Import Prospection (Invalid - Missing Name)
```bash
curl -X POST http://localhost:3000/api/import/prospection \
  -H "Content-Type: application/json" \
  -d '{"prospects":[{"email":"test@example.com"}]}'
```
Expected: `{"success":false,"error":"Validation failed","validationErrors":[...]}`

## Run Integration Tests
```bash
# First, ensure backend is running
npm run dev:backend

# In another terminal, run tests
npm run test:api
```

## Test via Frontend Proxy
```bash
# With dev server running, test through Vite proxy
curl http://localhost:8080/api/health
curl -X POST http://localhost:8080/api/import/prospection \
  -H "Content-Type: application/json" \
  -d '{"prospects":[{"name":"Test"}]}'
```

## Verify Port Configuration
```bash
# Backend uses PORT env var or defaults to 3000
PORT=4000 npm run dev:backend
# Then test: curl http://localhost:4000/api/health
```


