import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Deterministic secrets for tests (never read from a developer's .env)
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
process.env.ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || 'test-esewa-secret';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'test-cloud';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
