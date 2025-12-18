import mongoose from 'mongoose';
import { setupTestDB, mockUser, mockProduct } from './setup.js';
import Order from '../../models/orderModel.js';
import Cart from '../../models/cartModel.js';

// Setup test database
setupTestDB();

describe('Payment Flow Tests', () => {
  // Helper to create order
  const createOrder = async (paymentMethod = 'PayPal') => {
    const order = new Order({
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
      paymentMethod,
      itemsPrice: 200000,
      shippingPrice: 30000,
      taxPrice: 20000,
      totalPrice: 250000,
      user: mockUser._id,
    });
    return await order.save();
  };

  // Helper to create cart
  const createCart = async () => {
    const cart = new Cart({
      user: mockUser._id,
      cartItems: [
        {
          _id: mockProduct._id.toString(),
          name: mockProduct.name,
          slug: mockProduct.slug,
          image: mockProduct.image,
          price: mockProduct.price,
          quantity: 2,
          countInStock: mockProduct.countInStock,
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
    });
    return await cart.save();
  };

  describe('TC-PAY-001: PayPal Payment Flow', () => {
    it('should process PayPal payment successfully', async () => {
      const order = await createOrder('PayPal');
      
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: 'PAYPAL_TXN_123456',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'buyer@example.com',
      };
      
      const paidOrder = await order.save();

      expect(paidOrder.isPaid).toBe(true);
      expect(paidOrder.paymentResult.status).toBe('COMPLETED');
      expect(paidOrder.paymentResult.id).toBe('PAYPAL_TXN_123456');
    });

    it('should clear cart after PayPal payment', async () => {
      await createCart();
      const order = await createOrder('PayPal');

      let cart = await Cart.findOne({ user: mockUser._id });
      expect(cart).toBeDefined();

      order.isPaid = true;
      order.paidAt = Date.now();
      await order.save();
      await Cart.findOneAndDelete({ user: order.user });

      cart = await Cart.findOne({ user: mockUser._id });
      expect(cart).toBeNull();
    });
  });

  describe('TC-PAY-002: COD Payment Flow', () => {
    it('should create COD order without immediate payment', async () => {
      const order = await createOrder('COD');

      expect(order.paymentMethod).toBe('COD');
      expect(order.isPaid).toBe(false);
      expect(order.status).toBe('Pending');
    });

    it('should mark COD as paid when delivered', async () => {
      const order = await createOrder('COD');

      order.status = 'Delivered';
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: 'COD',
        status: 'PAID',
        update_time: Date.now().toString(),
        email_address: '',
      };

      const deliveredOrder = await order.save();

      expect(deliveredOrder.isPaid).toBe(true);
      expect(deliveredOrder.isDelivered).toBe(true);
      expect(deliveredOrder.paymentResult.id).toBe('COD');
    });

    it('should clear cart after COD delivery', async () => {
      await createCart();
      const order = await createOrder('COD');

      order.status = 'Delivered';
      order.isDelivered = true;
      order.isPaid = true;
      await order.save();
      await Cart.findOneAndDelete({ user: order.user });

      const cart = await Cart.findOne({ user: mockUser._id });
      expect(cart).toBeNull();
    });
  });


  describe('TC-PAY-003: Order Status Transitions', () => {
    it('should follow correct status flow: Pending -> Processing -> Shipping -> Delivered', async () => {
      const order = await createOrder('PayPal');
      
      expect(order.status).toBe('Pending');

      order.isPaid = true;
      order.paidAt = Date.now();
      order.status = 'Processing';
      await order.save();
      expect(order.status).toBe('Processing');

      order.status = 'Shipping';
      await order.save();
      expect(order.status).toBe('Shipping');

      order.status = 'Delivered';
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      const finalOrder = await order.save();

      expect(finalOrder.status).toBe('Delivered');
      expect(finalOrder.isDelivered).toBe(true);
    });

    it('should allow cancellation from Pending status', async () => {
      const order = await createOrder('PayPal');
      
      order.status = 'Cancelled';
      const cancelledOrder = await order.save();

      expect(cancelledOrder.status).toBe('Cancelled');
      expect(cancelledOrder.isPaid).toBe(false);
    });
  });

  describe('TC-PAY-004: Payment Validation', () => {
    it('should store payment result correctly', async () => {
      const order = await createOrder('PayPal');
      
      const paymentResult = {
        id: 'PAY-123456789',
        status: 'COMPLETED',
        update_time: '2024-01-15T10:30:00Z',
        email_address: 'payer@example.com',
      };

      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = paymentResult;
      const paidOrder = await order.save();

      expect(paidOrder.paymentResult.id).toBe('PAY-123456789');
      expect(paidOrder.paymentResult.status).toBe('COMPLETED');
      expect(paidOrder.paymentResult.email_address).toBe('payer@example.com');
    });

    it('should handle partial payment result', async () => {
      const order = await createOrder('PayPal');
      
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: 'PAY-123',
        status: 'COMPLETED',
      };
      const paidOrder = await order.save();

      expect(paidOrder.paymentResult.id).toBe('PAY-123');
      expect(paidOrder.paymentResult.email_address).toBeUndefined();
    });
  });

  describe('TC-PAY-005: Price Calculations', () => {
    it('should calculate total correctly', async () => {
      const order = new Order({
        orderItems: [
          {
            slug: 'product-1',
            name: 'Product 1',
            quantity: 2,
            image: '/images/p1.jpg',
            price: 100000,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        shippingAddress: {
          fullName: 'Test',
          address: '123 St',
          city: 'City',
          postalCode: '12345',
          country: 'VN',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 200000,
        shippingPrice: 30000,
        taxPrice: 20000,
        totalPrice: 250000,
        user: mockUser._id,
      });

      const savedOrder = await order.save();

      expect(savedOrder.itemsPrice).toBe(200000);
      expect(savedOrder.totalPrice).toBe(250000);
    });

    it('should handle free shipping', async () => {
      const order = new Order({
        orderItems: [
          {
            slug: 'product-1',
            name: 'Product 1',
            quantity: 1,
            image: '/images/p1.jpg',
            price: 500000,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        shippingAddress: {
          fullName: 'Test',
          address: '123 St',
          city: 'City',
          postalCode: '12345',
          country: 'VN',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 500000,
        shippingPrice: 0,
        taxPrice: 50000,
        totalPrice: 550000,
        user: mockUser._id,
      });

      const savedOrder = await order.save();

      expect(savedOrder.shippingPrice).toBe(0);
      expect(savedOrder.totalPrice).toBe(550000);
    });
  });

  describe('TC-PAY-006: Edge Cases', () => {
    it('should handle order with single item', async () => {
      const order = await createOrder('PayPal');
      expect(order.orderItems).toHaveLength(1);
    });

    it('should handle order with multiple items', async () => {
      const order = new Order({
        orderItems: [
          {
            slug: 'product-1',
            name: 'Product 1',
            quantity: 1,
            image: '/images/p1.jpg',
            price: 100000,
            product: new mongoose.Types.ObjectId(),
          },
          {
            slug: 'product-2',
            name: 'Product 2',
            quantity: 3,
            image: '/images/p2.jpg',
            price: 50000,
            product: new mongoose.Types.ObjectId(),
          },
          {
            slug: 'product-3',
            name: 'Product 3',
            quantity: 2,
            image: '/images/p3.jpg',
            price: 75000,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        shippingAddress: {
          fullName: 'Test',
          address: '123 St',
          city: 'City',
          postalCode: '12345',
          country: 'VN',
        },
        paymentMethod: 'PayPal',
        itemsPrice: 400000,
        shippingPrice: 30000,
        taxPrice: 40000,
        totalPrice: 470000,
        user: mockUser._id,
      });

      const savedOrder = await order.save();
      expect(savedOrder.orderItems).toHaveLength(3);
    });

    it('should handle high quantity order', async () => {
      const order = new Order({
        orderItems: [
          {
            slug: 'product-1',
            name: 'Product 1',
            quantity: 100,
            image: '/images/p1.jpg',
            price: 10000,
            product: new mongoose.Types.ObjectId(),
          },
        ],
        shippingAddress: {
          fullName: 'Test',
          address: '123 St',
          city: 'City',
          postalCode: '12345',
          country: 'VN',
        },
        paymentMethod: 'COD',
        itemsPrice: 1000000,
        shippingPrice: 50000,
        taxPrice: 100000,
        totalPrice: 1150000,
        user: mockUser._id,
      });

      const savedOrder = await order.save();
      expect(savedOrder.orderItems[0].quantity).toBe(100);
    });
  });
});
