import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('strictQuery', true);

const uri = process.env.MONGODB_URI;

mongoose
  .connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 45000,
    family: 4,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas from HOST successfully!');
    mongoose.connection.close();  // Đóng connect
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ HOST connection error:', err);
    console.error('Error message:', err.message);
    process.exit(1);
  });