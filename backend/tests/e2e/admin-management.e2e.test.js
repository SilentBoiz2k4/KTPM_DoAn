/**
 * E2E TESTS - Admin Order Management
 * 
 * Test các kịch bản quản lý đơn hàng của Admin:
 * - Xem và quản lý tất cả đơn hàng
 * - Xử lý đơn hàng theo quy trình
 * - Xem thống kê và báo cáo
 */

import request from 'supertest';
import createApp from '../../app.js';
import {
  setupE2EDB,
  cleanDatabase,
  createUser,
  createAdmin,
  createProduct,
  createProducts,
} from './setup.js';

const app = createApp();

setupE2EDB();

describe('E2E: Admin Order Management', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('E2E-ADMIN-001: Order Processing Workflow', () => {
    it('should handle complete admin order processing workflow', async () => {
      // Setup: Create users and orders
      const { token: user1Token } = await createUser({ email: 'user1@test.com' });
      const { token: user2Token } = await createUser({ email: 'user2@test.com' });
      const { token: adminToken } = await createAdmin();
      const products = await createProducts(3);

      // Create orders from different users
      const order1Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          orderItems: [{
            _id: products[0]._id.toString(),
            slug: products[0].slug,
            name: products[0].name,
            quantity: 1,
            image: products[0].image,
            price: products[0].price,
          }],
          shippingAddress: {
            fullName: 'User 1',
            address: '111 User1 St',
            city: 'HCMC',
            postalCode: '70000',
            country: 'Vietnam',
          },
          paymentMethod: 'PayPal',
          itemsPrice: products[0].price,
          shippingPrice: 30000,
          taxPrice: 10000,
          totalPrice: products[0].price + 40000,
        });

      const order2Res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          orderItems: [{
            _id: products[1]._id.toString(),
            slug: products[1].slug,
            name: products[1].name,
            quantity: 2,
            image: products[1].image,
            price: products[1].price,
          }],
          shippingAddress: {
            fullName: 'User 2',
            address: '222 User2 St',
            city: 'Hanoi',
            postalCode: '10000',
            country: 'Vietnam',
          },
          paymentMethod: 'COD',
          itemsPrice: products[1].price * 2,
          shippingPrice: 30000,
          taxPrice: 20000,
          totalPrice: products[1].price * 2 + 50000,
        });

      const order1Id = order1Res.body.order._id;
      const order2Id = order2Res.body.order._id;

      // Admin views all orders
      const allOrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allOrdersRes.status).toBe(200);
      expect(allOrdersRes.body).toHaveLength(2);

      // User 1 pays with PayPal
      await request(app)
        .put(`/api/orders/${order1Id}/pay`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          id: 'PAYPAL-ADMIN-TEST-001',
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: 'user1@test.com',
        });

      // Admin processes Order 1 (PayPal - already paid)
      await request(app)
        .put(`/api/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      await request(app)
        .put(`/api/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipping' });

      const deliver1Res = await request(app)
        .put(`/api/orders/${order1Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(deliver1Res.body.order.status).toBe('Delivered');
      expect(deliver1Res.body.order.isDelivered).toBe(true);

      // Admin processes Order 2 (COD - paid on delivery)
      await request(app)
        .put(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      await request(app)
        .put(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipping' });

      const deliver2Res = await request(app)
        .put(`/api/orders/${order2Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(deliver2Res.body.order.status).toBe('Delivered');
      expect(deliver2Res.body.order.isPaid).toBe(true); // COD paid on delivery
    });
  });


  describe('E2E-ADMIN-002: Dashboard Statistics', () => {
    it('should provide accurate dashboard statistics', async () => {
      // Setup: Create multiple orders
      const { token: userToken } = await createUser();
      const { token: adminToken } = await createAdmin();
      const products = await createProducts(3);

      // Create 3 orders with different values
      for (let i = 0; i < 3; i++) {
        const orderRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            orderItems: [{
              _id: products[i]._id.toString(),
              slug: products[i].slug,
              name: products[i].name,
              quantity: i + 1,
              image: products[i].image,
              price: products[i].price,
            }],
            shippingAddress: {
              fullName: `Stats User ${i}`,
              address: `${i}00 Stats St`,
              city: 'HCMC',
              postalCode: '70000',
              country: 'Vietnam',
            },
            paymentMethod: 'PayPal',
            itemsPrice: products[i].price * (i + 1),
            shippingPrice: 30000,
            taxPrice: 10000,
            totalPrice: products[i].price * (i + 1) + 40000,
          });

        // Pay for the order
        await request(app)
          .put(`/api/orders/${orderRes.body.order._id}/pay`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            id: `STATS-PAY-${i}`,
            status: 'COMPLETED',
            update_time: new Date().toISOString(),
            email_address: 'stats@test.com',
          });
      }

      // Admin checks summary
      const summaryRes = await request(app)
        .get('/api/orders/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.orders).toBeDefined();
      expect(summaryRes.body.users).toBeDefined();

      // Should have 3 orders
      if (summaryRes.body.orders.length > 0) {
        expect(summaryRes.body.orders[0].numOrders).toBe(3);
      }
    });
  });

  describe('E2E-ADMIN-003: Bulk Order Management', () => {
    it('should handle multiple orders efficiently', async () => {
      const { token: adminToken } = await createAdmin();
      const products = await createProducts(2);
      const orderIds = [];

      // Create 5 orders from different users
      for (let i = 0; i < 5; i++) {
        const { token: userToken } = await createUser({ email: `bulk${i}@test.com` });

        const orderRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            orderItems: [{
              _id: products[i % 2]._id.toString(),
              slug: products[i % 2].slug,
              name: products[i % 2].name,
              quantity: 1,
              image: products[i % 2].image,
              price: products[i % 2].price,
            }],
            shippingAddress: {
              fullName: `Bulk User ${i}`,
              address: `${i}00 Bulk St`,
              city: 'HCMC',
              postalCode: '70000',
              country: 'Vietnam',
            },
            paymentMethod: i % 2 === 0 ? 'PayPal' : 'COD',
            itemsPrice: products[i % 2].price,
            shippingPrice: 30000,
            taxPrice: 10000,
            totalPrice: products[i % 2].price + 40000,
          });

        orderIds.push(orderRes.body.order._id);
      }

      // Admin views all orders
      const allOrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allOrdersRes.body).toHaveLength(5);

      // Admin processes all orders to Processing
      for (const orderId of orderIds) {
        await request(app)
          .put(`/api/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'Processing' });
      }

      // Verify all are Processing
      const processingOrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      const processingCount = processingOrdersRes.body.filter(
        (o) => o.status === 'Processing'
      ).length;
      expect(processingCount).toBe(5);
    });
  });

  describe('E2E-ADMIN-004: Order Detail View', () => {
    it('should show complete order details to admin', async () => {
      const { user, token: userToken } = await createUser({
        name: 'Detail Test User',
        email: 'detail@test.com',
      });
      const { token: adminToken } = await createAdmin();
      const product = await createProduct({ price: 250000 });

      // Create order with full details
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{
            _id: product._id.toString(),
            slug: product.slug,
            name: product.name,
            quantity: 2,
            image: product.image,
            price: product.price,
          }],
          shippingAddress: {
            fullName: 'Detail Test User',
            address: '123 Detail Street, District 1',
            city: 'Ho Chi Minh City',
            postalCode: '70000',
            country: 'Vietnam',
          },
          paymentMethod: 'PayPal',
          itemsPrice: 500000,
          shippingPrice: 0,
          taxPrice: 50000,
          totalPrice: 550000,
        });

      const orderId = orderRes.body.order._id;

      // Pay the order
      await request(app)
        .put(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          id: 'DETAIL-PAY-001',
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: 'detail@test.com',
        });

      // Admin views order detail
      const detailRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.orderItems).toHaveLength(1);
      expect(detailRes.body.orderItems[0].quantity).toBe(2);
      expect(detailRes.body.shippingAddress.fullName).toBe('Detail Test User');
      expect(detailRes.body.paymentMethod).toBe('PayPal');
      expect(detailRes.body.totalPrice).toBe(550000);
      expect(detailRes.body.isPaid).toBe(true);
      expect(detailRes.body.paymentResult.id).toBe('DETAIL-PAY-001');
      expect(detailRes.body.user).toBeDefined();
    });
  });
});
