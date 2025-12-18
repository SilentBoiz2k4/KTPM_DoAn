import request from 'supertest';
import createApp from '../../app.js';
import Order from '../../models/orderModel.js';
import {
  setupIntegrationDB,
  generateTestToken,
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder,
} from '../integration/setup.js';

const app = createApp();
setupIntegrationDB();

const measureTime = async (fn) => {
  const start = Date.now();
  await fn();
  return Date.now() - start;
};

describe('Performance Testing - Order Management', () => {
  let adminUser, regularUser, testProduct, adminToken;

  beforeEach(async () => {
    adminUser = await createAdminUser();
    regularUser = await createTestUser();
    testProduct = await createTestProduct();
    adminToken = generateTestToken(adminUser);
  });

  const createOrders = async (count) => {
    for (let i = 0; i < count; i++) {
      await createTestOrder(regularUser._id, testProduct._id);
    }
  };

  describe('API Response Times', () => {
    it('TC_PERF_001-008: API responses within thresholds', async () => {
      await createOrders(10);
      const order = await Order.findOne();

      let time = await measureTime(() => request(app).get('/api/orders').set('Authorization', `Bearer ${adminToken}`));
      expect(time).toBeLessThan(2000);

      time = await measureTime(() => request(app).get(`/api/orders/${order._id}`).set('Authorization', `Bearer ${adminToken}`));
      expect(time).toBeLessThan(1000);

      time = await measureTime(() => request(app).put(`/api/orders/${order._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Processing' }));
      expect(time).toBeLessThan(2000);

      time = await measureTime(() => request(app).get('/api/orders/summary').set('Authorization', `Bearer ${adminToken}`));
      expect(time).toBeLessThan(2000);
    });
  });

  describe('Concurrent Requests', () => {
    it('TC_PERF_009-011: Handle concurrent requests', async () => {
      await createOrders(5);

      const requests = Array(3).fill().map(() => request(app).get('/api/orders').set('Authorization', `Bearer ${adminToken}`));
      const start = Date.now();
      const responses = await Promise.all(requests);
      expect(Date.now() - start).toBeLessThan(5000);
      responses.forEach(res => expect(res.status).toBe(200));
    });
  });

  describe('Database Performance', () => {
    it('TC_PERF_012-014: Database operations efficient', async () => {
      await createOrders(10);

      let time = await measureTime(() => Order.find().limit(5));
      expect(time).toBeLessThan(1000);

      time = await measureTime(() => Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]));
      expect(time).toBeLessThan(2000);
    });
  });

  describe('Filtering and Pagination', () => {
    it('TC_PERF_017-019: Filter, sort, paginate efficiently', async () => {
      await createOrders(10);

      let time = await measureTime(() => Order.find({ status: 'Pending' }));
      expect(time).toBeLessThan(1000);

      time = await measureTime(() => Order.find().sort({ createdAt: -1 }));
      expect(time).toBeLessThan(1000);

      time = await measureTime(() => Order.find().skip(2).limit(3));
      expect(time).toBeLessThan(1000);
    });
  });
});
