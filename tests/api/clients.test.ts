import request from 'supertest';
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

const app = express();
app.use(express.json());

const clients: any[] = [];

app.get('/api/health', (_, res) => res.status(200).json({ success: true }));
app.post('/api/clients', (req, res) => {
  const id = String(Date.now());
  const client = { id, ...req.body };
  clients.push(client);
  res.status(201).json({ success: true, client });
});
app.get('/api/clients', (_req, res) => res.status(200).json({ clients }));

describe('API /api/clients', () => {
  it('health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('create and fetch client', async () => {
    const payload = {
      name: 'Test Client',
      company: 'Test Client',
      phone_number: '+33123456789',
      email: 'test@example.com',
      description: 'Notes',
    };

    const created = await request(app).post('/api/clients').send(payload);
    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);
    const id = created.body.client.id;

    const list = await request(app).get('/api/clients?limit=10');
    expect(list.status).toBe(200);
    expect(list.body.clients.some((c: any) => c.id === id)).toBe(true);
  });
});
