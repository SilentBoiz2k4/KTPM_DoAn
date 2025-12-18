import express from 'express';
import cors from 'cors';
import seedRouter from './routes/seedRoutes.js';
import productRouter from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import cartRouter from './routes/cartRoutes.js';

const createApp = () => {
  const app = express();

  // CORS Configuration
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
  });

  // API endpoint to return PayPal client ID
  app.get('/api/keys/paypal', (req, res) => {
    res.send(process.env.PAYPAL_CLIENT_ID || 'sb');
  });

  // API Routes
  app.use('/api/seed', seedRouter);
  app.use('/api/products', productRouter);
  app.use('/api/users', userRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/cart', cartRouter);

  // Error handling middleware
  app.use((err, req, res, next) => {
    res.status(500).send({ message: err.message });
  });

  return app;
};

export default createApp;
