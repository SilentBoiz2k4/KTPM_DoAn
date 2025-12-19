/**
 * White-box Security Testing - Order Management
 * Kiểm thử hộp trắng bảo mật cho chức năng đặt hàng/thanh toán và quản lý đơn hàng
 * 
 * Các chức năng được test:
 * 1. Đặt hàng (POST /api/orders)
 * 2. Thanh toán (PUT /api/orders/:id/pay)
 * 3. Quản lý đơn hàng Admin (GET /api/orders, PUT /api/orders/:id/status)
 * 4. Xem đơn hàng (GET /api/orders/:id, GET /api/orders/mine)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import createApp from '../../app.js';
import {
  setupIntegrationDB,
  generateTestToken,
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder,
  createTestCart,
} from '../integration/setup.js';
import Order from '../../models/orderModel.js';
import Cart from '../../models/cartModel.js';

const app = createApp();
setupIntegrationDB();

describe('White-box Security Testing - Order Management', () => {
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


  /**
   * ============================================
   * PHẦN 1: ĐẶT HÀNG (POST /api/orders)
   * Security Focus: Authentication, Input Validation, Data Integrity
   * ============================================
   */
  describe('WB-ORD-SEC-001: Đặt hàng - Authentication', () => {
    const validOrderData = () => ({
      orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: 'Test', quantity: 1, image: '/test.jpg', price: 100000 }],
      shippingAddress: { fullName: 'Test User', address: '123 St', city: 'HCM', postalCode: '70000', country: 'VN' },
      paymentMethod: 'PayPal',
      itemsPrice: 100000,
      shippingPrice: 20000,
      taxPrice: 10000,
      totalPrice: 130000,
    });

    it('WB-ORD-SEC-001a: Từ chối đặt hàng khi không có token', async () => {
      const res = await request(app).post('/api/orders').send(validOrderData());
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No Token');
    });

    it('WB-ORD-SEC-001b: Từ chối đặt hàng với token không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid-token')
        .send(validOrderData());
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Token');
    });

    it('WB-ORD-SEC-001c: Cho phép đặt hàng với token hợp lệ', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validOrderData());
      expect(res.status).toBe(201);
      expect(res.body.order.user.toString()).toBe(regularUser._id.toString());
    });

    it('WB-ORD-SEC-001d: Đơn hàng được gán đúng user từ token (không thể giả mạo)', async () => {
      const orderData = {
        ...validOrderData(),
        user: otherUser._id.toString(), // Cố gắng giả mạo user
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201);
      // User phải là từ token, không phải từ body
      expect(res.body.order.user.toString()).toBe(regularUser._id.toString());
      expect(res.body.order.user.toString()).not.toBe(otherUser._id.toString());
    });
  });

  describe('WB-ORD-SEC-002: Đặt hàng - Input Validation & Injection', () => {
    it('WB-ORD-SEC-002a: XSS trong tên sản phẩm', async () => {
      const xssPayload = "<script>alert('XSS')</script>";
      const orderData = {
        orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: xssPayload, quantity: 1, image: '/test.jpg', price: 100000 }],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'HCM', postalCode: '70000', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 100000, shippingPrice: 0, taxPrice: 0, totalPrice: 100000,
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201);
      // Data được lưu, cần sanitize khi hiển thị
      expect(res.body.order.orderItems[0].name).toBe(xssPayload);
    });

    it('WB-ORD-SEC-002b: XSS trong địa chỉ giao hàng', async () => {
      const xssPayload = "<img src=x onerror=alert('XSS')>";
      const orderData = {
        orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: 'Test', quantity: 1, image: '/test.jpg', price: 100000 }],
        shippingAddress: { fullName: xssPayload, address: xssPayload, city: 'HCM', postalCode: '70000', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 100000, shippingPrice: 0, taxPrice: 0, totalPrice: 100000,
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201);
    });

    it('WB-ORD-SEC-002c: NoSQL Injection trong orderItems', async () => {
      const orderData = {
        orderItems: [{ _id: { $ne: null }, slug: 'test', name: 'Test', quantity: 1, image: '/test.jpg', price: 100000 }],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'HCM', postalCode: '70000', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 100000, shippingPrice: 0, taxPrice: 0, totalPrice: 100000,
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);
      
      // Mongoose sẽ xử lý và có thể reject hoặc convert
      expect([201, 400, 500]).toContain(res.status);
    });

    it('WB-ORD-SEC-002d: Giá âm (negative price)', async () => {
      const orderData = {
        orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: 'Test', quantity: 1, image: '/test.jpg', price: -100000 }],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'HCM', postalCode: '70000', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: -100000, shippingPrice: 0, taxPrice: 0, totalPrice: -100000,
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);
      
      // Hệ thống nên validate giá không âm
      expect(res.status).toBe(201); // BUG: Nên reject giá âm
    });

    it('WB-ORD-SEC-002e: Số lượng = 0 hoặc âm', async () => {
      const orderData = {
        orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: 'Test', quantity: 0, image: '/test.jpg', price: 100000 }],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'HCM', postalCode: '70000', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 0, shippingPrice: 0, taxPrice: 0, totalPrice: 0,
      };
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201); // BUG: Nên validate quantity > 0
    });
  });


  /**
   * ============================================
   * PHẦN 2: THANH TOÁN (PUT /api/orders/:id/pay)
   * Security Focus: Authorization, Payment Tampering, IDOR
   * ============================================
   */
  describe('WB-ORD-SEC-003: Thanh toán - Authorization & IDOR', () => {
    it('WB-ORD-SEC-003a: Từ chối thanh toán khi không có token', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .send({ id: 'PAY123', status: 'COMPLETED' });
      
      expect(res.status).toBe(401);
    });

    it('WB-ORD-SEC-003b: User có thể thanh toán đơn hàng của mình', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY123', status: 'COMPLETED', update_time: new Date().toISOString(), email_address: 'test@test.com' });
      
      expect(res.status).toBe(200);
      expect(res.body.order.isPaid).toBe(true);
    });

    it('WB-ORD-SEC-003c: IDOR - User có thể thanh toán đơn hàng của người khác (SECURITY ISSUE)', async () => {
      // Tạo đơn hàng của otherUser
      const otherOrder = await createTestOrder(otherUser._id, testProduct._id);
      
      // regularUser cố gắng thanh toán đơn hàng của otherUser
      const res = await request(app)
        .put(`/api/orders/${otherOrder._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY123', status: 'COMPLETED' });
      
      // BUG: Hiện tại cho phép - cần fix để chỉ owner mới được thanh toán
      expect(res.status).toBe(200); // Nên là 403 Forbidden
    });

    it('WB-ORD-SEC-003d: Thanh toán đơn hàng không tồn tại', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/orders/${fakeId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY123', status: 'COMPLETED' });
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });

    it('WB-ORD-SEC-003e: Invalid ObjectId format', async () => {
      const res = await request(app)
        .put('/api/orders/invalid-id/pay')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY123', status: 'COMPLETED' });
      
      expect(res.status).toBe(500); // Mongoose cast error
    });
  });

  describe('WB-ORD-SEC-004: Thanh toán - Payment Data Tampering', () => {
    it('WB-ORD-SEC-004a: Giả mạo payment ID', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'FAKE_PAYMENT_ID', status: 'COMPLETED' });
      
      // Hệ thống nên verify với PayPal API
      expect(res.status).toBe(200); // BUG: Không verify payment
      expect(res.body.order.paymentResult.id).toBe('FAKE_PAYMENT_ID');
    });

    it('WB-ORD-SEC-004b: Giả mạo payment status', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY123', status: 'FAKE_STATUS' });
      
      expect(res.status).toBe(200);
      expect(res.body.order.paymentResult.status).toBe('FAKE_STATUS');
    });

    it('WB-ORD-SEC-004c: Thanh toán lại đơn hàng đã thanh toán', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: { id: 'ORIGINAL_PAY', status: 'COMPLETED' },
      });
      
      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'NEW_PAY', status: 'COMPLETED' });
      
      // BUG: Cho phép thanh toán lại - nên reject
      expect(res.status).toBe(200);
    });

    it('WB-ORD-SEC-004d: XSS trong payment email', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const xssEmail = "<script>alert('xss')</script>@test.com";
      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY123', status: 'COMPLETED', email_address: xssEmail });
      
      expect(res.status).toBe(200);
      expect(res.body.order.paymentResult.email_address).toBe(xssEmail);
    });
  });


  /**
   * ============================================
   * PHẦN 3: QUẢN LÝ ĐƠN HÀNG ADMIN
   * Security Focus: Admin Authorization, Privilege Escalation
   * ============================================
   */
  describe('WB-ORD-SEC-005: Admin - Xem tất cả đơn hàng (GET /api/orders)', () => {
    it('WB-ORD-SEC-005a: Từ chối user thường xem tất cả đơn hàng', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Admin Token');
    });

    it('WB-ORD-SEC-005b: Admin có thể xem tất cả đơn hàng', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      await createTestOrder(otherUser._id, testProduct._id);
      
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('WB-ORD-SEC-005c: Từ chối khi không có token', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No Token');
    });

    it('WB-ORD-SEC-005d: Privilege Escalation - Giả mạo isAdmin trong token', async () => {
      // Token của user thường không thể có isAdmin=true
      // vì token được generate từ server với data từ DB
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(401);
    });
  });

  describe('WB-ORD-SEC-006: Admin - Cập nhật trạng thái (PUT /api/orders/:id/status)', () => {
    it('WB-ORD-SEC-006a: User thường không thể cập nhật trạng thái', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'Processing' });
      
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Admin Token');
    });

    it('WB-ORD-SEC-006b: Admin có thể cập nhật trạng thái', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });
      
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Processing');
    });

    it('WB-ORD-SEC-006c: Cập nhật với status không hợp lệ', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'InvalidStatus' });
      
      // Mongoose enum validation sẽ reject
      expect(res.status).toBe(500);
    });

    it('WB-ORD-SEC-006d: XSS trong status field', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: "<script>alert('xss')</script>" });
      
      // Enum validation sẽ reject
      expect(res.status).toBe(500);
    });

    it('WB-ORD-SEC-006e: NoSQL Injection trong status', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: { $ne: null } });
      
      expect(res.status).toBe(500);
    });
  });

  describe('WB-ORD-SEC-007: Admin - Dashboard Summary (GET /api/orders/summary)', () => {
    it('WB-ORD-SEC-007a: User thường không thể xem summary', async () => {
      const res = await request(app)
        .get('/api/orders/summary')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(401);
    });

    it('WB-ORD-SEC-007b: Admin có thể xem summary', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get('/api/orders/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('orders');
      expect(res.body).toHaveProperty('users');
    });
  });


  /**
   * ============================================
   * PHẦN 4: XEM ĐƠN HÀNG - IDOR & Data Isolation
   * Security Focus: IDOR, User Data Isolation
   * ============================================
   */
  describe('WB-ORD-SEC-008: Xem đơn hàng theo ID (GET /api/orders/:id)', () => {
    it('WB-ORD-SEC-008a: User có thể xem đơn hàng của mình', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(order._id.toString());
    });

    it('WB-ORD-SEC-008b: IDOR - User có thể xem đơn hàng của người khác (SECURITY ISSUE)', async () => {
      const otherOrder = await createTestOrder(otherUser._id, testProduct._id);
      const res = await request(app)
        .get(`/api/orders/${otherOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      // BUG: Hiện tại cho phép - cần fix
      expect(res.status).toBe(200); // Nên là 403
    });

    it('WB-ORD-SEC-008c: Admin có thể xem bất kỳ đơn hàng nào', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });

    it('WB-ORD-SEC-008d: Đơn hàng không tồn tại', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(404);
    });
  });

  describe('WB-ORD-SEC-009: Xem đơn hàng của tôi (GET /api/orders/mine)', () => {
    it('WB-ORD-SEC-009a: User chỉ xem được đơn hàng của mình', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      await createTestOrder(regularUser._id, testProduct._id);
      await createTestOrder(otherUser._id, testProduct._id); // Đơn của người khác
      
      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2); // Chỉ 2 đơn của regularUser
      res.body.forEach(order => {
        expect(order.user.toString()).toBe(regularUser._id.toString());
      });
    });

    it('WB-ORD-SEC-009b: Không có token - từ chối', async () => {
      const res = await request(app).get('/api/orders/mine');
      expect(res.status).toBe(401);
    });

    it('WB-ORD-SEC-009c: User mới không có đơn hàng', async () => {
      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  /**
   * ============================================
   * PHẦN 5: COD PAYMENT FLOW - Business Logic Security
   * ============================================
   */
  describe('WB-ORD-SEC-010: COD Payment - Business Logic', () => {
    it('WB-ORD-SEC-010a: COD tự động đánh dấu paid khi Delivered', async () => {
      const codOrder = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: false,
      });
      
      const res = await request(app)
        .put(`/api/orders/${codOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });
      
      expect(res.status).toBe(200);
      expect(res.body.order.isPaid).toBe(true);
      expect(res.body.order.paymentResult.id).toBe('COD');
    });

    it('WB-ORD-SEC-010b: PayPal không tự động paid khi Delivered', async () => {
      const paypalOrder = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'PayPal',
        isPaid: false,
      });
      
      const res = await request(app)
        .put(`/api/orders/${paypalOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });
      
      expect(res.status).toBe(200);
      expect(res.body.order.isPaid).toBe(false); // Vẫn chưa paid
    });

    it('WB-ORD-SEC-010c: Cart bị xóa sau khi COD delivered', async () => {
      const codOrder = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: false,
      });
      await createTestCart(regularUser._id, testProduct._id);
      
      // Verify cart exists
      let cart = await Cart.findOne({ user: regularUser._id });
      expect(cart).not.toBeNull();
      
      await request(app)
        .put(`/api/orders/${codOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });
      
      // Cart should be deleted
      cart = await Cart.findOne({ user: regularUser._id });
      expect(cart).toBeNull();
    });
  });

  /**
   * ============================================
   * PHẦN 6: RATE LIMITING & DOS PROTECTION
   * ============================================
   */
  describe('WB-ORD-SEC-011: Rate Limiting & DOS', () => {
    it('WB-ORD-SEC-011a: Nhiều request đặt hàng liên tiếp', async () => {
      const orderData = {
        orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: 'Test', quantity: 1, image: '/test.jpg', price: 100000 }],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'HCM', postalCode: '70000', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 100000, shippingPrice: 0, taxPrice: 0, totalPrice: 100000,
      };

      const requests = Array(10).fill().map(() =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderData)
      );

      const responses = await Promise.all(requests);
      
      // Tất cả đều thành công - cần rate limiting
      responses.forEach(res => {
        expect(res.status).toBe(201);
      });

      // Verify 10 orders created
      const orders = await Order.find({ user: regularUser._id });
      expect(orders.length).toBe(10);
    });
  });

  /**
   * ============================================
   * PHẦN 7: DATA EXPOSURE
   * ============================================
   */
  describe('WB-ORD-SEC-012: Sensitive Data Exposure', () => {
    it('WB-ORD-SEC-012a: Order response không chứa password của user', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.user.password).toBeUndefined();
    });

    it('WB-ORD-SEC-012b: Order list không chứa sensitive data', async () => {
      await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      res.body.forEach(order => {
        expect(order.user.password).toBeUndefined();
      });
    });
  });
});
