import request from 'supertest';
import app from '../app.js';

describe('Health check', () => {
  it('should respond that API is running', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
