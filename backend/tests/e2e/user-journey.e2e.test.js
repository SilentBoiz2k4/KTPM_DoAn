/**
 * E2E TESTS - User Journey
 * 
 * Test các kịch bản người dùng thực tế:
 * - Khách hàng mới mua hàng lần đầu
 * - Khách hàng quay lại mua hàng
 * - Khách hàng mua nhiều đơn hàng
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

describe('E2E: User Journey Scenarios', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('E2E-USER-001: First-time Customer Journey', () => {
    it('should handle complete first-time customer experience', async () => {
      // New user registers and makes first purchase
      const { user, token } = await createUser({
        name: 'First Time Buyer',
        email: 'firsttime@test.com',
      });
      const { token: adminToken } = await createAdmin();
      const products = await createProducts(2);

      // Step 1: User adds items to cart
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItems: [{
            _id: products[0]._id.toString(),
            name: products[0].name,
            slug: products[0].slug,
            image: products[0].image,
            price: products[0].price,
            quantity: 1,
            countInStock: products[0].countInStock,
          }],
        });

      // Step 2: User fills shipping info
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            fullName: 'First Time Buyer',
            address: '123 New Customer St',
            city: 'Ho Chi Minh',
            postalCode: '70000',
            country: 'Vietnam',
          },
          paymentMethod: 'PayPal',
        });

      // Step 3: User places order
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
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
            fullName: 'First Time Buyer',
            address: '123 New Customer St',
            city: 'Ho Chi Minh',
            postalCode: '70000',
            country: 'Vietnam',
          },
          paymentMethod: 'PayPal',
          itemsPrice: products[0].price,
          shippingPrice: 30000,
          taxPrice: products[0].price * 0.1,
          totalPrice: products[0].price + 30000 + products[0].price * 0.1,
        });

      expect(orderRes.status).toBe(201);

      // Step 4: User pays
      const orderId = orderRes.body.order._id;
      await request(app)
        .put(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 'FIRST-TIME-PAY-001',
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: 'firsttime@test.com',
        });

      // Step 5: Check order history (should have 1 order)
      const historyRes = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${token}`);

      expect(historyRes.body).toHaveLength(1);
      expect(historyRes.body[0].isPaid).toBe(true);
    });
  });


  describe('E2E-USER-002: Returning Customer Journey', () => {
    it('should handle returning customer with saved preferences', async () => {
      const { user, token } = await createUser({
        name: 'Returning Customer',
        email: 'returning@test.com',
      });
      const { token: adminToken } = await createAdmin();
      const products = await createProducts(3);

      // Returning customer already has shipping info saved
      const savedShippingAddress = {
        fullName: 'Returning Customer',
        address: '456 Loyal Customer Ave',
        city: 'Da Nang',
        postalCode: '50000',
        country: 'Vietnam',
      };

      // Quick checkout with saved info
      const cartRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItems: [{
            _id: products[2]._id.toString(),
            name: products[2].name,
            slug: products[2].slug,
            image: products[2].image,
            price: products[2].price,
            quantity: 3,
            countInStock: products[2].countInStock,
          }],
          shippingAddress: savedShippingAddress,
          paymentMethod: 'COD', // Returning customer prefers COD
        });

      expect(cartRes.status).toBe(201);

      // Place order quickly
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderItems: [{
            _id: products[2]._id.toString(),
            slug: products[2].slug,
            name: products[2].name,
            quantity: 3,
            image: products[2].image,
            price: products[2].price,
          }],
          shippingAddress: savedShippingAddress,
          paymentMethod: 'COD',
          itemsPrice: products[2].price * 3,
          shippingPrice: 0, // Free shipping for large order
          taxPrice: products[2].price * 3 * 0.1,
          totalPrice: products[2].price * 3 * 1.1,
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.paymentMethod).toBe('COD');
    });
  });

  describe('E2E-USER-003: Multiple Orders Journey', () => {
    it('should handle customer placing multiple orders', async () => {
      const { user, token } = await createUser({
        name: 'Frequent Buyer',
        email: 'frequent@test.com',
      });
      const products = await createProducts(5);

      const shippingAddress = {
        fullName: 'Frequent Buyer',
        address: '789 Shopping St',
        city: 'Hanoi',
        postalCode: '10000',
        country: 'Vietnam',
      };

      // Place 3 orders
      for (let i = 0; i < 3; i++) {
        const orderRes = await request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${token}`)
          .send({
            orderItems: [{
              _id: products[i]._id.toString(),
              slug: products[i].slug,
              name: products[i].name,
              quantity: i + 1,
              image: products[i].image,
              price: products[i].price,
            }],
            shippingAddress,
            paymentMethod: i % 2 === 0 ? 'PayPal' : 'COD',
            itemsPrice: products[i].price * (i + 1),
            shippingPrice: 30000,
            taxPrice: products[i].price * (i + 1) * 0.1,
            totalPrice: products[i].price * (i + 1) * 1.1 + 30000,
          });

        expect(orderRes.status).toBe(201);
      }

      // Verify all orders in history
      const historyRes = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${token}`);

      expect(historyRes.body).toHaveLength(3);
    });
  });

  describe('E2E-USER-004: Cart Modification Journey', () => {
    it('should handle cart modifications before checkout', async () => {
      const { token } = await createUser();
      const products = await createProducts(4);

      // Step 1: Add first item
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItems: [{
            _id: products[0]._id.toString(),
            name: products[0].name,
            slug: products[0].slug,
            image: products[0].image,
            price: products[0].price,
            quantity: 1,
            countInStock: products[0].countInStock,
          }],
        });

      // Step 2: Add more items
      const addMoreRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItems: [
            {
              _id: products[0]._id.toString(),
              name: products[0].name,
              slug: products[0].slug,
              image: products[0].image,
              price: products[0].price,
              quantity: 2, // Increased quantity
              countInStock: products[0].countInStock,
            },
            {
              _id: products[1]._id.toString(),
              name: products[1].name,
              slug: products[1].slug,
              image: products[1].image,
              price: products[1].price,
              quantity: 1,
              countInStock: products[1].countInStock,
            },
          ],
        });

      expect(addMoreRes.body.cartItems).toHaveLength(2);
      expect(addMoreRes.body.cartItems[0].quantity).toBe(2);

      // Step 3: Remove one item
      const removeRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cartItems: [{
            _id: products[0]._id.toString(),
            name: products[0].name,
            slug: products[0].slug,
            image: products[0].image,
            price: products[0].price,
            quantity: 2,
            countInStock: products[0].countInStock,
          }],
        });

      expect(removeRes.body.cartItems).toHaveLength(1);

      // Step 4: Proceed to checkout
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          orderItems: [{
            _id: products[0]._id.toString(),
            slug: products[0].slug,
            name: products[0].name,
            quantity: 2,
            image: products[0].image,
            price: products[0].price,
          }],
          shippingAddress: {
            fullName: 'Cart Modifier',
            address: '123 Modify St',
            city: 'HCMC',
            postalCode: '70000',
            country: 'Vietnam',
          },
          paymentMethod: 'PayPal',
          itemsPrice: products[0].price * 2,
          shippingPrice: 30000,
          taxPrice: products[0].price * 2 * 0.1,
          totalPrice: products[0].price * 2 * 1.1 + 30000,
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.orderItems).toHaveLength(1);
      expect(orderRes.body.order.orderItems[0].quantity).toBe(2);
    });
  });
});
