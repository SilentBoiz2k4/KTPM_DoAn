/**
 * E2E TESTS - Checkout Flow
 * 
 * Test toàn bộ quy trình đặt hàng từ đầu đến cuối:
 * 1. User đăng ký/đăng nhập
 * 2. Thêm sản phẩm vào giỏ hàng
 * 3. Cập nhật thông tin giao hàng
 * 4. Chọn phương thức thanh toán
 * 5. Đặt hàng
 * 6. Thanh toán
 * 7. Admin xử lý đơn hàng
 * 8. Giao hàng hoàn tất
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

describe('E2E: Complete Checkout Flow', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('E2E-FLOW-001: PayPal Checkout - Full Journey', () => {
    it('should complete entire PayPal checkout flow from registration to delivery', async () => {
      // ========== SETUP ==========
      const { user, token: userToken } = await createUser();
      const { token: adminToken } = await createAdmin();
      const products = await createProducts(3);

      // ========== STEP 1: Browse Products (simulated) ==========
      // User browses and selects products

      // ========== STEP 2: Add Items to Cart ==========
      const cartPayload = {
        cartItems: [
          {
            _id: products[0]._id.toString(),
            name: products[0].name,
            slug: products[0].slug,
            image: products[0].image,
            price: products[0].price,
            quantity: 2,
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
      };

      const cartRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send(cartPayload);

      expect(cartRes.status).toBe(201);
      expect(cartRes.body.cartItems).toHaveLength(2);

      // ========== STEP 3: Update Shipping Address ==========
      const shippingAddress = {
        fullName: 'Nguyen Van A',
        address: '123 Nguyen Hue Street',
        city: 'Ho Chi Minh City',
        postalCode: '70000',
        country: 'Vietnam',
      };

      const updateCartRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ shippingAddress });

      expect(updateCartRes.status).toBe(200);
      expect(updateCartRes.body.shippingAddress.fullName).toBe('Nguyen Van A');

      // ========== STEP 4: Select Payment Method ==========
      const paymentRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ paymentMethod: 'PayPal' });

      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.paymentMethod).toBe('PayPal');

      // ========== STEP 5: Place Order ==========
      const itemsPrice = products[0].price * 2 + products[1].price; // 200000 + 200000 = 400000
      const shippingPrice = 30000;
      const taxPrice = Math.round(itemsPrice * 0.1); // 10% tax
      const totalPrice = itemsPrice + shippingPrice + taxPrice;

      const orderPayload = {
        orderItems: cartPayload.cartItems.map((item) => ({
          ...item,
          product: item._id,
        })),
        shippingAddress,
        paymentMethod: 'PayPal',
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
      };

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.totalPrice).toBe(totalPrice);
      expect(orderRes.body.order.isPaid).toBe(false);
      expect(orderRes.body.order.status).toBe('Pending');

      const orderId = orderRes.body.order._id;

      // ========== STEP 6: Process PayPal Payment ==========
      const paypalPayment = {
        id: 'PAYPAL-E2E-TXN-001',
        status: 'COMPLETED',
        update_time: new Date().toISOString(),
        email_address: 'buyer@paypal.com',
      };

      const payRes = await request(app)
        .put(`/api/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(paypalPayment);

      expect(payRes.status).toBe(200);
      expect(payRes.body.order.isPaid).toBe(true);
      expect(payRes.body.order.paymentResult.id).toBe('PAYPAL-E2E-TXN-001');

      // ========== STEP 7: Verify Cart is Cleared ==========
      const cartCheckRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`);

      expect(cartCheckRes.body.cartItems).toHaveLength(0);

      // ========== STEP 8: Admin Processes Order ==========
      // Admin sees the order
      const adminOrdersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminOrdersRes.status).toBe(200);
      expect(adminOrdersRes.body.length).toBeGreaterThan(0);

      // Admin updates to Processing
      const processingRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      expect(processingRes.body.order.status).toBe('Processing');

      // Admin updates to Shipping
      const shippingRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipping' });

      expect(shippingRes.body.order.status).toBe('Shipping');

      // ========== STEP 9: Order Delivered ==========
      const deliveredRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      expect(deliveredRes.body.order.status).toBe('Delivered');
      expect(deliveredRes.body.order.isDelivered).toBe(true);

      // ========== STEP 10: User Checks Order History ==========
      const historyRes = await request(app)
        .get('/api/orders/mine')
        .set('Authorization', `Bearer ${userToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body).toHaveLength(1);
      expect(historyRes.body[0].status).toBe('Delivered');
      expect(historyRes.body[0].isPaid).toBe(true);
      expect(historyRes.body[0].isDelivered).toBe(true);
    });
  });


  describe('E2E-FLOW-002: COD Checkout - Full Journey', () => {
    it('should complete entire COD checkout flow with payment on delivery', async () => {
      // ========== SETUP ==========
      const { user, token: userToken } = await createUser();
      const { token: adminToken } = await createAdmin();
      const product = await createProduct({ price: 500000 });

      // ========== STEP 1: Add to Cart ==========
      const cartRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          cartItems: [{
            _id: product._id.toString(),
            name: product.name,
            slug: product.slug,
            image: product.image,
            price: product.price,
            quantity: 1,
            countInStock: product.countInStock,
          }],
          shippingAddress: {
            fullName: 'Tran Van B',
            address: '456 Le Loi Street',
            city: 'Da Nang',
            postalCode: '50000',
            country: 'Vietnam',
          },
          paymentMethod: 'COD',
        });

      expect(cartRes.status).toBe(201);

      // ========== STEP 2: Place COD Order ==========
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{
            _id: product._id.toString(),
            slug: product.slug,
            name: product.name,
            quantity: 1,
            image: product.image,
            price: product.price,
          }],
          shippingAddress: {
            fullName: 'Tran Van B',
            address: '456 Le Loi Street',
            city: 'Da Nang',
            postalCode: '50000',
            country: 'Vietnam',
          },
          paymentMethod: 'COD',
          itemsPrice: 500000,
          shippingPrice: 0, // Free shipping for orders > 300000
          taxPrice: 50000,
          totalPrice: 550000,
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.paymentMethod).toBe('COD');
      expect(orderRes.body.order.isPaid).toBe(false);

      const orderId = orderRes.body.order._id;

      // ========== STEP 3: Admin Processes Order ==========
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Processing' });

      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Shipping' });

      // ========== STEP 4: Delivery & COD Payment ==========
      const deliveredRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Delivered' });

      // COD should be marked as paid when delivered
      expect(deliveredRes.body.order.status).toBe('Delivered');
      expect(deliveredRes.body.order.isDelivered).toBe(true);
      expect(deliveredRes.body.order.isPaid).toBe(true);
      expect(deliveredRes.body.order.paymentResult.id).toBe('COD');

      // ========== STEP 5: Verify Final State ==========
      const orderDetailRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderDetailRes.body.status).toBe('Delivered');
      expect(orderDetailRes.body.isPaid).toBe(true);
      expect(orderDetailRes.body.isDelivered).toBe(true);
    });
  });

  describe('E2E-FLOW-003: Order Cancellation Flow', () => {
    it('should allow order cancellation before processing', async () => {
      // ========== SETUP ==========
      const { token: userToken } = await createUser();
      const { token: adminToken } = await createAdmin();
      const product = await createProduct();

      // ========== STEP 1: Create Order ==========
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderItems: [{
            _id: product._id.toString(),
            slug: product.slug,
            name: product.name,
            quantity: 1,
            image: product.image,
            price: product.price,
          }],
          shippingAddress: {
            fullName: 'Cancel Test',
            address: '789 Cancel St',
            city: 'Hanoi',
            postalCode: '10000',
            country: 'Vietnam',
          },
          paymentMethod: 'PayPal',
          itemsPrice: 100000,
          shippingPrice: 30000,
          taxPrice: 10000,
          totalPrice: 140000,
        });

      const orderId = orderRes.body.order._id;
      expect(orderRes.body.order.status).toBe('Pending');

      // ========== STEP 2: Admin Cancels Order ==========
      const cancelRes = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled' });

      expect(cancelRes.body.order.status).toBe('Cancelled');

      // ========== STEP 3: Verify Cancelled State ==========
      const orderDetailRes = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderDetailRes.body.status).toBe('Cancelled');
      expect(orderDetailRes.body.isPaid).toBe(false);
    });
  });
});
