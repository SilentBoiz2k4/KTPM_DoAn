import request from 'supertest';
import createApp from '../../app.js';
import {
  setupIntegrationDB,
  generateTestToken,
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder,
  mockOrderPayload,
} from './setup.js';

const app = createApp();

// Setup test database
setupIntegrationDB();

describe('Order API Integration Tests', () => {
  let testUser;
  let adminUser;
  let testProduct;
  let userToken;
  let adminToken;

  beforeEach(async () => {
    testUser = await createTestUser();
    adminUser = await createAdminUser();
    testProduct = await createTestProduct();
    userToken = generateTestToken(testUser);
    adminToken = generateTestToken(adminUser);
  });

  describe('POST /api/orders - Tạo đơn hàng', () => {
    it('TC-INT-ORD-001: Tạo đơn hàng thành công với user đã đăng nhập', async () => {
      const orderPayload = mockOrderPayload(testProduct._id);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('New Order Created');
      expect(res.body.order).toBeDefined();
      expect(res.body.order.totalPrice).toBe(250000);
      expect(res.body.order.isPaid).toBe(false);
      expect(res.body.order.status).toBe('Pending');
    });

    it('TC-INT-ORD-002: Từ chối tạo đơn hàng khi chưa đăng nhập', async () => {
      const orderPayload = mockOrderPayload(testProduct._id);

      const res = await request(app)
        .post('/api/orders')
        .send(orderPayload);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No Token');
    });


    it('TC-INT-ORD-003: Từ chối tạo đơn hàng với token không hợp lệ', async () => {
      const orderPayload = mockOrderPayload(testProduct._id);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', 'Bearer invalid-token')
        .send(orderPayload);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Token');
    });

    it('TC-INT-ORD-004: Tạo đơn hàng COD thành công', async () => {
      const orderPayload = {
        ...mockOrderPayload(testProduct._id),
        paymentMethod: 'COD',
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.order.paymentMethod).toBe('COD');
      expect(res.body.order.isPaid).toBe(false);
    });

    it('TC-INT-ORD-005: Tạo đơn hàng với nhiều sản phẩm', async () => {
      const product2 = await createTestProduct({ name: 'Product 2', slug: 'product-2' });
      
      const orderPayload = {
        orderItems: [
          {
            _id: testProduct._id.toString(),
            slug: testProduct.slug,
            name: testProduct.name,
            quantity: 1,
            image: testProduct.image,
            price: testProduct.price,
          },
          {
            _id: product2._id.toString(),
            slug: product2.slug,
            name: product2.name,
            quantity: 2,
            image: product2.image,
            price: product2.price,
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
        itemsPrice: 300000,
        shippingPrice: 30000,
        taxPrice: 30000,
        totalPrice: 360000,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(res.status).toBe(201);
      expect(res.body.order.orderItems).toHaveLength(2);
      expect(res.body.order.totalPrice).toBe(360000);
    });
  });

  describe('GET /api/orders/:id - Lấy chi tiết đơn hàng', () => {
    it('TC-INT-ORD-006: Lấy chi tiết đơn hàng thành công', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(order._id.toString());
      expect(res.body.totalPrice).toBe(250000);
    });

    it('TC-INT-ORD-007: Trả về 404 khi đơn hàng không tồn tại', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });

    it('TC-INT-ORD-008: Từ chối truy cập khi chưa đăng nhập', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .get(`/api/orders/${order._id}`);

      expect(res.status).toBe(401);
    });
  });


  describe('GET /api/orders/mine - Lấy danh sách đơn hàng của user', () => {
    it('TC-INT-ORD-009: Lấy danh sách đơn hàng của user thành công', async () => {
      await createTestOrder(testUser._id, testProduct._id);
      await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('TC-INT-ORD-010: Trả về mảng rỗng khi user chưa có đơn hàng', async () => {
      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('TC-INT-ORD-011: Chỉ trả về đơn hàng của user hiện tại', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      await createTestOrder(testUser._id, testProduct._id);
      await createTestOrder(otherUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/orders - Admin lấy tất cả đơn hàng', () => {
    it('TC-INT-ORD-012: Admin lấy tất cả đơn hàng thành công', async () => {
      await createTestOrder(testUser._id, testProduct._id);
      await createTestOrder(adminUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('TC-INT-ORD-013: User thường không thể truy cập danh sách tất cả đơn hàng', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Admin Token');
    });
  });

  describe('PUT /api/orders/:id/pay - Thanh toán đơn hàng', () => {
    it('TC-INT-ORD-014: Thanh toán PayPal thành công', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const paymentResult = {
        id: 'PAYPAL_TXN_123456',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'buyer@example.com',
      };

      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentResult);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Order Paid');
      expect(res.body.order.isPaid).toBe(true);
      expect(res.body.order.paymentResult.id).toBe('PAYPAL_TXN_123456');
    });

    it('TC-INT-ORD-015: Trả về 404 khi thanh toán đơn hàng không tồn tại', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`/api/orders/${fakeId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'test', status: 'COMPLETED' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });
  });


  describe('PUT /api/orders/:id/status - Admin cập nhật trạng thái đơn hàng', () => {
    it('TC-INT-ORD-016: Admin cập nhật trạng thái sang Processing', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Processing');
    });

    it('TC-INT-ORD-017: Admin cập nhật trạng thái sang Shipping', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipping' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Shipping');
    });

    it('TC-INT-ORD-018: Admin cập nhật trạng thái sang Delivered', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id, {
        isPaid: true,
        paidAt: Date.now(),
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Delivered');
      expect(res.body.order.isDelivered).toBe(true);
    });

    it('TC-INT-ORD-019: Admin cập nhật trạng thái sang Cancelled', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Cancelled');
    });

    it('TC-INT-ORD-020: COD được đánh dấu đã thanh toán khi Delivered', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: false,
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Delivered');
      expect(res.body.order.isPaid).toBe(true);
      expect(res.body.order.paymentResult.id).toBe('COD');
    });

    it('TC-INT-ORD-021: User thường không thể cập nhật trạng thái đơn hàng', async () => {
      const order = await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Admin Token');
    });

    it('TC-INT-ORD-022: Trả về 404 khi cập nhật đơn hàng không tồn tại', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`/api/orders/${fakeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });
  });

  describe('GET /api/orders/summary - Admin xem thống kê', () => {
    it('TC-INT-ORD-023: Admin xem thống kê đơn hàng thành công', async () => {
      await createTestOrder(testUser._id, testProduct._id);
      await createTestOrder(testUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/orders/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.orders).toBeDefined();
      expect(res.body.users).toBeDefined();
    });

    it('TC-INT-ORD-024: User thường không thể xem thống kê', async () => {
      const res = await request(app)
        .get('/api/orders/summary')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(401);
    });
  });
});
