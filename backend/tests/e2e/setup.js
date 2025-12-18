/**
 * E2E Test Setup
 * 
 * Setup cho End-to-End tests - test toàn bộ flow từ đầu đến cuối
 * mô phỏng hành vi thực tế của người dùng
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';
import Cart from '../../models/cartModel.js';

let mongoServer;

// Setup E2E test database
export const setupE2EDB = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.JWT_SECRET = 'e2e-test-secret-key';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
};

// Clean database between tests
export const cleanDatabase = async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Cart.deleteMany({});
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Create user via API simulation
export const createUser = async (userData = {}) => {
  const defaultData = {
    name: 'E2E Test User',
    email: `e2e_${Date.now()}@test.com`,
    password: bcrypt.hashSync('password123', 8),
    isAdmin: false,
  };
  const user = await User.create({ ...defaultData, ...userData });
  const token = generateToken(user);
  return { user, token };
};

// Create admin user
export const createAdmin = async () => {
  return createUser({
    name: 'E2E Admin',
    email: `admin_${Date.now()}@test.com`,
    isAdmin: true,
  });
};

// Create product
export const createProduct = async (productData = {}) => {
  const defaultData = {
    name: `E2E Product ${Date.now()}`,
    slug: `e2e-product-${Date.now()}`,
    image: '/images/e2e-product.jpg',
    images: [],
    brand: 'E2E Brand',
    category: 'E2E Category',
    description: 'Product for E2E testing',
    price: 100000,
    countInStock: 50,
    rating: 4.5,
    numReviews: 10,
  };
  return await Product.create({ ...defaultData, ...productData });
};

// Create multiple products
export const createProducts = async (count = 3) => {
  const products = [];
  for (let i = 0; i < count; i++) {
    const product = await createProduct({
      name: `E2E Product ${i + 1}`,
      slug: `e2e-product-${i + 1}-${Date.now()}`,
      price: (i + 1) * 100000,
    });
    products.push(product);
  }
  return products;
};
