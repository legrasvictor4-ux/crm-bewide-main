import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const API_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 5000;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 with healthy status', async () => {
      const response = await makeRequest('GET', '/api/health');
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.status, 'healthy');
      assert.ok(response.body.timestamp);
      assert.ok(typeof response.body.uptime === 'number');
    });
  });

  describe('POST /api/import/prospection', () => {
    it('should return 200 with valid prospects', async () => {
      const validData = {
        prospects: [
          { name: 'Test Prospect 1', email: 'test1@example.com' },
          { name: 'Test Prospect 2', phone: '+33123456789' },
        ],
      };

      const response = await makeRequest('POST', '/api/import/prospection', validData);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.count, 2);
      assert.ok(Array.isArray(response.body.prospects));
      assert.strictEqual(response.body.prospects.length, 2);
      assert.ok(response.body.prospects[0].id);
      assert.ok(response.body.prospects[0].importedAt);
      assert.strictEqual(response.body.prospects[0].status, 'imported');
    });

    it('should return 400 when prospects field is missing', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {});
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.error.includes('prospects'));
    });

    it('should return 400 when prospects is not an array', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {
        prospects: 'not an array',
      });
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.error.includes('array'));
    });

    it('should return 400 when prospects array is empty', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {
        prospects: [],
      });
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.error.includes('empty'));
    });

    it('should return 400 when prospect name is missing', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {
        prospects: [
          { email: 'test@example.com' },
        ],
      });
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.validationErrors);
      assert.ok(Array.isArray(response.body.validationErrors));
      assert.strictEqual(response.body.validCount, 0);
      assert.strictEqual(response.body.invalidCount, 1);
    });

    it('should return 400 when prospect name is empty string', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {
        prospects: [
          { name: '' },
        ],
      });
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.validationErrors);
    });

    it('should return 400 when prospect name is only whitespace', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {
        prospects: [
          { name: '   ' },
        ],
      });
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.validationErrors);
    });

    it('should handle mixed valid and invalid prospects', async () => {
      const response = await makeRequest('POST', '/api/import/prospection', {
        prospects: [
          { name: 'Valid Prospect' },
          { email: 'invalid@example.com' }, // missing name
          { name: 'Another Valid Prospect' },
        ],
      });
      
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.body.success, false);
      assert.strictEqual(response.body.validCount, 2);
      assert.strictEqual(response.body.invalidCount, 1);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await makeRequest('GET', '/api/unknown');
      
      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.error.includes('not found'));
    });
  });
});


