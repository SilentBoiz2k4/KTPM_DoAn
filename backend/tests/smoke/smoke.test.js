/**
 * SMOKE TESTS - Đặt hàng/Thanh toán
 * 
 * Smoke tests kiểm tra các chức năng cơ bản nhất của hệ thống.
 * Mục đích: Xác nhận hệ thống có thể khởi động và các API endpoints chính hoạt động.
 * 
 * Chạy: npm run test:smoke
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import createApp from '../../app.js';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
import Order from '../../models/orderModel.js';
import Cart from '../../models/cartModel.js';

let mongoServer;
let app;

// Test data
let testUser;
let adminUser;
let testProduct;
let userToken;
let adminToken;

// Setup
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.JWT_SECRET = 'smoke-test-secret';
  await mongoose.connect(mongoUri);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Cart.deleteMany({});

  // Create test user
  testUser = await User.create({
    name: 'Smoke Test User',
    email: 'smoke@test.com',
    password: bcrypt.hashSync('password123', 8),
    isAdmin: false,
  });

  // Create admin user
  adminUser = await User.create({
    name: 'Smoke Admin',
    email: 'admin@smoke.com',
    password: bcrypt.hashSync('admin123', 8),
    isAdmin: true,
  });

  // Create test product
  testProduct = await Product.create({
    name: 'Smoke Test Product',
    slug: 'smoke-test-product',
    image: '/images/smoke.jpg',
    brand: 'Smoke Brand',
    category: 'Smoke Category',
    description: 'Product for smoke testing',
    price: 100000,
    countInStock: 50,
    rating: 4.5,
    numReviews: 10,
  });

  // Generate tokens
  userToken = jwt.sign(
    { _id: testUser._id, name: testUser.name, email: testUser.email, isAdmin: false },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  adminToken = jwt.sign(
    { _id: adminUser._id, name: adminUser.name, email: adminUser.email, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});


/**
 * ============================================
 * SMOKE TEST SUITE: Health Check
 * ============================================
 */
describe('SMOKE: Health Check', () => {
  it('SM-001: API server đang chạy', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('SM-002: PayPal key endpoint hoạt động', async () => {
    const res = await request(app).get('/api/keys/paypal');
    
    expect(res.status).toBe(200);
  });
});

/**
 * ============================================
 * SMOKE TEST SUITE: Cart API
 * ============================================
 */
describe('SMOKE: Cart API', () => {
  it('SM-CART-001: Có thể lấy giỏ hàng', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });

  it('SM-CART-002: Có thể thêm sản phẩm vào giỏ hàng', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItems: [{
          _id: testProduct._id.toString(),
          name: testProduct.name,
          slug: testProduct.slug,
          image: testProduct.image,
          price: testProduct.price,
          quantity: 1,
          countInStock: testProduct.countInStock,
        }],
      });

    expect(res.status).toBe(201);
    expect(res.body.cartItems).toHaveLength(1);
  });

  it('SM-CART-003: Có thể xóa giỏ hàng', async () => {
    // First create a cart
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ cartItems: [] });

    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
  });

  it('SM-CART-004: Từ chối truy cập không có token', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
  });
});


/**
 * ============================================
 * SMOKE TEST SUITE: Order API
 * ============================================
 */
describe('SMOKE: Order API', () => {
  it('SM-ORD-001: Có thể tạo đơn hàng', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderItems: [{
          _id: testProduct._id.toString(),
          slug: testProduct.slug,
          name: testProduct.name,
          quantity: 1,
          image: testProduct.image,
          price: testProduct.price,
        }],
        shippingAddress: {
          fullName: 'Smoke User',
          address: '123 Smoke Street',
          city: 'Smoke City',
          postalCode: '12345',
          country: 'Vietnam',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 100000,
        shippingPrice: 30000,
        taxPrice: 10000,
        totalPrice: 140000,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('New Order Created');
    expect(res.body.order).toBeDefined();
  });

  it('SM-ORD-002: Có thể lấy danh sách đơn hàng của user', async () => {
    const res = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('SM-ORD-003: Có thể lấy chi tiết đơn hàng', async () => {
    // Create order first
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderItems: [{
          _id: testProduct._id.toString(),
          slug: testProduct.slug,
          name: testProduct.name,
          quantity: 1,
          image: testProduct.image,
          price: testProduct.price,
        }],
        shippingAddress: {
          fullName: 'Test',
          address: 'Test',
          city: 'Test',
          postalCode: '12345',
          country: 'VN',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 100000,
        shippingPrice: 30000,
        taxPrice: 10000,
        totalPrice: 140000,
      });

    const orderId = createRes.body.order._id;

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(orderId);
  });

  it('SM-ORD-004: Từ chối tạo đơn hàng không có token', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        orderItems: [],
        shippingAddress: {},
        paymentMethod: 'PayPal',
        itemsPrice: 0,
        shippingPrice: 0,
        taxPrice: 0,
        totalPrice: 0,
      });

    expect(res.status).toBe(401);
  });
});


/**
 * ============================================
 * SMOKE TEST SUITE: Payment API
 * ============================================
 */
