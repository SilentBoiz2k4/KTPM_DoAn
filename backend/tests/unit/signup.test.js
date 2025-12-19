import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../models/userModel.js';

let mongoServer;

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

describe('Signup - Unit Tests', () => {
  // Test 1: Đăng ký thành công với thông tin hợp lệ
  test('should create new user with hashed password', async () => {
    // Arrange
    const plainPassword = 'password123';
    const userData = {
      name: 'New User',
      email: 'newuser@example.com',
      password: bcrypt.hashSync(plainPassword, 8),
    };

    // Act: Tạo user mới
    const user = await User.create(userData);

    // Assert
    expect(user).not.toBeNull();
    expect(user.name).toBe('New User');
    expect(user.email).toBe('newuser@example.com');
    expect(user.isAdmin).toBe(false); // default value
    expect(bcrypt.compareSync(plainPassword, user.password)).toBe(true);
  });

  // Test 2: Đăng ký thất bại khi email đã tồn tại
  test('should reject duplicate email', async () => {
    // Arrange: Tạo user đầu tiên
    await User.create({
      name: 'First User',
      email: 'duplicate@example.com',
      password: bcrypt.hashSync('password123', 8),
    });

    // Act & Assert: Tạo user thứ 2 với cùng email
    await expect(
      User.create({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: bcrypt.hashSync('password456', 8),
      })
    ).rejects.toThrow();
  });
});
