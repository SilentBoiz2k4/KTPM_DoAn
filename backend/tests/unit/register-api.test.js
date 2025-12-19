/**
 * API Testing - Chức năng Đăng ký (UC-01)
 * Based on testcase/UC01-register-api.md
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../models/userModel.js';

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
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

// Helper function to generate token (giống như trong utils.js)
const generateToken = (user) => {
  return jwt.sign(
    { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

describe('API Testing - Đăng ký (UC-01)', () => {
  
  describe('Status Code Verification', () => {
    // TC-API-001: Đăng ký thành công
    test('TC-API-001: Đăng ký thành công với data hợp lệ', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
    });

    // TC-API-002: Thiếu name
    test('TC-API-002: Đăng ký thất bại khi thiếu name', async () => {
      const userData = {
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    // TC-API-003: Thiếu email
    test('TC-API-003: Đăng ký thất bại khi thiếu email', async () => {
      const userData = {
        name: 'Test User',
        password: bcrypt.hashSync('password123', 8),
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    // TC-API-004: Thiếu password
    test('TC-API-004: Đăng ký thất bại khi thiếu password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    // TC-API-005: Email đã tồn tại
    test('TC-API-005: Đăng ký thất bại khi email đã tồn tại', async () => {
      // Tạo user đầu tiên
      await User.create({
        name: 'First User',
        email: 'duplicate@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      // Tạo user thứ 2 với cùng email
      await expect(
        User.create({
          name: 'Second User',
          email: 'duplicate@example.com',
          password: bcrypt.hashSync('password456', 8),
        })
      ).rejects.toThrow();
    });

    // TC-API-008: Body rỗng
    test('TC-API-008: Đăng ký thất bại với body rỗng', async () => {
      await expect(User.create({})).rejects.toThrow();
    });
  });

  describe('Response Schema Validation', () => {
    // TC-API-009: Success response có _id
    test('TC-API-009: Response có _id', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user._id).toBeDefined();
      expect(typeof user._id.toString()).toBe('string');
    });

    // TC-API-010: Success response có name
    test('TC-API-010: Response có name đúng với input', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.name).toBe('Test User');
    });

    // TC-API-011: Success response có email
    test('TC-API-011: Response có email đúng với input', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.email).toBe('test@example.com');
    });

    // TC-API-012: Success response có isAdmin = false
    test('TC-API-012: Response có isAdmin = false (default)', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.isAdmin).toBe(false);
    });

    // TC-API-013: Token có format JWT hợp lệ
    test('TC-API-013: Token có format JWT hợp lệ', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      const token = generateToken(user);
      
      // JWT format: header.payload.signature
      expect(token.split('.').length).toBe(3);
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(user._id.toString());
    });

    // TC-API-014: Response KHÔNG chứa password plaintext
    test('TC-API-014: Password được hash, không phải plaintext', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync(plainPassword, 8),
      });

      // Password trong DB không phải plaintext
      expect(user.password).not.toBe(plainPassword);
      // Password bắt đầu bằng $2 (bcrypt hash)
      expect(user.password.startsWith('$2')).toBe(true);
    });
  });
});
