import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Setup before all tests
export const setupTestDB = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });
};

// Mock user data
export const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  isAdmin: false,
};

export const mockAdminUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Admin User',
  email: 'admin@example.com',
  isAdmin: true,
};

// Mock product data
export const mockProduct = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Product',
  slug: 'test-product',
  image: '/images/test.jpg',
  price: 100000,
  countInStock: 10,
  category: 'Test Category',
  brand: 'Test Brand',
  rating: 4.5,
  numReviews: 10,
  description: 'Test description',
};