describe('SMOKE: Payment API', () => {
  let testOrder;

  beforeEach(async () => {
    // Create a test order for payment tests
    testOrder = await Order.create({
      orderItems: [{
        slug: testProduct.slug,
        name: testProduct.name,
        quantity: 1,
        image: testProduct.image,
        price: testProduct.price,
        product: testProduct._id,
      }],
      shippingAddress: {
        fullName: 'Payment Test',
        address: '123 Payment St',
        city: 'Payment City',
        postalCode: '12345',
        country: 'Vietnam',
      },
      paymentMethod: 'PayPal',
      itemsPrice: 100000,
      shippingPrice: 30000,
      taxPrice: 10000,
      totalPrice: 140000,
      user: testUser._id,
    });
  });

  it('SM-PAY-001: Có thể thanh toán đơn hàng (PayPal)', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrder._id}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        id: 'SMOKE_PAYPAL_123',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'smoke@paypal.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.order.isPaid).toBe(true);
  });

  it('SM-PAY-002: Trả về 404 khi thanh toán đơn hàng không tồn tại', async () => {
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .put(`/api/orders/${fakeId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ id: 'test', status: 'COMPLETED' });

    expect(res.status).toBe(404);
  });
});

/**
 * ============================================
 * SMOKE TEST SUITE: Admin Order Management
 * ============================================
 */
describe('SMOKE: Admin Order Management', () => {
  let testOrder;

  beforeEach(async () => {
    testOrder = await Order.create({
      orderItems: [{
        slug: testProduct.slug,
        name: testProduct.name,
        quantity: 1,
        image: testProduct.image,
        price: testProduct.price,
        product: testProduct._id,
      }],
      shippingAddress: {
        fullName: 'Admin Test',
        address: '123 Admin St',
        city: 'Admin City',
        postalCode: '12345',
        country: 'Vietnam',
      },
      paymentMethod: 'COD',
      itemsPrice: 100000,
      shippingPrice: 30000,
      taxPrice: 10000,
      totalPrice: 140000,
      user: testUser._id,
    });
  });

  it('SM-ADM-001: Admin có thể lấy tất cả đơn hàng', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('SM-ADM-002: Admin có thể cập nhật trạng thái đơn hàng', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrder._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Processing' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('Processing');
  });

  it('SM-ADM-003: Admin có thể xem thống kê', async () => {
    const res = await request(app)
      .get('/api/orders/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toBeDefined();
  });

  it('SM-ADM-004: User thường không thể truy cập admin endpoints', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(401);
  });
});


/**
 * ============================================
 * SMOKE TEST SUITE: Critical Checkout Flow
 * ============================================
 */
describe('SMOKE: Critical Checkout Flow', () => {
  it('SM-FLOW-001: Complete PayPal checkout flow', async () => {
    // Step 1: Add to cart
    const cartRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        cartItems: [{
          _id: testProduct._id.toString(),
          name: testProduct.name,
          slug: testProduct.slug,
          image: testProduct.image,
          price: testProduct.price,
          quantity: 2,
          countInStock: testProduct.countInStock,
        }],
        shippingAddress: {
          fullName: 'Flow Test',
          address: '123 Flow St',
          city: 'Flow City',
          postalCode: '12345',
          country: 'Vietnam',
        },
        paymentMethod: 'PayPal',
      });

    expect(cartRes.status).toBe(201);

    // Step 2: Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderItems: [{
          _id: testProduct._id.toString(),
          slug: testProduct.slug,
          name: testProduct.name,
          quantity: 2,
          image: testProduct.image,
          price: testProduct.price,
        }],
        shippingAddress: {
          fullName: 'Flow Test',
          address: '123 Flow St',
          city: 'Flow City',
          postalCode: '12345',
          country: 'Vietnam',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 200000,
        shippingPrice: 30000,
        taxPrice: 20000,
        totalPrice: 250000,
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.order._id;

    // Step 3: Pay order
    const payRes = await request(app)
      .put(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        id: 'SMOKE_FLOW_PAY_123',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'flow@test.com',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.order.isPaid).toBe(true);

    // Step 4: Verify order in history
    const historyRes = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', `Bearer ${userToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.length).toBeGreaterThan(0);
  });

  it('SM-FLOW-002: Complete COD checkout flow', async () => {
    // Step 1: Create COD order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        orderItems: [{
          _id: testProduct._id.toString(),
          slug: testProduct.slug,
          name: testProduct.name,
          quantity: 1,
          image: testProduct.image,
          price: testProduct.price,
        }],
        shippingAddress: {
          fullName: 'COD Test',
          address: '123 COD St',
          city: 'COD City',
          postalCode: '12345',
          country: 'Vietnam',
        },
        paymentMethod: 'COD',
        itemsPrice: 100000,
        shippingPrice: 30000,
        taxPrice: 10000,
        totalPrice: 140000,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.order.isPaid).toBe(false);
    const orderId = orderRes.body.order._id;

    // Step 2: Admin delivers order (COD gets paid on delivery)
    const deliverRes = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Delivered' });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('Delivered');
    expect(deliverRes.body.order.isPaid).toBe(true);
  });
});

/**
 * ============================================
 * SMOKE TEST SUITE: Error Handling
 * ============================================
 */
describe('SMOKE: Error Handling', () => {
  it('SM-ERR-001: Xử lý order không tồn tại', async () => {
    const res = await request(app)
      .get('/api/orders/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Order Not Found');
  });

  it('SM-ERR-002: Xử lý token không hợp lệ', async () => {
    const res = await request(app)
      .get('/api/orders/mine')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid Token');
  });

  it('SM-ERR-003: Xử lý thiếu token', async () => {
    const res = await request(app).get('/api/orders/mine');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No Token');
  });
});
