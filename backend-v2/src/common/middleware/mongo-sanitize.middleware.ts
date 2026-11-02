import type { NextFunction, Request, Response } from 'express';

const sanitizeKey = (key: string): string =>
  key.startsWith('$') || key.includes('.')
    ? key.replace(/^\$/, '_').replace(/\./g, '_')
    : key;

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>
    )) {
      out[sanitizeKey(key)] = sanitizeValue(entry);
    }
    return out;
  }
  return value;
};

/**
 * NoSQL-injection guard equivalent to the legacy `express-mongo-sanitize`
 * (the deprecated `xss-clean` is dropped; query objects are additionally
 * locked down by strict Zod query schemas). Rewrites `$`-prefixed and
 * dot-containing keys in body and route params.
 */
export function mongoSanitizeMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params) as typeof req.params;
    }
    next();
  };
}
