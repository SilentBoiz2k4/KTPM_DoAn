import mongoose from 'mongoose';
import { setupTestDB, mockUser, mockProduct } from './setup.js';
import Cart from '../../models/cartModel.js';

// Setup test database
setupTestDB();

// Mock cart data factory
const createMockCartData = (overrides = {}) => ({
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
  ...overrides,
});

describe('Cart Model Tests', () => {
  describe('TC-CART-001: Tạo giỏ hàng mới', () => {
    it('should create cart with valid data', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      expect(savedCart._id).toBeDefined();
      expect(savedCart.cartItems).toHaveLength(1);
      expect(savedCart.user.toString()).toBe(mockUser._id.toString());
    });

    it('should create empty cart', async () => {
      const cart = new Cart({
        user: mockUser._id,
        cartItems: [],
        shippingAddress: {},
        paymentMethod: '',
      });
      const savedCart = await cart.save();

      expect(savedCart.cartItems).toHaveLength(0);
      expect(savedCart.paymentMethod).toBe('');
    });
  });


  describe('TC-CART-002: Validation - User unique constraint', () => {
    it('should not allow duplicate cart for same user', async () => {
      const cartData = createMockCartData();
      const cart1 = new Cart(cartData);
      await cart1.save();

      const cart2 = new Cart(cartData);
      await expect(cart2.save()).rejects.toThrow();
    });

    it('should fail without user', async () => {
      const cartData = createMockCartData();
      delete cartData.user;
      const cart = new Cart(cartData);

      await expect(cart.save()).rejects.toThrow();
    });
  });

  describe('TC-CART-003: Thêm sản phẩm vào giỏ hàng', () => {
    it('should add item to cart', async () => {
      const cart = new Cart({
        user: mockUser._id,
        cartItems: [],
      });
      await cart.save();

      cart.cartItems.push({
        _id: mockProduct._id.toString(),
        name: mockProduct.name,
        slug: mockProduct.slug,
        image: mockProduct.image,
        price: mockProduct.price,
        quantity: 1,
        countInStock: mockProduct.countInStock,
      });

      const updatedCart = await cart.save();
      expect(updatedCart.cartItems).toHaveLength(1);
    });

    it('should add multiple items to cart', async () => {
      const cart = new Cart({
        user: mockUser._id,
        cartItems: [
          {
            _id: 'product-1',
            name: 'Product 1',
            slug: 'product-1',
            image: '/images/p1.jpg',
            price: 100000,
            quantity: 2,
            countInStock: 10,
          },
          {
            _id: 'product-2',
            name: 'Product 2',
            slug: 'product-2',
            image: '/images/p2.jpg',
            price: 150000,
            quantity: 1,
            countInStock: 5,
          },
        ],
      });

      const savedCart = await cart.save();
      expect(savedCart.cartItems).toHaveLength(2);
    });
  });

  describe('TC-CART-004: Cập nhật số lượng sản phẩm', () => {
    it('should update item quantity', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      savedCart.cartItems[0].quantity = 5;
      const updatedCart = await savedCart.save();

      expect(updatedCart.cartItems[0].quantity).toBe(5);
    });

    it('should handle quantity of 1', async () => {
      const cartData = createMockCartData();
      cartData.cartItems[0].quantity = 1;
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      expect(savedCart.cartItems[0].quantity).toBe(1);
    });
  });

  describe('TC-CART-005: Xóa sản phẩm khỏi giỏ hàng', () => {
    it('should remove item from cart', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      savedCart.cartItems = [];
      const updatedCart = await savedCart.save();

      expect(updatedCart.cartItems).toHaveLength(0);
    });

    it('should remove specific item from cart', async () => {
      const cart = new Cart({
        user: mockUser._id,
        cartItems: [
          {
            _id: 'product-1',
            name: 'Product 1',
            slug: 'product-1',
            image: '/images/p1.jpg',
            price: 100000,
            quantity: 2,
            countInStock: 10,
          },
          {
            _id: 'product-2',
            name: 'Product 2',
            slug: 'product-2',
            image: '/images/p2.jpg',
            price: 150000,
            quantity: 1,
            countInStock: 5,
          },
        ],
      });
      const savedCart = await cart.save();

      savedCart.cartItems = savedCart.cartItems.filter(
        (item) => item._id !== 'product-1'
      );
      const updatedCart = await savedCart.save();

      expect(updatedCart.cartItems).toHaveLength(1);
      expect(updatedCart.cartItems[0]._id).toBe('product-2');
    });
  });

  describe('TC-CART-006: Cập nhật địa chỉ giao hàng', () => {
    it('should update shipping address', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      savedCart.shippingAddress = {
        fullName: 'New Name',
        address: '456 New Street',
        city: 'New City',
        postalCode: '67890',
        country: 'USA',
      };
      const updatedCart = await savedCart.save();

      expect(updatedCart.shippingAddress.fullName).toBe('New Name');
      expect(updatedCart.shippingAddress.city).toBe('New City');
    });

    it('should have default empty shipping address', async () => {
      const cart = new Cart({
        user: mockUser._id,
        cartItems: [],
      });
      const savedCart = await cart.save();

      expect(savedCart.shippingAddress.fullName).toBe('');
      expect(savedCart.shippingAddress.address).toBe('');
    });
  });

  describe('TC-CART-007: Cập nhật phương thức thanh toán', () => {
    it('should update payment method to PayPal', async () => {
      const cartData = createMockCartData({ paymentMethod: '' });
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      savedCart.paymentMethod = 'PayPal';
      const updatedCart = await savedCart.save();

      expect(updatedCart.paymentMethod).toBe('PayPal');
    });

    it('should update payment method to COD', async () => {
      const cartData = createMockCartData({ paymentMethod: 'PayPal' });
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      savedCart.paymentMethod = 'COD';
      const updatedCart = await savedCart.save();

      expect(updatedCart.paymentMethod).toBe('COD');
    });
  });

  describe('TC-CART-008: Xóa giỏ hàng', () => {
    it('should delete cart', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      await Cart.findByIdAndDelete(savedCart._id);
      const deletedCart = await Cart.findById(savedCart._id);

      expect(deletedCart).toBeNull();
    });

    it('should delete cart by user', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      await cart.save();

      await Cart.findOneAndDelete({ user: mockUser._id });
      const deletedCart = await Cart.findOne({ user: mockUser._id });

      expect(deletedCart).toBeNull();
    });
  });

  describe('TC-CART-009: Tìm kiếm giỏ hàng', () => {
    it('should find cart by user', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      await cart.save();

      const foundCart = await Cart.findOne({ user: mockUser._id });

      expect(foundCart).toBeDefined();
      expect(foundCart.user.toString()).toBe(mockUser._id.toString());
    });

    it('should return null for non-existent cart', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const foundCart = await Cart.findOne({ user: fakeUserId });

      expect(foundCart).toBeNull();
    });
  });

  describe('TC-CART-010: Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();

      expect(savedCart.createdAt).toBeDefined();
      expect(savedCart.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const cartData = createMockCartData();
      const cart = new Cart(cartData);
      const savedCart = await cart.save();
      const originalUpdatedAt = savedCart.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      savedCart.paymentMethod = 'COD';
      const updatedCart = await savedCart.save();

      expect(updatedCart.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
