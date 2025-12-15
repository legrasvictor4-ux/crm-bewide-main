import request from 'supertest';
import { describe, it, expect } from 'vitest';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/clients', (req, res) => {
  const { name, phone_number, email, description, company } = req.body;
  const validationErrors = [];
  if (!name) validationErrors.push('name is required');
  if (!phone_number) validationErrors.push('phone_number is required');
  if (!company && !name) validationErrors.push('company is required');

  if (validationErrors.length > 0) {
    return res.status(400).json({ success: false, validationErrors });
  }

  return res.status(201).json({
    success: true,
    client: {
      id: '1',
      name,
      last_name: name.split(' ').pop(),
      phone_number,
      email,
      description,
      lead_score: 50,
    },
  });
});

describe('API /api/clients', () => {
  it('creates a client with required fields', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({
        name: 'Jean Dupont',
        company: 'Jean Dupont',
        phone_number: '+33612345678',
        email: 'jd@example.com',
        description: 'Test client',
      })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.client).toBeDefined();
    expect(res.body.client.last_name).toBe('Dupont');
    expect(res.body.client.lead_score).toBeGreaterThanOrEqual(0);
  });

  it('returns validation errors when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ phone_number: '123' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.validationErrors).toBeInstanceOf(Array);
    expect(res.body.validationErrors.join(' ')).toContain('name');
  });
});
