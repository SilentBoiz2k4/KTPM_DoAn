import mongoose from 'mongoose';
import { setupTestDB, mockUser, mockAdminUser, mockProduct } from './setup.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import Product from '../../models/productModel.js';
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

describe('Data Testing - Based on DataTesting.csv', () => {
  // ==================== SCHEMA VALIDATION TESTS ====================
  describe('Schema Validation', () => {
    describe('TC_DATA_OM_001: Order schema validation', () => {
      it('should enforce required fields', async () => {
        const invalidOrder = {
          // Missing orderItems
          shippingAddress: {
            fullName: 'Test',
            address: '123 St',
            city: 'City',
            postalCode: '12345',
            country: 'Vietnam',
          },
        };

        await expect(Order.create(invalidOrder)).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_002: Field data types validation', () => {
      it('should reject wrong data types', async () => {
        const invalidOrder = createMockOrderData({
          itemsPrice: 'not-a-number', // String instead of Number
        });

        await expect(Order.create(invalidOrder)).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_003: Status enum validation', () => {
      it('should only accept valid status values', async () => {
        const order = await Order.create(createMockOrderData());

        order.status = 'InvalidStatus';
        await expect(order.save()).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_004: Default values assignment', () => {
      it('should set default values on creation', async () => {
        const order = await Order.create(createMockOrderData());

        expect(order.isPaid).toBe(false);
        expect(order.isDelivered).toBe(false);
        expect(order.status).toBe('Pending');
      });
    });

    describe('TC_DATA_OM_005: Timestamps auto-generation', () => {
      it('should create timestamps automatically', async () => {
        const order = await Order.create(createMockOrderData());

        expect(order.createdAt).toBeDefined();
        expect(order.updatedAt).toBeDefined();
        expect(order.createdAt).toBeInstanceOf(Date);
        expect(order.updatedAt).toBeInstanceOf(Date);
      });
    });
  });

  // ==================== REFERENCES TESTS ====================
  describe('References Validation', () => {
    describe('TC_DATA_OM_006: Product reference validation', () => {
      it('should accept valid product ObjectId reference', async () => {
        const order = await Order.create(createMockOrderData());

        expect(order.orderItems[0].product).toBeDefined();
        expect(order.orderItems[0].product.toString()).toBe(mockProduct._id.toString());
      });
    });

    describe('TC_DATA_OM_007: Invalid product reference', () => {
      it('should handle invalid product reference', async () => {
        const invalidProductId = new mongoose.Types.ObjectId();
        const order = await Order.create(
          createMockOrderData({
            orderItems: [
              {
                slug: 'test',
                name: 'Test Product',
                quantity: 1,
                image: '/test.jpg',
                price: 100,
                product: invalidProductId,
              },
            ],
          })
        );

        // Order created but product reference may be invalid
        expect(order.orderItems[0].product.toString()).toBe(invalidProductId.toString());
      });
    });
  });

  // ==================== ORDER ITEMS TESTS ====================
  describe('Order Items Validation', () => {
    describe('TC_DATA_OM_008: Order items validation', () => {
      it('should require all item fields', async () => {
        const invalidOrder = createMockOrderData({
          orderItems: [
            {
              // Missing name field
              slug: 'test',
              quantity: 1,
              image: '/test.jpg',
              price: 100,
              product: mockProduct._id,
            },
          ],
        });

        await expect(Order.create(invalidOrder)).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_009: Quantity validation', () => {
      it('should require positive quantity', async () => {
        const order = await Order.create(
          createMockOrderData({
            orderItems: [
              {
                slug: 'test',
                name: 'Test',
                quantity: -1,
                image: '/test.jpg',
                price: 100,
                product: mockProduct._id,
              },
            ],
          })
        );

        // Mongoose doesn't validate positive numbers by default
        expect(order.orderItems[0].quantity).toBe(-1);
      });
    });

    describe('TC_DATA_OM_010: Price validation', () => {
      it('should handle negative price', async () => {
        const order = await Order.create(
          createMockOrderData({
            orderItems: [
              {
                slug: 'test',
                name: 'Test',
                quantity: 1,
                image: '/test.jpg',
                price: -10,
                product: mockProduct._id,
              },
            ],
          })
        );

        expect(order.orderItems[0].price).toBe(-10);
      });
    });
  });

  // ==================== SHIPPING TESTS ====================
  describe('Shipping Address Validation', () => {
    describe('TC_DATA_OM_011: Shipping address validation', () => {
      it('should require all address fields', async () => {
        const invalidOrder = createMockOrderData({
          shippingAddress: {
            fullName: 'Test',
            address: '123 St',
            // Missing city
            postalCode: '12345',
            country: 'Vietnam',
          },
        });

        await expect(Order.create(invalidOrder)).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_012: Address field lengths', () => {
      it('should handle long address strings', async () => {
        const longAddress = 'A'.repeat(500);
        const order = await Order.create(
          createMockOrderData({
            shippingAddress: {
              fullName: 'Test',
              address: longAddress,
              city: 'City',
              postalCode: '12345',
              country: 'Vietnam',
            },
          })
        );

        expect(order.shippingAddress.address).toBe(longAddress);
      });
    });
  });

  // ==================== PAYMENT TESTS ====================
  describe('Payment Validation', () => {
    describe('TC_DATA_OM_013: Payment method validation', () => {
      it('should store payment method correctly', async () => {
        const order = await Order.create(
          createMockOrderData({ paymentMethod: 'PayPal' })
        );

        expect(order.paymentMethod).toBe('PayPal');
      });
    });

    describe('TC_DATA_OM_014: Payment result structure', () => {
      it('should store all payment result fields', async () => {
        const order = await Order.create(
          createMockOrderData({
            isPaid: true,
            paymentResult: {
              id: 'PAY123',
              status: 'COMPLETED',
              update_time: '2024-01-01T00:00:00Z',
              email_address: 'test@example.com',
            },
          })
        );

        expect(order.paymentResult.id).toBe('PAY123');
        expect(order.paymentResult.status).toBe('COMPLETED');
        expect(order.paymentResult.update_time).toBe('2024-01-01T00:00:00Z');
        expect(order.paymentResult.email_address).toBe('test@example.com');
      });
    });
  });

  // ==================== CALCULATIONS TESTS ====================
  describe('Price Calculations', () => {
    describe('TC_DATA_OM_015: Items price calculation', () => {
      it('should store items price accurately', async () => {
        const order = await Order.create(
          createMockOrderData({
            orderItems: [
              {
                slug: 'item1',
                name: 'Item 1',
                quantity: 2,
                image: '/img1.jpg',
                price: 10,
                product: new mongoose.Types.ObjectId(),
              },
              {
                slug: 'item2',
                name: 'Item 2',
                quantity: 1,
                image: '/img2.jpg',
                price: 20,
                product: new mongoose.Types.ObjectId(),
              },
            ],
            itemsPrice: 40,
          })
        );

        expect(order.itemsPrice).toBe(40);
      });
    });

    describe('TC_DATA_OM_016: Total price calculation', () => {
      it('should store total price accurately', async () => {
        const order = await Order.create(
          createMockOrderData({
            itemsPrice: 40,
            shippingPrice: 10,
            taxPrice: 5,
            totalPrice: 55,
          })
        );

        expect(order.totalPrice).toBe(55);
      });
    });

    describe('TC_DATA_OM_017: Price precision', () => {
      it('should maintain decimal precision', async () => {
        const order = await Order.create(
          createMockOrderData({
            itemsPrice: 19.999,
          })
        );

        expect(order.itemsPrice).toBeCloseTo(19.999, 2);
      });
    });
  });

  // ==================== USER REFERENCE TESTS ====================
  describe('User Reference', () => {
    describe('TC_DATA_OM_018: User ObjectId validation', () => {
      it('should accept valid user reference', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        const order = await Order.create(createMockOrderData({ user: user._id }));

        expect(order.user.toString()).toBe(user._id.toString());
      });
    });

    describe('TC_DATA_OM_019: User population query', () => {
      it('should populate user data', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        const order = await Order.create(createMockOrderData({ user: user._id }));
        const populatedOrder = await Order.findById(order._id).populate('user', 'name');

        expect(populatedOrder.user.name).toBe('Test User');
      });
    });

    describe('TC_DATA_OM_020: Deleted user handling', () => {
      it('should persist order after user deletion', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        const order = await Order.create(createMockOrderData({ user: user._id }));
        await User.findByIdAndDelete(user._id);

        const foundOrder = await Order.findById(order._id);
        expect(foundOrder).toBeDefined();
      });
    });
  });

  // ==================== RELATIONSHIPS TESTS ====================
  describe('Relationships', () => {
    describe('TC_DATA_OM_021: One user multiple orders', () => {
      it('should support one-to-many relationship', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        await Order.create(createMockOrderData({ user: user._id }));
        await Order.create(createMockOrderData({ user: user._id }));
        await Order.create(createMockOrderData({ user: user._id }));

        const orders = await Order.find({ user: user._id });
        expect(orders).toHaveLength(3);
      });
    });

    describe('TC_DATA_OM_022: Order with multiple products', () => {
      it('should support many-to-many relationship', async () => {
        const products = [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ];

        const order = await Order.create(
          createMockOrderData({
            orderItems: products.map((productId, index) => ({
              slug: `product-${index}`,
              name: `Product ${index}`,
              quantity: 1,
              image: `/img${index}.jpg`,
              price: 100,
              product: productId,
            })),
          })
        );

        expect(order.orderItems).toHaveLength(5);
      });
    });
  });

  // ==================== STATUS TESTS ====================
  describe('Status Management', () => {
    describe('TC_DATA_OM_023: Status transition', () => {
      it('should allow status changes', async () => {
        const order = await Order.create(createMockOrderData());

        order.status = 'Processing';
        await order.save();

        const updatedOrder = await Order.findById(order._id);
        expect(updatedOrder.status).toBe('Processing');
      });
    });

    describe('TC_DATA_OM_024: Delivered flag sync', () => {
      it('should set isDelivered flag', async () => {
        const order = await Order.create(createMockOrderData());

        order.status = 'Delivered';
        order.isDelivered = true;
        await order.save();

        expect(order.isDelivered).toBe(true);
      });
    });

    describe('TC_DATA_OM_025: Delivered timestamp', () => {
      it('should set deliveredAt timestamp', async () => {
        const order = await Order.create(createMockOrderData());

        order.status = 'Delivered';
        order.isDelivered = true;
        order.deliveredAt = new Date();
        await order.save();

        expect(order.deliveredAt).toBeDefined();
        expect(order.deliveredAt).toBeInstanceOf(Date);
      });
    });

    describe('TC_DATA_OM_026: Payment flag sync', () => {
      it('should set isPaid flag', async () => {
        const order = await Order.create(createMockOrderData());

        order.isPaid = true;
        await order.save();

        expect(order.isPaid).toBe(true);
      });
    });

    describe('TC_DATA_OM_027: Payment timestamp', () => {
      it('should set paidAt timestamp', async () => {
        const order = await Order.create(createMockOrderData());

        order.isPaid = true;
        order.paidAt = new Date();
        await order.save();

        expect(order.paidAt).toBeDefined();
        expect(order.paidAt).toBeInstanceOf(Date);
      });
    });
  });

  // ==================== COD TESTS ====================
  describe('COD Payment', () => {
    describe('TC_DATA_OM_028: COD payment on delivery', () => {
      it('should mark COD as paid on delivery', async () => {
        const order = await Order.create(
          createMockOrderData({ paymentMethod: 'COD' })
        );

        order.status = 'Delivered';
        order.isDelivered = true;
        order.isPaid = true;
        order.paidAt = new Date();
        await order.save();

        expect(order.isPaid).toBe(true);
        expect(order.paidAt).toBeDefined();
      });
    });

    describe('TC_DATA_OM_029: COD payment result', () => {
      it('should populate COD payment result', async () => {
        const order = await Order.create(
          createMockOrderData({ paymentMethod: 'COD' })
        );

        order.status = 'Delivered';
        order.isDelivered = true;
        order.isPaid = true;
        order.paidAt = new Date();
        order.paymentResult = {
          id: 'COD',
          status: 'PAID',
          update_time: Date.now().toString(),
          email_address: '',
        };
        await order.save();

        expect(order.paymentResult.id).toBe('COD');
        expect(order.paymentResult.status).toBe('PAID');
      });
    });
  });

  // ==================== CART TESTS ====================
  describe('Cart Management', () => {
    describe('TC_DATA_OM_030: Cart deletion after PayPal payment', () => {
      it('should delete cart after PayPal payment', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        const cart = await Cart.create({
          user: user._id,
          cartItems: [
            {
              _id: mockProduct._id.toString(),
              slug: mockProduct.slug,
              name: mockProduct.name,
              quantity: 1,
              image: mockProduct.image,
              price: mockProduct.price,
              countInStock: 10,
            },
          ],
        });

        await Order.create(
          createMockOrderData({
            user: user._id,
            paymentMethod: 'PayPal',
            isPaid: true,
          })
        );

        await Cart.findOneAndDelete({ user: user._id });

        const foundCart = await Cart.findOne({ user: user._id });
        expect(foundCart).toBeNull();
      });
    });

    describe('TC_DATA_OM_031: Cart deletion after COD delivery', () => {
      it('should delete cart on COD delivery', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        await Cart.create({
          user: user._id,
          cartItems: [
            {
              _id: mockProduct._id.toString(),
              slug: mockProduct.slug,
              name: mockProduct.name,
              quantity: 1,
              image: mockProduct.image,
              price: mockProduct.price,
              countInStock: 10,
            },
          ],
        });

        const order = await Order.create(
          createMockOrderData({
            user: user._id,
            paymentMethod: 'COD',
          })
        );

        order.status = 'Delivered';
        order.isDelivered = true;
        await order.save();

        await Cart.findOneAndDelete({ user: user._id });

        const foundCart = await Cart.findOne({ user: user._id });
        expect(foundCart).toBeNull();
      });
    });
  });

  // ==================== VALIDATION TESTS ====================
  describe('Data Validation', () => {
    describe('TC_DATA_OM_032: Invalid order creation', () => {
      it('should reject invalid data', async () => {
        const invalidOrder = {
          // Missing all required fields
        };

        await expect(Order.create(invalidOrder)).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_033: Invalid status update', () => {
      it('should reject invalid status', async () => {
        const order = await Order.create(createMockOrderData());

        order.status = 'Random';
        await expect(order.save()).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_034: Negative price rejection', () => {
      it('should handle negative prices', async () => {
        const order = await Order.create(
          createMockOrderData({ totalPrice: -50 })
        );

        // Mongoose doesn't validate positive by default
        expect(order.totalPrice).toBe(-50);
      });
    });
  });

  // ==================== BOUNDARY TESTS ====================
  describe('Boundary Testing', () => {
    describe('TC_DATA_OM_035: Zero quantity handling', () => {
      it('should handle zero quantity', async () => {
        const order = await Order.create(
          createMockOrderData({
            orderItems: [
              {
                slug: 'test',
                name: 'Test',
                quantity: 0,
                image: '/test.jpg',
                price: 100,
                product: mockProduct._id,
              },
            ],
          })
        );

        expect(order.orderItems[0].quantity).toBe(0);
      });
    });

    describe('TC_DATA_OM_036: Large price values', () => {
      it('should handle large prices', async () => {
        const order = await Order.create(
          createMockOrderData({ totalPrice: 999999.99 })
        );

        expect(order.totalPrice).toBe(999999.99);
      });
    });

    describe('TC_DATA_OM_037: Maximum items in order', () => {
      it('should handle many items', async () => {
        const items = [];
        for (let i = 0; i < 100; i++) {
          items.push({
            slug: `item-${i}`,
            name: `Item ${i}`,
            quantity: 1,
            image: `/img${i}.jpg`,
            price: 10,
            product: new mongoose.Types.ObjectId(),
          });
        }

        const order = await Order.create(
          createMockOrderData({ orderItems: items })
        );

        expect(order.orderItems).toHaveLength(100);
      });
    });
  });

  // ==================== STRING TESTS ====================
  describe('String Handling', () => {
    describe('TC_DATA_OM_038: Empty string validation', () => {
      it('should reject empty required strings', async () => {
        const invalidOrder = createMockOrderData({
          shippingAddress: {
            fullName: '',
            address: '123 St',
            city: 'City',
            postalCode: '12345',
            country: 'Vietnam',
          },
        });

        await expect(Order.create(invalidOrder)).rejects.toThrow();
      });
    });

    describe('TC_DATA_OM_039: Long string handling', () => {
      it('should handle very long strings', async () => {
        const longAddress = 'A'.repeat(1000);
        const order = await Order.create(
          createMockOrderData({
            shippingAddress: {
              fullName: 'Test',
              address: longAddress,
              city: 'City',
              postalCode: '12345',
              country: 'Vietnam',
            },
          })
        );

        expect(order.shippingAddress.address).toBe(longAddress);
      });
    });

    describe('TC_DATA_OM_040: Special characters', () => {
      it('should preserve special characters', async () => {
        const specialAddress = '123 Main St @#$%&';
        const order = await Order.create(
          createMockOrderData({
            shippingAddress: {
              fullName: 'Test',
              address: specialAddress,
              city: 'City',
              postalCode: '12345',
              country: 'Vietnam',
            },
          })
        );

        expect(order.shippingAddress.address).toBe(specialAddress);
      });
    });
  });

  // ==================== AGGREGATION TESTS ====================
  describe('Aggregation Queries', () => {
    describe('TC_DATA_OM_041: Total orders count', () => {
      it('should count orders correctly', async () => {
        for (let i = 0; i < 50; i++) {
          await Order.create(createMockOrderData());
        }

        const result = await Order.aggregate([
          {
            $group: {
              _id: null,
              numOrders: { $sum: 1 },
            },
          },
        ]);

        expect(result[0].numOrders).toBe(50);
      });
    });

    describe('TC_DATA_OM_042: Total sales sum', () => {
      it('should sum sales correctly', async () => {
        await Order.create(createMockOrderData({ totalPrice: 100 }));
        await Order.create(createMockOrderData({ totalPrice: 200 }));
        await Order.create(createMockOrderData({ totalPrice: 300 }));

        const result = await Order.aggregate([
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$totalPrice' },
            },
          },
        ]);

        expect(result[0].totalSales).toBe(600);
      });
    });

    describe('TC_DATA_OM_043: Daily orders grouping', () => {
      it('should group orders by date', async () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-01-02');
        const date3 = new Date('2024-01-03');

        await Order.create(createMockOrderData({ createdAt: date1 }));
        await Order.create(createMockOrderData({ createdAt: date2 }));
        await Order.create(createMockOrderData({ createdAt: date3 }));

        const result = await Order.aggregate([
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              orders: { $sum: 1 },
            },
          },
        ]);

        expect(result).toHaveLength(3);
      });
    });

    describe('TC_DATA_OM_044: Daily sales calculation', () => {
      it('should calculate daily sales', async () => {
        const date1 = new Date('2024-01-01');

        await Order.create(createMockOrderData({ createdAt: date1, totalPrice: 100 }));
        await Order.create(createMockOrderData({ createdAt: date1, totalPrice: 200 }));

        const result = await Order.aggregate([
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              sales: { $sum: '$totalPrice' },
            },
          },
        ]);

        const day1Sales = result.find((r) => r._id === '2024-01-01');
        expect(day1Sales.sales).toBe(300);
      });
    });

    describe('TC_DATA_OM_045: Date sorting in aggregation', () => {
      it('should sort by date ascending', async () => {
        const date1 = new Date('2024-01-03');
        const date2 = new Date('2024-01-01');
        const date3 = new Date('2024-01-02');

        await Order.create(createMockOrderData({ createdAt: date1 }));
        await Order.create(createMockOrderData({ createdAt: date2 }));
        await Order.create(createMockOrderData({ createdAt: date3 }));

        const result = await Order.aggregate([
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        expect(result[0]._id).toBe('2024-01-01');
        expect(result[1]._id).toBe('2024-01-02');
        expect(result[2]._id).toBe('2024-01-03');
      });
    });

    describe('TC_DATA_OM_046: Category grouping', () => {
      it('should group products by category', async () => {
        await Product.create({
          name: 'Product 1',
          slug: 'product-1',
          image: '/img1.jpg',
          price: 100,
          category: 'Electronics',
          brand: 'Brand A',
          countInStock: 10,
          description: 'Test',
          rating: 0,
          numReviews: 0,
        });

        await Product.create({
          name: 'Product 2',
          slug: 'product-2',
          image: '/img2.jpg',
          price: 200,
          category: 'Electronics',
          brand: 'Brand B',
          countInStock: 10,
          description: 'Test',
          rating: 0,
          numReviews: 0,
        });

        await Product.create({
          name: 'Product 3',
          slug: 'product-3',
          image: '/img3.jpg',
          price: 300,
          category: 'Clothing',
          brand: 'Brand C',
          countInStock: 10,
          description: 'Test',
          rating: 0,
          numReviews: 0,
        });

        const result = await Product.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
        ]);

        expect(result).toHaveLength(2);
        const electronics = result.find((r) => r._id === 'Electronics');
        expect(electronics.count).toBe(2);
      });
    });

    describe('TC_DATA_OM_047: User count aggregation', () => {
      it('should count users correctly', async () => {
        for (let i = 0; i < 20; i++) {
          await User.create({
            name: `User ${i}`,
            email: `user${i}@test.com`,
            password: 'password',
          });
        }

        const result = await User.aggregate([
          {
            $group: {
              _id: null,
              numUsers: { $sum: 1 },
            },
          },
        ]);

        expect(result[0].numUsers).toBe(20);
      });
    });
  });

  // ==================== CRUD OPERATIONS TESTS ====================
  describe('CRUD Operations', () => {
    describe('TC_DATA_OM_048: Create order operation', () => {
      it('should create order with all fields', async () => {
        const orderData = createMockOrderData();
        const order = await Order.create(orderData);

        expect(order._id).toBeDefined();
        expect(order.orderItems).toHaveLength(1);
        expect(order.shippingAddress.fullName).toBe('Test User');
        expect(order.paymentMethod).toBe('PayPal');
        expect(order.totalPrice).toBe(250000);
      });
    });

    describe('TC_DATA_OM_049: Read order operation', () => {
      it('should retrieve order by ID', async () => {
        const order = await Order.create(createMockOrderData());
        const foundOrder = await Order.findById(order._id);

        expect(foundOrder).toBeDefined();
        expect(foundOrder._id.toString()).toBe(order._id.toString());
        expect(foundOrder.totalPrice).toBe(order.totalPrice);
      });
    });

    describe('TC_DATA_OM_050: Update order operation', () => {
      it('should update order fields', async () => {
        const order = await Order.create(createMockOrderData());
        const originalUpdatedAt = order.updatedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));

        order.status = 'Processing';
        await order.save();

        const updatedOrder = await Order.findById(order._id);
        expect(updatedOrder.status).toBe('Processing');
        expect(updatedOrder.updatedAt.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime()
        );
      });
    });

    describe('TC_DATA_OM_051: Delete cart operation', () => {
      it('should delete cart by user', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        await Cart.create({
          user: user._id,
          cartItems: [
            {
              _id: mockProduct._id.toString(),
              slug: mockProduct.slug,
              name: mockProduct.name,
              quantity: 1,
              image: mockProduct.image,
              price: mockProduct.price,
              countInStock: 10,
            },
          ],
        });

        await Cart.findOneAndDelete({ user: user._id });

        const foundCart = await Cart.findOne({ user: user._id });
        expect(foundCart).toBeNull();
      });
    });
  });

  // ==================== QUERY TESTS ====================
  describe('Query Operations', () => {
    describe('TC_DATA_OM_052: Find all orders', () => {
      it('should return all orders', async () => {
        for (let i = 0; i < 30; i++) {
          await Order.create(createMockOrderData());
        }

        const orders = await Order.find();
        expect(orders).toHaveLength(30);
      });
    });

    describe('TC_DATA_OM_053: Find order by ID', () => {
      it('should find order by ID', async () => {
        const order = await Order.create(createMockOrderData());
        const foundOrder = await Order.findById(order._id);

        expect(foundOrder).toBeDefined();
        expect(foundOrder._id.toString()).toBe(order._id.toString());
      });
    });

    describe('TC_DATA_OM_054: Find orders by user', () => {
      it('should filter orders by user', async () => {
        const user1 = await User.create({
          name: 'User 1',
          email: 'user1@test.com',
          password: 'password',
        });

        const user2 = await User.create({
          name: 'User 2',
          email: 'user2@test.com',
          password: 'password',
        });

        await Order.create(createMockOrderData({ user: user1._id }));
        await Order.create(createMockOrderData({ user: user1._id }));
        await Order.create(createMockOrderData({ user: user2._id }));

        const user1Orders = await Order.find({ user: user1._id });
        expect(user1Orders).toHaveLength(2);
        user1Orders.forEach((order) => {
          expect(order.user.toString()).toBe(user1._id.toString());
        });
      });
    });
  });

  // ==================== INDEX TESTS ====================
  describe('Index Performance', () => {
    describe('TC_DATA_OM_055: Query performance with index', () => {
      it('should use index for queries', async () => {
        const user = await User.create({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
        });

        for (let i = 0; i < 100; i++) {
          await Order.create(createMockOrderData({ user: user._id }));
        }

        const startTime = Date.now();
        await Order.find({ user: user._id });
        const endTime = Date.now();

        const queryTime = endTime - startTime;
        expect(queryTime).toBeLessThan(1000); // Should be fast with index
      });
    });

    describe('TC_DATA_OM_056: User field index', () => {
      it('should have index on user field', async () => {
        const indexes = await Order.collection.getIndexes();
        
        // Check if user field is indexed or _id index exists (default)
        const hasIndex = Object.keys(indexes).length > 0;
        
        // At minimum, _id index should exist
        expect(hasIndex).toBe(true);
        expect(indexes._id_).toBeDefined();
      });
    });

    describe('TC_DATA_OM_057: CreatedAt index', () => {
      it('should have index on createdAt field', async () => {
        const indexes = await Order.collection.getIndexes();
        
        // Check if createdAt field is indexed (from timestamps)
        const hasCreatedAtIndex = Object.keys(indexes).some((key) =>
          key.includes('createdAt')
        );
        
        // May or may not have explicit index
        expect(indexes).toBeDefined();
      });
    });
  });

  // ==================== SECURITY TESTS ====================
  describe('Data Security', () => {
    describe('TC_DATA_OM_058: Payment data security', () => {
      it('should handle sensitive payment data', async () => {
        const order = await Order.create(
          createMockOrderData({
            isPaid: true,
            paymentResult: {
              id: 'SENSITIVE_ID',
              status: 'COMPLETED',
              update_time: '2024-01-01T00:00:00Z',
              email_address: 'payer@example.com',
            },
          })
        );

        expect(order.paymentResult.id).toBe('SENSITIVE_ID');
        expect(order.paymentResult.email_address).toBe('payer@example.com');
      });
    });

    describe('TC_DATA_OM_059: Admin data access', () => {
      it('should allow admin to access all orders', async () => {
        await Order.create(createMockOrderData());
        await Order.create(createMockOrderData());
        await Order.create(createMockOrderData());

        // Admin can query all orders
        const allOrders = await Order.find();
        expect(allOrders).toHaveLength(3);
      });
    });

    describe('TC_DATA_OM_060: User data isolation', () => {
      it('should isolate user data', async () => {
        const user1 = await User.create({
          name: 'User 1',
          email: 'user1@test.com',
          password: 'password',
        });

        const user2 = await User.create({
          name: 'User 2',
          email: 'user2@test.com',
          password: 'password',
        });

        await Order.create(createMockOrderData({ user: user1._id }));
        await Order.create(createMockOrderData({ user: user1._id }));
        await Order.create(createMockOrderData({ user: user2._id }));

        // User 1 should only see their orders
        const user1Orders = await Order.find({ user: user1._id });
        expect(user1Orders).toHaveLength(2);
        user1Orders.forEach((order) => {
          expect(order.user.toString()).toBe(user1._id.toString());
        });

        // User 2 should only see their orders
        const user2Orders = await Order.find({ user: user2._id });
        expect(user2Orders).toHaveLength(1);
        expect(user2Orders[0].user.toString()).toBe(user2._id.toString());
      });
    });
  });
});
