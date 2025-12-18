import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';
import Cart from '../../models/cartModel.js';

let mongoServer;

// Setup test database
export const setupIntegrationDB = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = 'test-secret-key-for-integration-tests';
    
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

// Generate JWT token for testing
export const generateTestToken = (user) => {
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

// Create test user
export const createTestUser = async (overrides = {}) => {
  const userData = {
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: bcrypt.hashSync('password123', 8),
    isAdmin: false,
    ...overrides,
  };
  const user = new User(userData);
  await user.save();
  return user;
};

// Create admin user
export const createAdminUser = async () => {
  return createTestUser({
    name: 'Admin User',
    email: `admin${Date.now()}@example.com`,
    isAdmin: true,
  });
};


// Create test product
export const createTestProduct = async (overrides = {}) => {
  const productData = {
    name: 'Test Product',
    slug: `test-product-${Date.now()}`,
    image: '/images/test.jpg',
    images: [],
    brand: 'Test Brand',
    category: 'Test Category',
    description: 'Test description',
    price: 100000,
    countInStock: 10,
    rating: 4.5,
    numReviews: 10,
    ...overrides,
  };
  const product = new Product(productData);
  await product.save();
  return product;
};

// Create test order
export const createTestOrder = async (userId, productId, overrides = {}) => {
  const orderData = {
    orderItems: [
      {
        slug: 'test-product',
        name: 'Test Product',
        quantity: 2,
        image: '/images/test.jpg',
        price: 100000,
        product: productId,
      },
    ],
    shippingAddress: {
      fullName: 'Test User',
      address: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'Vietnam',
    },
    paymentMethod: 'PayPal',
    itemsPrice: 200000,
    shippingPrice: 30000,
    taxPrice: 20000,
    totalPrice: 250000,
    user: userId,
    ...overrides,
  };
  const order = new Order(orderData);
  await order.save();
  return order;
};

// Create test cart
export const createTestCart = async (userId, productId, overrides = {}) => {
  const cartData = {
    user: userId,
    cartItems: [
      {
        _id: productId.toString(),
        name: 'Test Product',
        slug: 'test-product',
        image: '/images/test.jpg',
        price: 100000,
        quantity: 2,
        countInStock: 10,
      },
    ],
    shippingAddress: {
      fullName: 'Test User',
      address: '123 Test Street',
      city: 'Test City',
      postalCode: '12345',
      country: 'Vietnam',
    },
    paymentMethod: 'PayPal',
    ...overrides,
  };
  const cart = new Cart(cartData);
  await cart.save();
  return cart;
};

// Mock order data for API requests
export const mockOrderPayload = (productId) => ({
  orderItems: [
    {
      _id: productId.toString(),
      slug: 'test-product',
      name: 'Test Product',
      quantity: 2,
      image: '/images/test.jpg',
      price: 100000,
    },
  ],
  shippingAddress: {
    fullName: 'Test User',
    address: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    country: 'Vietnam',
  },
  paymentMethod: 'PayPal',
  itemsPrice: 200000,
  shippingPrice: 30000,
  taxPrice: 20000,
  totalPrice: 250000,
});

// Mock cart data for API requests
export const mockCartPayload = (productId) => ({
  cartItems: [
    {
      _id: productId.toString(),
      name: 'Test Product',
      slug: 'test-product',
      image: '/images/test.jpg',
      price: 100000,
      quantity: 2,
      countInStock: 10,
    },
  ],
  shippingAddress: {
    fullName: 'Test User',
    address: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    country: 'Vietnam',
  },
  paymentMethod: 'PayPal',
});
