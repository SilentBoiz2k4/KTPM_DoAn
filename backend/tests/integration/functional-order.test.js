import mongoose from 'mongoose';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
import {
  setupIntegrationDB,
  createTestUser,
  createAdminUser,
  createTestProduct,
  createTestOrder,
} from './setup.js';

setupIntegrationDB();

describe('Functional Testing - Order Management', () => {
  let adminUser, regularUser, testProduct;

  beforeEach(async () => {
    adminUser = await createAdminUser();
    regularUser = await createTestUser();
    testProduct = await createTestProduct();
  });

  describe('Order Status Transitions', () => {
    it('TC_FUNC_004-008: Status transitions work correctly', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, { status: 'Pending' });

      order.status = 'Processing';
      await order.save();
      expect(order.status).toBe('Processing');

      order.status = 'Shipping';
      await order.save();
      expect(order.status).toBe('Shipping');

      order.status = 'Delivered';
      order.isDelivered = true;
      order.deliveredAt = new Date();
      await order.save();
      expect(order.status).toBe('Delivered');
      expect(order.isDelivered).toBe(true);

      const order2 = await createTestOrder(regularUser._id, testProduct._id);
      order2.status = 'Cancelled';
      await order2.save();
      expect(order2.status).toBe('Cancelled');
    });
  });

  describe('Filtering and Sorting', () => {
    it('TC_FUNC_013-018: Filter and sort orders', async () => {
      await createTestOrder(regularUser._id, testProduct._id, { status: 'Pending', totalPrice: 100, createdAt: new Date('2024-01-01') });
      await createTestOrder(regularUser._id, testProduct._id, { status: 'Processing', totalPrice: 200, createdAt: new Date('2024-01-02') });
      await createTestOrder(regularUser._id, testProduct._id, { status: 'Delivered', totalPrice: 300, createdAt: new Date('2024-01-03') });

      let orders = await Order.find({ status: 'Pending' });
      expect(orders.length).toBe(1);

      orders = await Order.find({ user: regularUser._id });
      expect(orders.length).toBe(3);

      orders = await Order.find().sort({ createdAt: 1 });
      expect(orders[0].totalPrice).toBe(100);

      orders = await Order.find().sort({ totalPrice: -1 });
      expect(orders[0].totalPrice).toBe(300);
    });
  });

  describe('Summary Statistics', () => {
    it('TC_FUNC_019-024: Aggregation queries work', async () => {
      await createTestOrder(regularUser._id, testProduct._id, { totalPrice: 100 });
      await createTestOrder(regularUser._id, testProduct._id, { totalPrice: 200 });

      const countResult = await Order.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]);
      expect(countResult[0].count).toBe(2);

      const salesResult = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
      expect(salesResult[0].total).toBe(300);

      const usersResult = await User.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]);
      expect(usersResult[0].count).toBe(2);

      await createTestProduct({ name: 'P1', slug: 'p1', category: 'Electronics' });
      await createTestProduct({ name: 'P2', slug: 'p2', category: 'Electronics' });
      
      const catResult = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
      const electronics = catResult.find(c => c._id === 'Electronics');
      expect(electronics.count).toBe(2);
    });
  });

  describe('Order Details', () => {
    it('TC_FUNC_025-028: Order details are correct', async () => {
      const order = await createTestOrder(regularUser._id, testProduct._id, {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: { id: 'PAY123', status: 'COMPLETED', update_time: new Date().toISOString(), email_address: 'test@test.com' },
      });

      expect(order.orderItems.length).toBe(1);
      expect(order.shippingAddress.fullName).toBe('Test User');
      expect(order.paymentMethod).toBe('PayPal');
      expect(order.isPaid).toBe(true);
      expect(order.paymentResult.id).toBe('PAY123');
      expect(order.createdAt).toBeDefined();
    });
  });
});
