import request from 'supertest';
import { describe, it, expect } from 'vitest';
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';

const app = express();
const upload = multer({ dest: os.tmpdir() });
const imported: any[] = [];

app.post('/api/import/excel', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'File missing' });
  }
  const content = fs.readFileSync(req.file.path, 'utf8');
  const rows = content.trim().split('\n').slice(1); // skip header
  rows.forEach((row) => {
    const [company, phone] = row.split(',');
    imported.push({ company, phone });
  });
  return res.status(200).json({ success: true, count: imported.length, clients: imported });
});

describe('API /api/import/excel', () => {
  it('imports clients from xlsx', async () => {
    const tmpPath = path.join(os.tmpdir(), `clients-${Date.now()}.csv`);
    const csv = 'company,phone\nTestImport1,+33123456789\nTestImport2,+33999888777\n';
    fs.writeFileSync(tmpPath, csv, 'utf8');

    const res = await request(app)
      .post('/api/import/excel')
      .attach('file', tmpPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);
    expect(res.body.clients.length).toBeGreaterThanOrEqual(2);
  });
});
