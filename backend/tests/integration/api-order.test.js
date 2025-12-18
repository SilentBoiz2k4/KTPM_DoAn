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
} from './setup.js';

const app = createApp();
setupIntegrationDB();

describe('API Order Tests', () => {
  let adminUser, regularUser, testProduct, adminToken, userToken;

  beforeEach(async () => {
    adminUser = await createAdminUser();
    regularUser = await createTestUser();
    testProduct = await createTestProduct();
    adminToken = generateTestToken(adminUser);
    userToken = generateTestToken(regularUser);
  });

  test('TC_API_001: Admin gets all orders', async () => {
    await createTestOrder(regularUser._id, testProduct._id);
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('TC_API_002: No token rejected', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  test('TC_API_003: Non-admin rejected', async () => {
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(401);
  });

  test('TC_API_004: Get order by ID', async () => {
    const order = await createTestOrder(regularUser._id, testProduct._id);
    const res = await request(app).get(`/api/orders/${order._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('TC_API_005: Get non-existent order', async () => {
    const res = await request(app).get('/api/orders/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('TC_API_006: Get my orders', async () => {
    await createTestOrder(regularUser._id, testProduct._id);
    const res = await request(app).get('/api/orders/mine').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  test('TC_API_007: Admin gets summary', async () => {
    const res = await request(app).get('/api/orders/summary').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
  });

  test('TC_API_008: Create order', async () => {
    const orderData = {
      orderItems: [{ _id: testProduct._id.toString(), slug: 'test', name: 'Test', quantity: 1, image: '/test.jpg', price: 100 }],
      shippingAddress: { fullName: 'Test', address: '123 St', city: 'City', postalCode: '12345', country: 'VN' },
      paymentMethod: 'PayPal', itemsPrice: 100, shippingPrice: 10, taxPrice: 10, totalPrice: 120,
    };
    const res = await request(app).post('/api/orders').set('Authorization', `Bearer ${userToken}`).send(orderData);
    expect(res.status).toBe(201);
  });

  test('TC_API_009: Pay order', async () => {
    const order = await createTestOrder(regularUser._id, testProduct._id);
    await createTestCart(regularUser._id, testProduct._id);
    const paymentResult = { id: 'PAY123', status: 'COMPLETED', update_time: new Date().toISOString(), email_address: 'test@test.com' };
    const res = await request(app).put(`/api/orders/${order._id}/pay`).set('Authorization', `Bearer ${userToken}`).send(paymentResult);
    expect(res.status).toBe(200);
    expect(res.body.order.isPaid).toBe(true);
  });

  test('TC_API_010: Update order status', async () => {
    const order = await createTestOrder(regularUser._id, testProduct._id);
    const res = await request(app).put(`/api/orders/${order._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Processing' });
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('Processing');
  });

  test('TC_API_011: Deliver COD order marks as paid', async () => {
    const codOrder = await createTestOrder(regularUser._id, testProduct._id, { paymentMethod: 'COD' });
    await createTestCart(regularUser._id, testProduct._id);
    const res = await request(app).put(`/api/orders/${codOrder._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'Delivered' });
    expect(res.status).toBe(200);
    expect(res.body.order.isPaid).toBe(true);
  });

  test('TC_API_012: Non-admin cannot update status', async () => {
    const order = await createTestOrder(regularUser._id, testProduct._id);
    const res = await request(app).put(`/api/orders/${order._id}/status`).set('Authorization', `Bearer ${userToken}`).send({ status: 'Processing' });
    expect(res.status).toBe(401);
  });
});
