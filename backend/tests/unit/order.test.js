import mongoose from 'mongoose';
import { setupTestDB, mockUser, mockAdminUser, mockProduct } from './setup.js';
import Order from '../../models/orderModel.js';
import Cart from '../../models/cartModel.js';

// Setup test database
setupTestDB();

// Mock order data factory
const createMockOrderData = (overrides = {}) => ({
  orderItems: [
    {
      slug: mockProduct.slug,
      name: mockProduct.name,
      quantity: 2,
      image: mockProduct.image,
      price: mockProduct.price,
      product: mockProduct._id,
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
  itemsPrice: 200000,
  shippingPrice: 30000,
  taxPrice: 20000,
  totalPrice: 250000,
  user: mockUser._id,
  ...overrides,
});

describe('Order Model Tests', () => {
  describe('TC-ORD-001: Tạo đơn hàng thành công', () => {
    it('should create order with valid data', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder._id).toBeDefined();
      expect(savedOrder.orderItems).toHaveLength(1);
      expect(savedOrder.totalPrice).toBe(250000);
      expect(savedOrder.isPaid).toBe(false);
      expect(savedOrder.isDelivered).toBe(false);
      expect(savedOrder.status).toBe('Pending');
    });

    it('should set default values correctly', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.isPaid).toBe(false);
      expect(savedOrder.isDelivered).toBe(false);
      expect(savedOrder.status).toBe('Pending');
      expect(savedOrder.paidAt).toBeUndefined();
      expect(savedOrder.deliveredAt).toBeUndefined();
    });

    it('should have timestamps', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.createdAt).toBeDefined();
      expect(savedOrder.updatedAt).toBeDefined();
    });
  });

  describe('TC-ORD-002: Validation - Thiếu thông tin bắt buộc', () => {
    it('should allow empty orderItems array', async () => {
      const orderData = createMockOrderData();
      orderData.orderItems = [];
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.orderItems).toHaveLength(0);
    });

    it('should fail without shippingAddress', async () => {
      const orderData = createMockOrderData();
      delete orderData.shippingAddress;
      const order = new Order(orderData);

      await expect(order.save()).rejects.toThrow();
    });

    it('should fail without paymentMethod', async () => {
      const orderData = createMockOrderData();
      delete orderData.paymentMethod;
      const order = new Order(orderData);

      await expect(order.save()).rejects.toThrow();
    });

    it('should fail without user', async () => {
      const orderData = createMockOrderData();
      delete orderData.user;
      const order = new Order(orderData);

      await expect(order.save()).rejects.toThrow();
    });

    it('should fail without price fields', async () => {
      const orderData = createMockOrderData();
      delete orderData.itemsPrice;
      const order = new Order(orderData);

      await expect(order.save()).rejects.toThrow();
    });
  });

  describe('TC-ORD-003: Validation - Shipping Address', () => {
    it('should fail without fullName in shippingAddress', async () => {
      const orderData = createMockOrderData({
        shippingAddress: {
          address: '123 Test Street',
          city: 'Test City',
          postalCode: '12345',
          country: 'Vietnam',
        },
      });
      const order = new Order(orderData);

      await expect(order.save()).rejects.toThrow();
    });

    it('should fail without address in shippingAddress', async () => {
      const orderData = createMockOrderData({
        shippingAddress: {
          fullName: 'Test User',
          city: 'Test City',
          postalCode: '12345',
          country: 'Vietnam',
        },
      });
      const order = new Order(orderData);

      await expect(order.save()).rejects.toThrow();
    });
  });


  describe('TC-ORD-004: Cập nhật trạng thái thanh toán', () => {
    it('should update payment status to paid', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.isPaid = true;
      savedOrder.paidAt = Date.now();
      savedOrder.paymentResult = {
        id: 'PAYPAL123',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'test@example.com',
      };

      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.isPaid).toBe(true);
      expect(updatedOrder.paidAt).toBeDefined();
      expect(updatedOrder.paymentResult.id).toBe('PAYPAL123');
      expect(updatedOrder.paymentResult.status).toBe('COMPLETED');
    });
  });

  describe('TC-ORD-005: Cập nhật trạng thái đơn hàng', () => {
    it('should update status to Processing', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.status = 'Processing';
      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.status).toBe('Processing');
    });

    it('should update status to Shipping', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.status = 'Shipping';
      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.status).toBe('Shipping');
    });

    it('should update status to Delivered', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.status = 'Delivered';
      savedOrder.isDelivered = true;
      savedOrder.deliveredAt = Date.now();
      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.status).toBe('Delivered');
      expect(updatedOrder.isDelivered).toBe(true);
      expect(updatedOrder.deliveredAt).toBeDefined();
    });

    it('should update status to Cancelled', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.status = 'Cancelled';
      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.status).toBe('Cancelled');
    });

    it('should reject invalid status', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.status = 'InvalidStatus';

      await expect(savedOrder.save()).rejects.toThrow();
    });
  });

  describe('TC-ORD-006: Thanh toán COD', () => {
    it('should create COD order successfully', async () => {
      const orderData = createMockOrderData({ paymentMethod: 'COD' });
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.paymentMethod).toBe('COD');
      expect(savedOrder.isPaid).toBe(false);
    });

    it('should mark COD as paid when delivered', async () => {
      const orderData = createMockOrderData({ paymentMethod: 'COD' });
      const order = new Order(orderData);
      const savedOrder = await order.save();

      savedOrder.status = 'Delivered';
      savedOrder.isDelivered = true;
      savedOrder.deliveredAt = Date.now();
      savedOrder.isPaid = true;
      savedOrder.paidAt = Date.now();
      savedOrder.paymentResult = {
        id: 'COD',
        status: 'PAID',
        update_time: Date.now().toString(),
        email_address: '',
      };

      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.isPaid).toBe(true);
      expect(updatedOrder.paymentResult.id).toBe('COD');
    });
  });

  describe('TC-ORD-007: Tìm kiếm đơn hàng', () => {
    it('should find order by id', async () => {
      const orderData = createMockOrderData();
      const order = new Order(orderData);
      const savedOrder = await order.save();

      const foundOrder = await Order.findById(savedOrder._id);

      expect(foundOrder).toBeDefined();
      expect(foundOrder._id.toString()).toBe(savedOrder._id.toString());
    });

    it('should find orders by user', async () => {
      const orderData1 = createMockOrderData();
      const orderData2 = createMockOrderData();
      const orderData3 = createMockOrderData({ user: mockAdminUser._id });

      await new Order(orderData1).save();
      await new Order(orderData2).save();
      await new Order(orderData3).save();

      const userOrders = await Order.find({ user: mockUser._id });

      expect(userOrders).toHaveLength(2);
    });

    it('should return null for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const foundOrder = await Order.findById(fakeId);

      expect(foundOrder).toBeNull();
    });
  });

  describe('TC-ORD-008: Tính toán giá', () => {
    it('should store correct price calculations', async () => {
      const orderData = createMockOrderData({
        itemsPrice: 200000,
        shippingPrice: 30000,
        taxPrice: 20000,
        totalPrice: 250000,
      });
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.itemsPrice).toBe(200000);
      expect(savedOrder.shippingPrice).toBe(30000);
      expect(savedOrder.taxPrice).toBe(20000);
      expect(savedOrder.totalPrice).toBe(250000);
    });

    it('should handle multiple items in order', async () => {
      const orderData = createMockOrderData({
        orderItems: [
          {
            slug: 'product-1',
            name: 'Product 1',
            quantity: 2,
            image: '/images/p1.jpg',
            price: 100000,
            product: new mongoose.Types.ObjectId(),
          },
          {
            slug: 'product-2',
            name: 'Product 2',
            quantity: 1,
            image: '/images/p2.jpg',
            price: 150000,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        itemsPrice: 350000,
        totalPrice: 400000,
      });
      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.orderItems).toHaveLength(2);
      expect(savedOrder.itemsPrice).toBe(350000);
    });
  });
});
