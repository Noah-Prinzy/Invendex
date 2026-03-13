const DEFAULT_TEST_DB_URI = 'mongodb://127.0.0.1:27017/invendex_test';

const shouldIsolateWorkers = () =>
  String(process.env.MONGO_TEST_ISOLATE_WORKERS || 'true')
    .trim()
    .toLowerCase() !== 'false';

const getWorkerSuffix = () => {
  if (!shouldIsolateWorkers()) return '';
  const workerId = String(process.env.JEST_WORKER_ID || '').trim();
  if (!workerId) return '';
  return `_w${workerId}`;
};

const withWorkerSuffix = (uri, suffix) => {
  if (!suffix) return uri;

  try {
    const parsed = new URL(uri);
    if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
      return uri;
    }

    const currentDbName = String(parsed.pathname || '/')
      .replace(/^\/+/, '')
      .trim();
    const baseDbName = currentDbName || 'invendex_test';
    parsed.pathname = `/${baseDbName}${suffix}`;
    return parsed.toString();
  } catch {
    return uri;
  }
};

export const getTestDbUri = () => {
  const explicit = String(process.env.MONGO_TEST_URI || '').trim();
  const baseUri = explicit || DEFAULT_TEST_DB_URI;
  return withWorkerSuffix(baseUri, getWorkerSuffix());
};

export default {
  getTestDbUri
};
