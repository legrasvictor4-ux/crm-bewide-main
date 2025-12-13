import request from 'supertest';
import { describe, it, beforeAll, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

// These tests expect SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set for the running server

const SERVER_PATH = path.resolve(__dirname, '../../api-server.mjs');
const API_BASE = 'http://localhost:3001';

let serverProcess: any;

beforeAll(async () => {
  serverProcess = spawn('node', [SERVER_PATH], {
    env: { ...process.env, PORT: '3001' },
    stdio: 'inherit',
  });

  // Simple wait for server to boot
  await new Promise((resolve) => setTimeout(resolve, 1500));
});

describe('API /api/clients', () => {
  it('health check', async () => {
    const res = await request(API_BASE).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('create and fetch client', async () => {
    const payload = {
      name: 'Test Client',
      phone_number: '+33123456789',
      email: 'test@example.com',
      description: 'Notes',
    };

    const created = await request(API_BASE).post('/api/clients').send(payload);
    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    const id = created.body.client.id;

    const list = await request(API_BASE).get('/api/clients?limit=10');
    expect(list.status).toBe(200);
    expect(list.body.clients.some((c: any) => c.id === id)).toBe(true);
  });
});
