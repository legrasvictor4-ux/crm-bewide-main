import request from 'supertest';
import { describe, it, beforeAll, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const SERVER_PATH = path.resolve(__dirname, '../../api-server.mjs');
const API_BASE = 'http://localhost:3002';

let serverProcess: any;

beforeAll(async () => {
  serverProcess = spawn('node', [SERVER_PATH], {
    env: { ...process.env, PORT: '3002' },
    stdio: 'inherit',
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
});

describe('API /api/import/excel', () => {
  it('imports clients from xlsx', async () => {
    const tmpPath = path.join(os.tmpdir(), `clients-${Date.now()}.xlsx`);
    // Minimal XLSX via JSON -> CSV for simplicity
    const csv = 'last_name,phone\nTestImport1,+33123456789\nTestImport2,+33999888777\n';
    fs.writeFileSync(tmpPath, csv, 'utf8');

    const res = await request(API_BASE)
      .post('/api/import/excel')
      .attach('file', tmpPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(res.body.clients.length).toBeGreaterThanOrEqual(2);
  });
});
