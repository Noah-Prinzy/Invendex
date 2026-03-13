const mongoose = require('mongoose');

beforeAll(async () => {
  const uri =
    process.env.MONGO_TEST_URI ||
    process.env.DB_URL ||
    'mongodb://127.0.0.1:27017/invendex_test';

  if (!uri) {
    throw new Error(
      'MONGO_TEST_URI is not set. This should point to a test database.'
    );
  }

  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});
