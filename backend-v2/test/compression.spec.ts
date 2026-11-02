import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import type { NextFunction, Request, Response } from 'express';
import { compressionMiddleware } from '../src/common/middleware/compression.middleware';

interface FakeRes {
  res: Response;
  headers: Record<string, string>;
  getBody: () => Buffer;
}

function fakeRes(contentType: string): FakeRes {
  const headers: Record<string, string> = { 'content-type': contentType };
  const chunks: Buffer[] = [];
  const res = {
    getHeader: (key: string) => headers[key.toLowerCase()],
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = value;
    },
    append: (key: string, value: string) => {
      const existing = headers[key.toLowerCase()];
      headers[key.toLowerCase()] = existing ? `${existing}, ${value}` : value;
    },
    removeHeader: (key: string) => {
      delete headers[key.toLowerCase()];
    },
    write(chunk: Buffer | string) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    },
    end(chunk?: Buffer | string | (() => void), cb?: () => void) {
      if (typeof chunk === 'function') chunk();
      else if (chunk)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      if (cb) cb();
      return res;
    }
  };
  return {
    res: res as unknown as Response,
    headers,
    getBody: () => Buffer.concat(chunks)
  };
}

const bigJson = JSON.stringify({
  success: true,
  data: Array.from({ length: 500 }, (_, i) => ({
    index: i,
    label: `item-${i}`
  }))
});

function run(
  acceptEncoding: string,
  contentType = 'application/json; charset=utf-8',
  payload = bigJson
): Promise<FakeRes> {
  const middleware = compressionMiddleware();
  const req = {
    headers: { 'accept-encoding': acceptEncoding }
  } as unknown as Request;
  const fake = fakeRes(contentType);
  return new Promise((resolve) => {
    middleware(req, fake.res, (() => {
      fake.res.end(payload, () => resolve(fake));
    }) as NextFunction);
  });
}

describe('compression middleware (Brotli-first)', () => {
  it('compresses with Brotli when the client accepts br', async () => {
    const fake = await run('gzip, deflate, br');
    expect(fake.headers['content-encoding']).toBe('br');
    expect(fake.headers.vary).toContain('Accept-Encoding');
    expect(brotliDecompressSync(fake.getBody()).toString()).toBe(bigJson);
  });

  it('falls back to gzip when br is not accepted', async () => {
    const fake = await run('gzip');
    expect(fake.headers['content-encoding']).toBe('gzip');
    expect(gunzipSync(fake.getBody()).toString()).toBe(bigJson);
  });

  it('passes through when no supported encoding is accepted', async () => {
    const fake = await run('identity');
    expect(fake.headers['content-encoding']).toBeUndefined();
    expect(fake.getBody().toString()).toBe(bigJson);
  });

  it('does not compress small or non-compressible payloads', async () => {
    const small = await run('br', 'application/json', '{"ok":true}');
    expect(small.headers['content-encoding']).toBeUndefined();
    expect(small.getBody().toString()).toBe('{"ok":true}');

    const binary = await run('br', 'application/octet-stream', bigJson);
    expect(binary.headers['content-encoding']).toBeUndefined();
  });
});
