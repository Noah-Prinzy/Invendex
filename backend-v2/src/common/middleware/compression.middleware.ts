import { brotliCompress, gzip } from 'node:zlib';
import type { NextFunction, Request, Response } from 'express';

const COMPRESSIBLE_TYPE =
  /json|text|javascript|xml|svg|html|css|urlencoded|csv/i;
const DEFAULT_THRESHOLD_BYTES = 1024;

/**
 * Response compression: Brotli when the client accepts `br`, gzip otherwise.
 * Replaces the legacy size-perf stack; streaming responses are not buffered.
 */
export function compressionMiddleware(
  options: { threshold?: number } = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD_BYTES;

  return (req: Request, res: Response, next: NextFunction): void => {
    const accept = String(req.headers['accept-encoding'] ?? '');
    const encodings = new Set(
      accept
        .split(',')
        .map((part) => part.split(';')[0].trim().toLowerCase())
        .filter(Boolean)
    );
    const algorithm = encodings.has('br')
      ? 'br'
      : encodings.has('gzip')
        ? 'gzip'
        : null;
    if (!algorithm) {
      next();
      return;
    }

    if (typeof res.append === 'function') {
      res.append('Vary', 'Accept-Encoding');
    } else {
      res.setHeader('Vary', 'Accept-Encoding');
    }

    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = function patchedWrite(
      chunk: unknown,
      ...rest: unknown[]
    ): boolean {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as string | Uint8Array)
        );
      }
      const cb = rest.find((arg) => typeof arg === 'function');
      if (typeof cb === 'function') cb();
      return true;
    } as typeof res.write;

    res.end = function patchedEnd(
      chunk?: unknown,
      ...rest: unknown[]
    ): Response {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(
          Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk as string | Uint8Array)
        );
      }
      const body = Buffer.concat(chunks);
      const contentType = String(res.getHeader('content-type') ?? '');
      const callback = rest.find((arg) => typeof arg === 'function') as
        | (() => void)
        | undefined;

      const finish = (payload: Buffer, encoding: string | null): Response => {
        res.write = originalWrite;
        res.end = originalEnd;
        if (encoding) res.setHeader('content-encoding', encoding);
        res.setHeader('content-length', String(payload.length));
        originalWrite(payload);
        originalEnd();
        if (callback) callback();
        return res;
      };

      if (!COMPRESSIBLE_TYPE.test(contentType) || body.length < threshold) {
        return finish(body, null);
      }

      const done = (err: Error | null, payload?: Buffer): Response => {
        if (err || !payload) return finish(body, null);
        return finish(payload, algorithm);
      };
      if (algorithm === 'br') brotliCompress(body, done);
      else gzip(body, done);
      return res;
    } as typeof res.end;

    next();
  };
}
