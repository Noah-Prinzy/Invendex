const sanitizeScope = (scope) => {
  const raw = String(scope || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw || 'mutation';
};

const generateRandomSegment = () => {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2);
  const now = Date.now().toString(36);
  return `${now}-${random}`;
};

export const createIdempotencyKey = (scope = 'mutation') =>
  `${sanitizeScope(scope)}-${generateRandomSegment()}`;

export default {
  createIdempotencyKey
};
