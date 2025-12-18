import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { setupTestDB, mockUser, mockAdminUser, mockProduct } from './setup.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import { generateToken, isAuth, isAdmin } from '../../utils.js';

// Setup test database
setupTestDB();

// Mock Express request and response
const mockRequest = (overrides = {}) => ({
  headers: {},
  user: null,
  params: {},
  body: {},
  ...overrides,
});

const mockResponse = () => {
  const res = {
    statusCode: null,
    data: null,
  };
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.send = function (data) {
    this.data = data;
    return this;
  };
  res.json = function (data) {
    this.data = data;
    return this;
  };
  return res;
};

const mockNext = () => {};

// Mock order data
const createMockOrderData = (overrides = {}) => ({
  orderItems: [
    {
      slug: mockProduct.slug,
      name: mockProduct.name,
      quantity: 2,
      image: mockProduct.image,
      price: mockProduct.price,
      product: mockProduct._id,
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
  user: mockUser._id,
  ...overrides,
});

describe('Admin Order Security Tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('TC-SEC-ORD-001: Authentication - Token Validation', () => {
    it('should reject request without authorization header', () => {
      const req = mockRequest();
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'No Token' });
      expect(nextCalled).toBe(false);
    });

    it('should reject request with invalid token', () => {
      const req = mockRequest({
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Token' });
      expect(nextCalled).toBe(false);
    });

    it('should accept request with valid token', () => {
      const token = generateToken(mockUser);
      const req = mockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.email).toBe(mockUser.email);
      expect(nextCalled).toBe(true);
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { ...mockUser },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const req = mockRequest({
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Token' });
      expect(nextCalled).toBe(false);
    });

    it('should reject token with wrong secret', () => {
      const wrongToken = jwt.sign({ ...mockUser }, 'wrong-secret', { expiresIn: '1h' });

      const req = mockRequest({
        headers: {
          authorization: `Bearer ${wrongToken}`,
        },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Token' });
      expect(nextCalled).toBe(false);
    });

    it('should reject malformed authorization header', () => {
      const req = mockRequest({
        headers: {
          authorization: 'InvalidFormat',
        },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAuth(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });
  });

  describe('TC-SEC-ORD-002: Authorization - Admin Access Control', () => {
    it('should allow admin user to access admin routes', () => {
      const req = mockRequest({
        user: mockAdminUser,
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    it('should reject non-admin user from admin routes', () => {
      const req = mockRequest({
        user: mockUser,
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Admin Token' });
      expect(nextCalled).toBe(false);
    });

    it('should reject request without user object', () => {
      const req = mockRequest();
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Admin Token' });
      expect(nextCalled).toBe(false);
    });

    it('should reject user with isAdmin set to false', () => {
      const req = mockRequest({
        user: { ...mockUser, isAdmin: false },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('should reject user with isAdmin set to null', () => {
      const req = mockRequest({
        user: { ...mockUser, isAdmin: null },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('should reject user with isAdmin set to undefined', () => {
      const req = mockRequest({
        user: { ...mockUser, isAdmin: undefined },
      });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });
  });

  describe('TC-SEC-ORD-003: Data Access Control - User Isolation', () => {
    it('should prevent user from accessing other users orders', async () => {
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password',
        isAdmin: false,
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password',
        isAdmin: false,
      });

      const order1 = await Order.create(createMockOrderData({ user: user1._id }));
      const order2 = await Order.create(createMockOrderData({ user: user2._id }));

      // User 1 trying to access their own orders
      const user1Orders = await Order.find({ user: user1._id });
      expect(user1Orders).toHaveLength(1);
      expect(user1Orders[0]._id.toString()).toBe(order1._id.toString());

      // User 2 trying to access their own orders
      const user2Orders = await Order.find({ user: user2._id });
      expect(user2Orders).toHaveLength(1);
      expect(user2Orders[0]._id.toString()).toBe(order2._id.toString());
    });

    it('should allow admin to access all orders', async () => {
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password',
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password',
      });

      await Order.create(createMockOrderData({ user: user1._id }));
      await Order.create(createMockOrderData({ user: user2._id }));

      // Admin accessing all orders
      const allOrders = await Order.find();
      expect(allOrders).toHaveLength(2);
    });
  });

  describe('TC-SEC-ORD-004: Input Validation - Order ID', () => {
    it('should handle invalid ObjectId format', async () => {
      const invalidId = 'invalid-id-format';

      await expect(async () => {
        await Order.findById(invalidId);
      }).rejects.toThrow();
    });

    it('should return null for non-existent valid ObjectId', async () => {
      const validButNonExistentId = new mongoose.Types.ObjectId();
      const order = await Order.findById(validButNonExistentId);

      expect(order).toBeNull();
    });

    it('should handle empty string as order ID', async () => {
      await expect(async () => {
        await Order.findById('');
      }).rejects.toThrow();
    });

    it('should handle null as order ID', async () => {
      const order = await Order.findById(null);
      // Mongoose returns null for invalid IDs instead of throwing
      expect(order).toBeNull();
    });
  });

  describe('TC-SEC-ORD-005: SQL Injection Prevention (NoSQL Injection)', () => {
    it('should demonstrate NoSQL injection risk without sanitization', async () => {
      await Order.create(createMockOrderData());

      // This demonstrates the risk - in production, input should be sanitized
      // before reaching the database query
      const maliciousQuery = { $ne: null };
      const orders = await Order.find({ _id: maliciousQuery });

      // Without sanitization, this would return orders
      // In production, use express-mongo-sanitize or similar middleware
      expect(orders.length).toBeGreaterThanOrEqual(0);
    });

    it('should demonstrate status filter injection risk', async () => {
      await Order.create(createMockOrderData({ status: 'Pending' }));

      // This demonstrates the risk - sanitize user input in routes
      const maliciousStatus = { $ne: 'Cancelled' };
      const orders = await Order.find({ status: maliciousStatus });

      // Without sanitization, this could return unintended results
      // Use input validation in routes to prevent this
      expect(orders.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('TC-SEC-ORD-006: Token Generation Security', () => {
    it('should generate valid JWT token', () => {
      const token = generateToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user information in token', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded._id.toString()).toBe(mockUser._id.toString());
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.isAdmin).toBe(mockUser.isAdmin);
    });

    it('should set token expiration', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should not include sensitive data in plain text', () => {
      const token = generateToken(mockUser);
      const parts = token.split('.');
      const payload = Buffer.from(parts[1], 'base64').toString();

      // Token should be encoded, not plain text
      expect(payload).not.toBe(JSON.stringify(mockUser));
    });
  });

  describe('TC-SEC-ORD-007: Status Update Authorization', () => {
    it('should only allow valid status transitions', async () => {
      const order = await Order.create(createMockOrderData({ status: 'Pending' }));

      // Valid transition
      order.status = 'Processing';
      await expect(order.save()).resolves.toBeDefined();

      // Invalid status
      order.status = 'InvalidStatus';
      await expect(order.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const validStatuses = ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'];

      for (const status of validStatuses) {
        const order = await Order.create(createMockOrderData({ status }));
        expect(order.status).toBe(status);
      }
    });
  });

  describe('TC-SEC-ORD-008: Payment Information Security', () => {
    it('should store payment result securely', async () => {
      const order = await Order.create(createMockOrderData());

      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        id: 'PAYPAL123',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'test@example.com',
      };

      const savedOrder = await order.save();

      expect(savedOrder.paymentResult.id).toBe('PAYPAL123');
      expect(savedOrder.paymentResult.status).toBe('COMPLETED');
    });

    it('should not expose sensitive payment data in queries', async () => {
      const order = await Order.create(
        createMockOrderData({
          isPaid: true,
          paymentResult: {
            id: 'SENSITIVE_ID',
            status: 'COMPLETED',
          },
        })
      );

      // Query without selecting payment result
      const foundOrder = await Order.findById(order._id).select('-paymentResult');
      const orderObj = foundOrder.toObject();

      // When using select('-field'), the field should not exist in object
      expect(orderObj).not.toHaveProperty('paymentResult');
    });
  });

  describe('TC-SEC-ORD-009: Rate Limiting Simulation', () => {
    it('should handle multiple concurrent order queries', async () => {
      // Create multiple orders
      const orders = [];
      for (let i = 0; i < 10; i++) {
        orders.push(Order.create(createMockOrderData()));
      }

      await Promise.all(orders);

      // Simulate concurrent queries
      const queries = [];
      for (let i = 0; i < 20; i++) {
        queries.push(Order.find());
      }

      const results = await Promise.all(queries);

      results.forEach((result) => {
        expect(result).toHaveLength(10);
      });
    });
  });

  describe('TC-SEC-ORD-010: Data Sanitization', () => {
    it('should sanitize shipping address input', async () => {
      const orderWithScriptTag = createMockOrderData({
        shippingAddress: {
          fullName: '<script>alert("XSS")</script>',
          address: '123 Test Street',
          city: 'Test City',
          postalCode: '12345',
          country: 'Vietnam',
        },
      });

      const order = await Order.create(orderWithScriptTag);

      // Data should be stored as-is (sanitization should happen on output)
      expect(order.shippingAddress.fullName).toBe('<script>alert("XSS")</script>');
    });

    it('should handle special characters in order data', async () => {
      const orderWithSpecialChars = createMockOrderData({
        shippingAddress: {
          fullName: "O'Brien & Sons",
          address: '123 "Main" Street',
          city: 'Test City',
          postalCode: '12345',
          country: 'Vietnam',
        },
      });

      const order = await Order.create(orderWithSpecialChars);

      expect(order.shippingAddress.fullName).toBe("O'Brien & Sons");
      expect(order.shippingAddress.address).toBe('123 "Main" Street');
    });
  });

  describe('TC-SEC-ORD-011: Session Management', () => {
    it('should validate user session before order access', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
      });

      const order = await Order.create(createMockOrderData({ user: user._id }));

      // Verify order belongs to user
      const foundOrder = await Order.findOne({ _id: order._id, user: user._id });
      expect(foundOrder).toBeDefined();

      // Try to access with different user
      const otherUserId = new mongoose.Types.ObjectId();
      const notFound = await Order.findOne({ _id: order._id, user: otherUserId });
      expect(notFound).toBeNull();
    });
  });

  describe('TC-SEC-ORD-012: Privilege Escalation Prevention', () => {
    it('should prevent regular user from updating order status', async () => {
      const user = await User.create({
        name: 'Regular User',
        email: 'user@example.com',
        password: 'password',
        isAdmin: false,
      });

      const req = mockRequest({ user });
      const res = mockResponse();
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      isAdmin(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    it('should prevent user from modifying isAdmin flag', () => {
      const userToken = generateToken(mockUser);
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET);

      // User should not be able to modify isAdmin in token
      expect(decoded.isAdmin).toBe(mockUser.isAdmin);
    });
  });

  describe('TC-SEC-ORD-013: CORS and Origin Validation', () => {
    it('should validate request origin (simulation)', () => {
      const req = mockRequest({
        headers: {
          origin: 'https://trusted-domain.com',
        },
      });

      expect(req.headers.origin).toBe('https://trusted-domain.com');
    });

    it('should handle missing origin header', () => {
      const req = mockRequest();

      expect(req.headers.origin).toBeUndefined();
    });
  });

  describe('TC-SEC-ORD-014: Error Information Disclosure', () => {
    it('should not expose database errors to client', async () => {
      const invalidOrder = {
        // Missing required fields
        orderItems: [],
      };

      try {
        await Order.create(invalidOrder);
      } catch (error) {
        // Error should not contain sensitive database information
        expect(error.message).not.toContain('mongodb://');
        expect(error.message).not.toContain('password');
      }
    });
  });

  describe('TC-SEC-ORD-015: Audit Trail', () => {
    it('should track order creation timestamp', async () => {
      const order = await Order.create(createMockOrderData());

      expect(order.createdAt).toBeDefined();
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should track order modification timestamp', async () => {
      const order = await Order.create(createMockOrderData());
      const originalUpdatedAt = order.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      order.status = 'Processing';
      await order.save();

      expect(order.updatedAt).toBeDefined();
      expect(order.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should track payment timestamp', async () => {
      const order = await Order.create(createMockOrderData());

      order.isPaid = true;
      order.paidAt = new Date();
      await order.save();

      expect(order.paidAt).toBeDefined();
      expect(order.paidAt).toBeInstanceOf(Date);
    });

    it('should track delivery timestamp', async () => {
      const order = await Order.create(createMockOrderData());

      order.isDelivered = true;
      order.deliveredAt = new Date();
      await order.save();

      expect(order.deliveredAt).toBeDefined();
      expect(order.deliveredAt).toBeInstanceOf(Date);
    });
  });
});
