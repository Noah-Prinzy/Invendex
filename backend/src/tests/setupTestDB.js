import mongoose from 'mongoose';
import { clearDatabase } from './helpers/clearDatabase.js';
import { getTestDbUri } from './testDbUri.js';

beforeAll(async () => {
  const uri =
    process.env.MONGO_TEST_URI || process.env.DB_URL || getTestDbUri();

  if (!uri) {
    throw new Error(
      'MONGO_TEST_URI is not set. This should point to a test database.'
    );
  }

  await mongoose.connect(uri);
});

afterEach(async () => {
  await clearDatabase(mongoose.connection);
});

afterAll(async () => {
  await mongoose.disconnect();
});
