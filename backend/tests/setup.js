const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set critical environment variables for testing
process.env.JWT_SECRET = 'test_secret_key_12345';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODEMAILER_EMAIL = 'test@example.com';
process.env.NODEMAILER_PASSWORD = 'test';
process.env.NODE_ENV = 'test';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});
