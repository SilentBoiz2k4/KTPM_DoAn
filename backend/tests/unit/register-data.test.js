/**
 * Data Testing - Chức năng Đăng ký (UC-01)
 * Based on testcase/UC01-register-data.md
 */
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

describe('Data Testing - Đăng ký (UC-01)', () => {

  describe('Unique Constraint', () => {
    // TC-DATA-001: Email unique
    test('TC-DATA-001: Email phải unique trong database', async () => {
      await User.create({
        name: 'First User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      await expect(
        User.create({
          name: 'Second User',
          email: 'test@example.com',
          password: bcrypt.hashSync('password456', 8),
        })
      ).rejects.toThrow();
    });

    // TC-DATA-003: _id unique
    test('TC-DATA-003: _id của 2 users phải khác nhau', async () => {
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user1._id.toString()).not.toBe(user2._id.toString());
    });
  });

  describe('Required Fields', () => {
    // TC-DATA-004: name required
    test('TC-DATA-004: name là trường bắt buộc', async () => {
      await expect(
        User.create({
          email: 'test@example.com',
          password: bcrypt.hashSync('password123', 8),
        })
      ).rejects.toThrow();
    });

    // TC-DATA-005: email required
    test('TC-DATA-005: email là trường bắt buộc', async () => {
      await expect(
        User.create({
          name: 'Test User',
          password: bcrypt.hashSync('password123', 8),
        })
      ).rejects.toThrow();
    });

    // TC-DATA-006: password required
    test('TC-DATA-006: password là trường bắt buộc', async () => {
      await expect(
        User.create({
          name: 'Test User',
          email: 'test@example.com',
        })
      ).rejects.toThrow();
    });
  });

  describe('Data Transformation', () => {
    // TC-DATA-010: isAdmin default = false
    test('TC-DATA-010: isAdmin mặc định là false', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.isAdmin).toBe(false);
    });

    // TC-DATA-011: createdAt auto-generated
    test('TC-DATA-011: createdAt được tự động tạo', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt instanceof Date).toBe(true);
    });
  });

  describe('Password Storage', () => {
    // TC-DATA-012: Hash format
    test('TC-DATA-012: Password hash bắt đầu bằng $2', async () => {
      const hashedPassword = bcrypt.hashSync('password123', 8);
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
      });

      expect(user.password.startsWith('$2')).toBe(true);
    });

    // TC-DATA-013: Hash length
    test('TC-DATA-013: Password hash có độ dài ~60 ký tự', async () => {
      const hashedPassword = bcrypt.hashSync('password123', 8);
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
      });

      expect(user.password.length).toBeGreaterThanOrEqual(55);
      expect(user.password.length).toBeLessThanOrEqual(65);
    });

    // TC-DATA-014: Not plaintext
    test('TC-DATA-014: Password không lưu plaintext', async () => {
      const plainPassword = 'password123';
      const hashedPassword = bcrypt.hashSync(plainPassword, 8);
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: hashedPassword,
      });

      expect(user.password).not.toBe(plainPassword);
    });

    // TC-DATA-015: Random salt
    test('TC-DATA-015: Cùng password tạo ra hash khác nhau (random salt)', async () => {
      const plainPassword = 'password123';
      
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: bcrypt.hashSync(plainPassword, 8),
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: bcrypt.hashSync(plainPassword, 8),
      });

      // Cùng password nhưng hash khác nhau do random salt
      expect(user1.password).not.toBe(user2.password);
      
      // Nhưng cả 2 đều verify được với plaintext
      expect(bcrypt.compareSync(plainPassword, user1.password)).toBe(true);
      expect(bcrypt.compareSync(plainPassword, user2.password)).toBe(true);
    });
  });
});
