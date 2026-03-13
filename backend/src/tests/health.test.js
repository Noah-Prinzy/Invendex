import request from 'supertest';
import app from '../app.js';

describe('Health check', () => {
  it('should respond that API is running', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return liveness payload', async () => {
    const res = await request(app).get('/health/live');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });

  it('should return 404 when metrics endpoint is disabled', async () => {
    const previousValue = process.env.METRICS_ENABLED;
    process.env.METRICS_ENABLED = 'false';

    const res = await request(app).get('/metrics');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);

    process.env.METRICS_ENABLED = previousValue;
  });

  it('should return prometheus payload when metrics endpoint is enabled', async () => {
    const previousValue = process.env.METRICS_ENABLED;
    process.env.METRICS_ENABLED = 'true';

    const res = await request(app).get('/metrics');

    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'] || '')).toContain('text/plain');
    expect(res.text).toContain('invendex_http_requests_total');

    process.env.METRICS_ENABLED = previousValue;
  });
});
