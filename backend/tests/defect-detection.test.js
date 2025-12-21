/**
 * Defect Detection Tests
 * 
 * HUONG DAN DEMO:
 * 1. Chay test PASS truoc: npm test -- --testPathPattern="defect-detection"
 * 2. Sau do uncomment phan "DEMO FAILED TESTS" o cuoi file
 * 3. Chay lai de demo test FAILED
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import createApp from '../app.js';
import { generateToken } from '../utils.js';
import {
  setupIntegrationDB,
  generateTestToken,
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder,
} from './integration/setup.js';

const app = createApp();
setupIntegrationDB();

// ============================================
// PHAN 1: TEST CASES PASS - Demo truoc
// ============================================

describe('Order API Tests - PASS', () => {
  let adminUser, regularUser, otherUser, testProduct;
  let adminToken, userToken, otherUserToken;

  beforeEach(async () => {
    adminUser = await createAdminUser();
    regularUser = await createTestUser({ email: 'user1@test.com' });
    otherUser = await createTestUser({ email: 'user2@test.com' });
    testProduct = await createTestProduct();
    adminToken = generateTestToken(adminUser);
    userToken = generateTestToken(regularUser);
    otherUserToken = generateTestToken(otherUser);
  });

  describe('Authentication Tests', () => {
    it('TC-AUTH-001: Tao JWT token thanh cong', () => {
      const user = {
        _id: '123',
        name: 'Test',
        email: 'test@test.com',
        password: 'secret123',
        isAdmin: false,
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.email).toBe('test@test.com');
      expect(decoded.name).toBe('Test');
    });

    it('TC-AUTH-002: Token chua thong tin user', () => {
      const user = {
        _id: '456',
        name: 'Admin',
        email: 'admin@test.com',
        isAdmin: true,
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.isAdmin).toBe(true);
    });
  });

  describe('Order Creation Tests', () => {
    it('TC-ORD-001: Tao don hang thanh cong', async () => {
      const orderData = {
        orderItems: [{
          _id: testProduct._id.toString(),
          slug: 'test',
          name: 'Test Product',
          quantity: 2,
          image: '/test.jpg',
          price: 100000,
        }],
        shippingAddress: {
          fullName: 'Nguyen Van A',
          address: '123 ABC Street',
          city: 'Ho Chi Minh',
          postalCode: '70000',
          country: 'Vietnam',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 200000,
        shippingPrice: 30000,
        taxPrice: 20000,
        totalPrice: 250000,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('New Order Created');
    });

    it('TC-ORD-002: Tao don hang COD thanh cong', async () => {
      const orderData = {
        orderItems: [{
          _id: testProduct._id.toString(),
          slug: 'test',
          name: 'Test Product',
          quantity: 1,
          image: '/test.jpg',
          price: 150000,
        }],
        shippingAddress: {
          fullName: 'Tran Van B',
          address: '456 XYZ Street',
          city: 'Ha Noi',
          postalCode: '10000',
          country: 'Vietnam',
        },
        paymentMethod: 'COD',
        itemsPrice: 150000,
        shippingPrice: 30000,
        taxPrice: 15000,
        totalPrice: 195000,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.order.paymentMethod).toBe('COD');
    });
  });

  describe('Order Payment Tests', () => {
    it('TC-PAY-001: Thanh toan PayPal thanh cong', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'PAYPAL_TXN_123',
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: 'buyer@paypal.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.order.isPaid).toBe(true);
    });

    it('TC-PAY-002: Tra ve 404 khi don hang khong ton tai', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`/api/orders/${fakeId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'PAY123',
          status: 'COMPLETED',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });
  });

  describe('Order Status Tests', () => {
    it('TC-STATUS-001: Admin cap nhat trang thai thanh cong', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Processing');
    });

    it('TC-STATUS-002: User thuong khong the cap nhat trang thai', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Admin Token');
    });

    it('TC-STATUS-003: COD tu dong paid khi Delivered', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: false,
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body.order.isPaid).toBe(true);
      expect(res.body.order.paymentResult.id).toBe('COD');
    });
  });

  describe('Order Query Tests', () => {
    it('TC-QUERY-001: User xem danh sach don hang cua minh', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      await createTestOrder(regularUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('TC-QUERY-002: Admin xem tat ca don hang', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      await createTestOrder(otherUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('TC-QUERY-003: Tu choi truy cap khong co token', async () => {
      const res = await request(app).get('/api/orders/mine');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No Token');
    });
  });
});


// ============================================
// PHAN 2: DEMO FAILED TESTS
// Uncomment phan nay khi demo test FAILED
// ============================================

/*
describe('Security Tests - FAILED (Demo Bug)', () => {
  let adminUser, regularUser, otherUser, testProduct;
  let adminToken, userToken, otherUserToken;

  beforeEach(async () => {
    adminUser = await createAdminUser();
    regularUser = await createTestUser({ email: 'user1@test.com' });
    otherUser = await createTestUser({ email: 'user2@test.com' });
    testProduct = await createTestProduct();
    adminToken = generateTestToken(adminUser);
    userToken = generateTestToken(regularUser);
    otherUserToken = generateTestToken(otherUser);
  });

  it('BUG-001: Password KHONG duoc nam trong JWT token', () => {
    const user = {
      _id: '123',
      name: 'Test',
      email: 'test@test.com',
      password: 'secret123',
      isAdmin: false,
    };

    const token = generateToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // BUG: Password dang bi include trong token
    // Expected: undefined, Actual: 'secret123'
    expect(decoded.password).toBeUndefined();
  });

  it('BUG-002: User KHONG duoc thanh toan don hang cua nguoi khac', async () => {
    const orderA = await createTestOrder(otherUser._id, testProduct._id);

    const res = await request(app)
      .put(`/api/orders/${orderA._id}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        id: 'PAY123',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'test@test.com',
      });

    // BUG: He thong cho phep thanh toan don hang nguoi khac
    // Expected: 403, Actual: 200
    expect(res.status).toBe(403);
  });

  it('BUG-003: KHONG cho phep tao don hang voi gia am', async () => {
    const orderData = {
      orderItems: [{
        _id: testProduct._id.toString(),
        slug: 'test',
        name: 'Test',
        quantity: 1,
        image: '/test.jpg',
        price: -100000,
      }],
      shippingAddress: {
        fullName: 'Test',
        address: '123 St',
        city: 'HCM',
        postalCode: '70000',
        country: 'VN',
      },
      paymentMethod: 'PayPal',
      itemsPrice: -100000,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice: -100000,
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send(orderData);

    // BUG: He thong cho phep tao don hang voi gia am
    // Expected: 400, Actual: 201
    expect(res.status).toBe(400);
  });

  it('BUG-004: KHONG cho phep thanh toan lai don hang da paid', async () => {
    const order = await createTestOrder(regularUser._id, testProduct._id, {
      isPaid: true,
      paidAt: new Date(),
      paymentResult: { id: 'OLD_PAY', status: 'COMPLETED' },
    });

    const res = await request(app)
      .put(`/api/orders/${order._id}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        id: 'NEW_PAY',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'test@test.com',
      });

    // BUG: He thong cho phep thanh toan lai
    // Expected: 400, Actual: 200
    expect(res.status).toBe(400);
  });
});
*/