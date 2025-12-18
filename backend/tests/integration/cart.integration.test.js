import request from 'supertest';
import createApp from '../../app.js';
import {
  setupIntegrationDB,
  generateTestToken,
  createTestUser,
  createTestProduct,
  createTestCart,
  mockCartPayload,
} from './setup.js';

const app = createApp();

// Setup test database
setupIntegrationDB();

describe('Cart API Integration Tests', () => {
  let testUser;
  let testProduct;
  let userToken;

  beforeEach(async () => {
    testUser = await createTestUser();
    testProduct = await createTestProduct();
    userToken = generateTestToken(testUser);
  });

  describe('GET /api/cart - Lấy giỏ hàng', () => {
    it('TC-INT-CART-001: Lấy giỏ hàng thành công khi có dữ liệu', async () => {
      await createTestCart(testUser._id, testProduct._id);

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cartItems).toHaveLength(1);
      expect(res.body.user.toString()).toBe(testUser._id.toString());
    });

    it('TC-INT-CART-002: Trả về giỏ hàng rỗng khi chưa có dữ liệu', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cartItems).toHaveLength(0);
    });

    it('TC-INT-CART-003: Từ chối truy cập khi chưa đăng nhập', async () => {
      const res = await request(app)
        .get('/api/cart');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('No Token');
    });

    it('TC-INT-CART-004: Từ chối truy cập với token không hợp lệ', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid Token');
    });
  });


  describe('POST /api/cart - Tạo/Cập nhật giỏ hàng', () => {
    it('TC-INT-CART-005: Tạo giỏ hàng mới thành công', async () => {
      const cartPayload = mockCartPayload(testProduct._id);

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send(cartPayload);

      expect(res.status).toBe(201);
      expect(res.body.cartItems).toHaveLength(1);
      expect(res.body.paymentMethod).toBe('PayPal');
    });

    it('TC-INT-CART-006: Cập nhật giỏ hàng đã tồn tại', async () => {
      await createTestCart(testUser._id, testProduct._id);

      const updatedPayload = {
        cartItems: [
          {
            _id: testProduct._id.toString(),
            name: testProduct.name,
            slug: testProduct.slug,
            image: testProduct.image,
            price: testProduct.price,
            quantity: 5, // Updated quantity
            countInStock: testProduct.countInStock,
          },
        ],
      };

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedPayload);

      expect(res.status).toBe(200);
      expect(res.body.cartItems[0].quantity).toBe(5);
    });

    it('TC-INT-CART-007: Thêm nhiều sản phẩm vào giỏ hàng', async () => {
      const product2 = await createTestProduct({ name: 'Product 2', slug: 'product-2' });

      const cartPayload = {
        cartItems: [
          {
            _id: testProduct._id.toString(),
            name: testProduct.name,
            slug: testProduct.slug,
            image: testProduct.image,
            price: testProduct.price,
            quantity: 1,
            countInStock: testProduct.countInStock,
          },
          {
            _id: product2._id.toString(),
            name: product2.name,
            slug: product2.slug,
            image: product2.image,
            price: product2.price,
            quantity: 2,
            countInStock: product2.countInStock,
          },
        ],
        paymentMethod: 'COD',
      };

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send(cartPayload);

      expect(res.status).toBe(201);
      expect(res.body.cartItems).toHaveLength(2);
    });

    it('TC-INT-CART-008: Cập nhật địa chỉ giao hàng', async () => {
      await createTestCart(testUser._id, testProduct._id);

      const updatedPayload = {
        shippingAddress: {
          fullName: 'New Name',
          address: '456 New Street',
          city: 'New City',
          postalCode: '67890',
          country: 'USA',
        },
      };

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedPayload);

      expect(res.status).toBe(200);
      expect(res.body.shippingAddress.fullName).toBe('New Name');
      expect(res.body.shippingAddress.city).toBe('New City');
    });

    it('TC-INT-CART-009: Cập nhật phương thức thanh toán', async () => {
      await createTestCart(testUser._id, testProduct._id);

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ paymentMethod: 'COD' });

      expect(res.status).toBe(200);
      expect(res.body.paymentMethod).toBe('COD');
    });

    it('TC-INT-CART-010: Từ chối tạo giỏ hàng khi chưa đăng nhập', async () => {
      const cartPayload = mockCartPayload(testProduct._id);

      const res = await request(app)
        .post('/api/cart')
        .send(cartPayload);

      expect(res.status).toBe(401);
    });
  });


  describe('DELETE /api/cart - Xóa giỏ hàng', () => {
    it('TC-INT-CART-011: Xóa giỏ hàng thành công', async () => {
      await createTestCart(testUser._id, testProduct._id);

      const res = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Cart cleared');

      // Verify cart is deleted
      const getRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(getRes.body.cartItems).toHaveLength(0);
    });

    it('TC-INT-CART-012: Xóa giỏ hàng khi đã rỗng', async () => {
      const res = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Cart already empty');
    });

    it('TC-INT-CART-013: Từ chối xóa giỏ hàng khi chưa đăng nhập', async () => {
      const res = await request(app)
        .delete('/api/cart');

      expect(res.status).toBe(401);
    });
  });

  describe('Cart Isolation Tests', () => {
    it('TC-INT-CART-014: Mỗi user có giỏ hàng riêng biệt', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateTestToken(otherUser);

      // Create cart for testUser
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cartItems: [
            {
              _id: testProduct._id.toString(),
              name: 'Product for User 1',
              slug: testProduct.slug,
              image: testProduct.image,
              price: 100000,
              quantity: 2,
              countInStock: 10,
            },
          ],
        });

      // Create cart for otherUser
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          cartItems: [
            {
              _id: testProduct._id.toString(),
              name: 'Product for User 2',
              slug: testProduct.slug,
              image: testProduct.image,
              price: 200000,
              quantity: 3,
              countInStock: 10,
            },
          ],
        });

      // Verify testUser's cart
      const res1 = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res1.body.cartItems[0].quantity).toBe(2);

      // Verify otherUser's cart
      const res2 = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res2.body.cartItems[0].quantity).toBe(3);
    });

    it('TC-INT-CART-015: Xóa giỏ hàng không ảnh hưởng user khác', async () => {
      const otherUser = await createTestUser({ email: 'other2@example.com' });
      const otherToken = generateTestToken(otherUser);

      // Create carts for both users
      await createTestCart(testUser._id, testProduct._id);
      await createTestCart(otherUser._id, testProduct._id);

      // Delete testUser's cart
      await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      // Verify otherUser's cart still exists
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.body.cartItems).toHaveLength(1);
    });
  });
});
