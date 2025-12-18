/**
 * E2E TESTS - Error Scenarios
 * 
 * Test các kịch bản lỗi và edge cases:
 * - Unauthorized access
 * - Invalid data
 * - Not found resources
 * - Permission denied
 */

import request from 'supertest';
import createApp from '../../app.js';
import {
  setupE2EDB,
  cleanDatabase,
  createUser,
  createAdmin,
  createProduct,
} from './setup.js';

const app = createApp();

setupE2EDB();

describe('E2E: Error Scenarios', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('E2E-ERR-001: Authentication Errors', () => {
    it('should reject all cart operations without token', async () => {
      // GET cart
      const getRes = await request(app).get('/api/cart');
      expect(getRes.status).toBe(401);
      expect(getRes.body.message).toBe('No Token');

      // POST cart
      const postRes = await request(app)
        .post('/api/cart')
        .send({ cartItems: [] });
      expect(postRes.status).toBe(401);

      // DELETE cart
      const deleteRes = await request(app).delete('/api/cart');
      expect(deleteRes.status).toBe(401);
    });

    it('should reject all order operations without token', async () => {
      // Create order
      const createRes = await request(app)
        .post('/api/orders')
        .send({});
      expect(createRes.status).toBe(401);

      // Get orders
      const getRes = await request(app).get('/api/orders/mine');
      expect(getRes.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Token');
    });

    it('should reject with expired token', async () => {
      const jwt = await import('jsonwebtoken');
      const expiredToken = jwt.default.sign(
        { _id: '123', name: 'Test', email: 'test@test.com', isAdmin: false },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Token');
    });
  });

  describe('E2E-ERR-002: Authorization Errors', () => {
    it('should deny regular user access to admin endpoints', async () => {
      const { token: userToken } = await createUser();

      // Get all orders (admin only)
      const allOrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`);
      expect(allOrdersRes.status).toBe(401);
      expect(allOrdersRes.body.message).toBe('Invalid Admin Token');

      // Get summary (admin only)
      const summaryRes = await request(app)
        .get('/api/orders/summary')
        .set('Authorization', `Bearer ${userToken}`);
      expect(summaryRes.status).toBe(401);
    });

    it('should deny user from updating order status', async () => {
      const { token: userToken } = await createUser();
      const product = await createProduct();

      // Create order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{
            _id: product._id.toString(),
            slug: product.slug,
            name: product.name,
            quantity: 1,
            image: product.image,
            price: product.price,
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

      const orderId = orderRes.body.order._id;

      // Try to update status (should fail)
      const updateRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'Delivered' });

      expect(updateRes.status).toBe(401);
      expect(updateRes.body.message).toBe('Invalid Admin Token');
    });
  });


  describe('E2E-ERR-003: Not Found Errors', () => {
    it('should return 404 for non-existent order', async () => {
      const { token } = await createUser();
      const fakeOrderId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/orders/${fakeOrderId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });

    it('should return 404 when paying non-existent order', async () => {
      const { token } = await createUser();
      const fakeOrderId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`/api/orders/${fakeOrderId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 'PAY-123',
          status: 'COMPLETED',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });

    it('should return 404 when updating status of non-existent order', async () => {
      const { token: adminToken } = await createAdmin();
      const fakeOrderId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .put(`/api/orders/${fakeOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Order Not Found');
    });
  });

  describe('E2E-ERR-004: Invalid Data Errors', () => {
    it('should handle invalid order ID format', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get('/api/orders/invalid-id-format')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
    });
  });

  describe('E2E-ERR-005: Edge Cases', () => {
    it('should handle empty cart checkout attempt', async () => {
      const { token } = await createUser();

      // Get empty cart
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(cartRes.body.cartItems).toHaveLength(0);
    });

    it('should handle clearing already empty cart', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Cart already empty');
    });

    it('should handle user with no orders', async () => {
      const { token } = await createUser();

      const res = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('should isolate orders between users', async () => {
      const { token: user1Token } = await createUser({ email: 'user1@test.com' });
      const { token: user2Token } = await createUser({ email: 'user2@test.com' });
      const product = await createProduct();

      // User 1 creates order
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          orderItems: [{
            _id: product._id.toString(),
            slug: product.slug,
            name: product.name,
            quantity: 1,
            image: product.image,
            price: product.price,
          }],
          shippingAddress: {
            fullName: 'User 1',
            address: 'Address 1',
            city: 'City',
            postalCode: '12345',
            country: 'VN',
          },
          paymentMethod: 'PayPal',
          itemsPrice: 100000,
          shippingPrice: 30000,
          taxPrice: 10000,
          totalPrice: 140000,
        });

      // User 2 should see no orders
      const user2OrdersRes = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2OrdersRes.body).toHaveLength(0);

      // User 1 should see 1 order
      const user1OrdersRes = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1OrdersRes.body).toHaveLength(1);
    });

    it('should isolate carts between users', async () => {
      const { token: user1Token } = await createUser({ email: 'cart1@test.com' });
      const { token: user2Token } = await createUser({ email: 'cart2@test.com' });
      const product = await createProduct();

      // User 1 adds to cart
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          cartItems: [{
            _id: product._id.toString(),
            name: product.name,
            slug: product.slug,
            image: product.image,
            price: product.price,
            quantity: 5,
            countInStock: product.countInStock,
          }],
        });

      // User 2's cart should be empty
      const user2CartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2CartRes.body.cartItems).toHaveLength(0);

      // User 1's cart should have items
      const user1CartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(user1CartRes.body.cartItems).toHaveLength(1);
      expect(user1CartRes.body.cartItems[0].quantity).toBe(5);
    });
  });
});
