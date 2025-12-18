/**
 * White-box Testing - Order Routes
 * Kiểm thử hộp trắng: Statement, Branch, Path, Condition Coverage
 */

import request from 'supertest';
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

describe('White-box Testing - Order Routes', () => {
  let adminUser, regularUser, testProduct, adminToken, userToken;

  beforeEach(async () => {
    adminUser = await createAdminUser();
    regularUser = await createTestUser();
    testProduct = await createTestProduct();
    adminToken = generateTestToken(adminUser);
    userToken = generateTestToken(regularUser);
  });

  /**
   * Statement Coverage - GET /api/orders/:id
   * Line 91-97: if (order) { ... } else { ... }
   */
  describe('Statement Coverage - GET /:id', () => {
    it('WB-001: Should execute if-branch when order exists', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(order._id.toString());
    });

    it('WB-002: Should execute else-branch when order not found', async () => {
      const res = await request(app)
        .get('/api/orders/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });
  });

  /**
   * Branch Coverage - PUT /api/orders/:id/pay
   * Line 101-119: if (order) { ... } else { ... }
   */
  describe('Branch Coverage - PUT /:id/pay', () => {
    it('WB-003: Should execute payment success branch', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      await createTestCart(regularUser._id, testProduct._id);
      
      const paymentResult = {
        id: 'PAY-123',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'test@test.com',
      };

      const res = await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentResult);

      expect(res.status).toBe(200);
      expect(res.body.order.isPaid).toBe(true);
      expect(res.body.order.paymentResult.id).toBe('PAY-123');
    });

    it('WB-004: Should execute order not found branch', async () => {
      const res = await request(app)
        .put('/api/orders/507f1f77bcf86cd799439011/pay')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY-123', status: 'COMPLETED' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });

    it('WB-005: Should clear cart after payment', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      await createTestCart(regularUser._id, testProduct._id);

      // Verify cart exists before payment
      let cart = await Cart.findOne({ user: regularUser._id });
      expect(cart).not.toBeNull();

      await request(app)
        .put(`/api/orders/${order._id}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ id: 'PAY-123', status: 'COMPLETED' });

      // Verify cart is deleted after payment
      cart = await Cart.findOne({ user: regularUser._id });
      expect(cart).toBeNull();
    });
  });

  /**
   * Path Coverage - PUT /api/orders/:id/status
   * Multiple paths based on status and payment method
   */
  describe('Path Coverage - PUT /:id/status', () => {
    // Path 1: Order not found
    it('WB-006: Path - Order not found', async () => {
      const res = await request(app)
        .put('/api/orders/507f1f77bcf86cd799439011/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(404);
    });

    // Path 2: Update to Processing (not Delivered, not Cancelled)
    it('WB-007: Path - Update to Processing', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Processing');
      expect(res.body.order.isDelivered).toBe(false);
    });

    // Path 3: Update to Shipping (not Delivered, not Cancelled)
    it('WB-008: Path - Update to Shipping', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);
      
      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipping' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Shipping');
    });

    // Path 4: Update to Delivered with PayPal (already paid)
    it('WB-009: Path - Delivered with PayPal (already paid)', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'PayPal',
        isPaid: true,
        paidAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Delivered');
      expect(res.body.order.isDelivered).toBe(true);
      expect(res.body.order.deliveredAt).toBeDefined();
    });

    // Path 5: Update to Delivered with COD (not paid) - should mark as paid
    it('WB-010: Path - Delivered with COD (marks as paid)', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: false,
      });
      await createTestCart(regularUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Delivered');
      expect(res.body.order.isDelivered).toBe(true);
      expect(res.body.order.isPaid).toBe(true);
      expect(res.body.order.paymentResult.id).toBe('COD');
    });

    // Path 6: Update to Delivered with COD (already paid)
    it('WB-011: Path - Delivered with COD (already paid)', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: true,
        paidAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.status).toBe(200);
      expect(res.body.order.isDelivered).toBe(true);
    });

    // Path 7: Update to Cancelled
    it('WB-012: Path - Update to Cancelled', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id);

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('Cancelled');
    });
  });

  /**
   * Condition Coverage - Complex conditions in status update
   * Line 137: if (order.paymentMethod === 'COD' && !order.isPaid)
   */
  describe('Condition Coverage - COD Payment Logic', () => {
    // Condition: paymentMethod === 'COD' (true) && !isPaid (true)
    it('WB-013: COD=true, isPaid=false -> should mark as paid', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: false,
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.body.order.isPaid).toBe(true);
    });

    // Condition: paymentMethod === 'COD' (true) && !isPaid (false)
    it('WB-014: COD=true, isPaid=true -> should not change payment', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'COD',
        isPaid: true,
        paidAt: new Date(),
        paymentResult: { id: 'EXISTING', status: 'PAID' },
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      // Payment result should remain unchanged
      expect(res.body.order.isPaid).toBe(true);
    });

    // Condition: paymentMethod === 'COD' (false) && !isPaid (true)
    it('WB-015: PayPal, isPaid=false -> should not auto-mark as paid', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'PayPal',
        isPaid: false,
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      // PayPal orders should not be auto-marked as paid on delivery
      expect(res.body.order.isPaid).toBe(false);
    });

    // Condition: paymentMethod === 'COD' (false) && !isPaid (false)
    it('WB-016: PayPal, isPaid=true -> normal delivery', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        paymentMethod: 'PayPal',
        isPaid: true,
        paidAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(res.body.order.isDelivered).toBe(true);
      expect(res.body.order.isPaid).toBe(true);
    });
  });

  /**
   * Loop Coverage - Order items mapping in POST /api/orders
   */
  describe('Loop Coverage - Order Creation', () => {
    it('WB-017: Create order with single item', async () => {
      const orderData = {
        orderItems: [
          { _id: testProduct._id.toString(), slug: 'p1', name: 'P1', quantity: 1, image: '/p1.jpg', price: 100 },
        ],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'City', postalCode: '12345', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 100,
        shippingPrice: 10,
        taxPrice: 10,
        totalPrice: 120,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.order.orderItems).toHaveLength(1);
    });

    it('WB-018: Create order with multiple items', async () => {
      const product2 = await createTestProduct({ name: 'P2', slug: 'p2' });
      const product3 = await createTestProduct({ name: 'P3', slug: 'p3' });

      const orderData = {
        orderItems: [
          { _id: testProduct._id.toString(), slug: 'p1', name: 'P1', quantity: 2, image: '/p1.jpg', price: 100 },
          { _id: product2._id.toString(), slug: 'p2', name: 'P2', quantity: 1, image: '/p2.jpg', price: 200 },
          { _id: product3._id.toString(), slug: 'p3', name: 'P3', quantity: 3, image: '/p3.jpg', price: 50 },
        ],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'City', postalCode: '12345', country: 'VN' },
        paymentMethod: 'COD',
        itemsPrice: 550,
        shippingPrice: 20,
        taxPrice: 55,
        totalPrice: 625,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.order.orderItems).toHaveLength(3);
    });
  });

  /**
   * Boundary Testing
   */
  describe('Boundary Testing', () => {
    it('WB-019: Order with minimum price (0)', async () => {
      const orderData = {
        orderItems: [
          { _id: testProduct._id.toString(), slug: 'free', name: 'Free Item', quantity: 1, image: '/free.jpg', price: 0 },
        ],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'City', postalCode: '12345', country: 'VN' },
        paymentMethod: 'PayPal',
        itemsPrice: 0,
        shippingPrice: 0,
        taxPrice: 0,
        totalPrice: 0,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.order.totalPrice).toBe(0);
    });

    it('WB-020: Order with high quantity', async () => {
      const orderData = {
        orderItems: [
          { _id: testProduct._id.toString(), slug: 'bulk', name: 'Bulk Item', quantity: 9999, image: '/bulk.jpg', price: 1 },
        ],
        shippingAddress: { fullName: 'Test', address: '123 St', city: 'City', postalCode: '12345', country: 'VN' },
        paymentMethod: 'COD',
        itemsPrice: 9999,
        shippingPrice: 100,
        taxPrice: 999,
        totalPrice: 11098,
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.order.orderItems[0].quantity).toBe(9999);
    });
  });
});
