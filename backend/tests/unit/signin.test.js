import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../models/userModel.js';

let mongoServer;

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('Signin - Unit Tests', () => {
  // Test 1: Đăng nhập thành công với email và password đúng
  test('should find user and verify correct password', async () => {
    // Arrange: Tạo user với password đã hash
    const plainPassword = 'password123';
    const hashedPassword = bcrypt.hashSync(plainPassword, 8);
    
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      isAdmin: false,
    });

    // Act: Tìm user và verify password
    const user = await User.findOne({ email: 'test@example.com' });
    const isPasswordValid = bcrypt.compareSync(plainPassword, user.password);

    // Assert
    expect(user).not.toBeNull();
    expect(user.email).toBe('test@example.com');
    expect(isPasswordValid).toBe(true);
  });

  // Test 2: Đăng nhập thất bại với password sai
  test('should reject invalid password', async () => {
    // Arrange: Tạo user
    const hashedPassword = bcrypt.hashSync('correctPassword', 8);
    
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      isAdmin: false,
    });

    // Act: Tìm user và verify với password sai
    const user = await User.findOne({ email: 'test@example.com' });
    const isPasswordValid = bcrypt.compareSync('wrongPassword', user.password);

    // Assert
    expect(user).not.toBeNull();
    expect(isPasswordValid).toBe(false);
  });
});
