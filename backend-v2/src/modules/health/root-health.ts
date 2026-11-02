import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { register } from 'prom-client';

/**
 * Registers the legacy root-level ops endpoints (/health, /health/live,
 * /health/ready, /metrics) directly on the HTTP adapter, outside the
 * /api/v1 global prefix.
 */
export function registerRootHealthEndpoints(app: INestApplication): void {
  const adapter = app.getHttpAdapter();
  const connection = app.get<Connection>(getConnectionToken());

  const readiness = () => connection.readyState === 1;

  adapter.get(
    '/health',
    (
      _req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } }
    ) => {
      const ready = readiness();
      res.status(ready ? 200 : 503).json({
        status: ready ? 'ok' : 'degraded',
        ready
      });
    }
  );

  adapter.get(
    '/health/live',
    (_req: unknown, res: { json: (body: unknown) => void }) => {
      res.json({ status: 'ok' });
    }
  );

  adapter.get(
    '/health/ready',
    (
      _req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } }
    ) => {
      const ready = readiness();
      res
        .status(ready ? 200 : 503)
        .json({ status: ready ? 'ok' : 'unavailable', ready });
    }
  );

  adapter.get(
    '/metrics',
    async (
      _req: unknown,
      res: { set: (k: string, v: string) => void; send: (body: string) => void }
    ) => {
      res.set('content-type', register.contentType);
      res.send(await register.metrics());
    }
  );
}
