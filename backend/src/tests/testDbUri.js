const DEFAULT_TEST_DB_URI = 'mongodb://127.0.0.1:27017/ledgerly_test';

export const getTestDbUri = () => {
  const explicit = String(process.env.MONGO_TEST_URI || '').trim();
  if (explicit) {
    return explicit;
  }

  const dbUrl = String(process.env.DB_URL || '').trim();
  if (dbUrl) {
    return dbUrl;
  }

  return DEFAULT_TEST_DB_URI;
};

export default {
  getTestDbUri
};
