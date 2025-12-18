import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Mock user data
export const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedpassword',
  isAdmin: false,
};

export const mockAdminUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'hashedpassword',
  isAdmin: true,
};

export const mockProduct = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Product',
  slug: 'test-product',
  image: '/images/test.jpg',
  price: 100000,
  countInStock: 10,
  brand: 'Test Brand',
  category: 'Test Category',
  description: 'Test Description',
  rating: 4.5,
  numReviews: 10,
};

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

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });
};

export default { setupTestDB, mockUser, mockAdminUser, mockProduct };
