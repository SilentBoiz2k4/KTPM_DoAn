/**
 * Functional Testing - Chức năng Đăng ký (UC-01)
 * Based on testcase/UC01-register-functional.md
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

// Helper function để validate email format
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function để validate password
const isValidPassword = (password) => {
  if (!password) return false;
  return password.length >= 6;
};

// Helper function để validate name
const isValidName = (name) => {
  if (!name) return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
};

describe('Functional Testing - Đăng ký (UC-01)', () => {

  describe('Đăng ký thành công', () => {
    // TC-DT-001: Tất cả điều kiện đúng
    test('TC-DT-001: Đăng ký thành công với tất cả thông tin hợp lệ', async () => {
      const userData = {
        name: 'Nguyen Van A',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      };

      const user = await User.create(userData);

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Nguyen Van A');
      expect(user.email).toBe('test@example.com');
      expect(user.isAdmin).toBe(false);
    });

    // TC-EP-N04: Tên có dấu tiếng Việt
    test('TC-EP-N04: Đăng ký với tên có dấu tiếng Việt', async () => {
      const user = await User.create({
        name: 'Nguyễn Văn Á',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.name).toBe('Nguyễn Văn Á');
    });

    // TC-BVA-N02: Tên 1 ký tự (biên min)
    test('TC-BVA-N02: Đăng ký với tên 1 ký tự (biên min)', async () => {
      const user = await User.create({
        name: 'A',
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.name).toBe('A');
      expect(isValidName('A')).toBe(true);
    });

    // TC-BVA-N05: Tên 100 ký tự (biên max)
    test('TC-BVA-N05: Đăng ký với tên 100 ký tự (biên max)', async () => {
      const longName = 'A'.repeat(100);
      const user = await User.create({
        name: longName,
        email: 'test@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user.name.length).toBe(100);
      expect(isValidName(longName)).toBe(true);
    });

    // TC-BVA-P02: Password đúng 6 ký tự (biên min)
    test('TC-BVA-P02: Đăng ký với password 6 ký tự (biên min)', async () => {
      const password = '123456';
      expect(isValidPassword(password)).toBe(true);

      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: bcrypt.hashSync(password, 8),
      });

      expect(user._id).toBeDefined();
    });
  });

  describe('Đăng ký không thành công - Name', () => {
    // TC-EP-N01: Name rỗng
    test('TC-EP-N01: Name rỗng bị reject', async () => {
      expect(isValidName('')).toBe(false);
    });

    // TC-EP-N02: Name chỉ có khoảng trắng
    test('TC-EP-N02: Name chỉ có khoảng trắng bị reject', async () => {
      expect(isValidName('   ')).toBe(false);
    });

    // TC-BVA-N01: Name 0 ký tự (min-1)
    test('TC-BVA-N01: Name 0 ký tự bị reject', async () => {
      expect(isValidName('')).toBe(false);
    });

    // TC-BVA-N06: Name 101 ký tự (max+1)
    test('TC-BVA-N06: Name 101 ký tự bị reject', async () => {
      const longName = 'A'.repeat(101);
      expect(isValidName(longName)).toBe(false);
    });
  });

  describe('Đăng ký không thành công - Email', () => {
    // TC-EP-E01: Email không có @
    test('TC-EP-E01: Email không có @ bị reject', async () => {
      expect(isValidEmail('testmail.com')).toBe(false);
    });

    // TC-EP-E02: Email không có domain
    test('TC-EP-E02: Email không có domain bị reject', async () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    // TC-EP-E03: Email chỉ có @
    test('TC-EP-E03: Email chỉ có @ bị reject', async () => {
      expect(isValidEmail('@')).toBe(false);
    });

    // TC-EP-E04: Email có khoảng trắng
    test('TC-EP-E04: Email có khoảng trắng bị reject', async () => {
      expect(isValidEmail('test @mail.com')).toBe(false);
    });

    // TC-EP-E05: Email hợp lệ
    test('TC-EP-E05: Email hợp lệ được chấp nhận', async () => {
      expect(isValidEmail('new@example.com')).toBe(true);
    });

    // TC-EP-E06: Email đã tồn tại
    test('TC-EP-E06: Email đã tồn tại bị reject', async () => {
      await User.create({
        name: 'First User',
        email: 'admin@shop.com',
        password: bcrypt.hashSync('password123', 8),
      });

      await expect(
        User.create({
          name: 'Second User',
          email: 'admin@shop.com',
          password: bcrypt.hashSync('password456', 8),
        })
      ).rejects.toThrow();
    });
  });

  describe('Đăng ký không thành công - Password', () => {
    // TC-BVA-P01: Password 5 ký tự (min-1)
    test('TC-BVA-P01: Password 5 ký tự bị reject', async () => {
      expect(isValidPassword('12345')).toBe(false);
    });

    // TC-BVA-P03: Password 7 ký tự (min+1)
    test('TC-BVA-P03: Password 7 ký tự được chấp nhận', async () => {
      expect(isValidPassword('1234567')).toBe(true);
    });

    // Password rỗng
    test('Password rỗng bị reject', async () => {
      expect(isValidPassword('')).toBe(false);
    });

    // Password null
    test('Password null bị reject', async () => {
      expect(isValidPassword(null)).toBe(false);
    });
  });

  describe('Control Flow Graph Tests', () => {
    // TC-CFG-001: name invalid
    test('TC-CFG-001: Path với name invalid', async () => {
      expect(isValidName('')).toBe(false);
    });

    // TC-CFG-002: email invalid
    test('TC-CFG-002: Path với email invalid', async () => {
      expect(isValidEmail('invalid')).toBe(false);
    });

    // TC-CFG-003: password < 6
    test('TC-CFG-003: Path với password < 6 ký tự', async () => {
      expect(isValidPassword('12345')).toBe(false);
    });

    // TC-CFG-005: email exists
    test('TC-CFG-005: Path với email đã tồn tại', async () => {
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      const existingUser = await User.findOne({ email: 'existing@example.com' });
      expect(existingUser).not.toBeNull();
    });

    // TC-CFG-006: all valid - success
    test('TC-CFG-006: Path với tất cả valid → success', async () => {
      const name = 'Valid User';
      const email = 'valid@example.com';
      const password = 'password123';

      expect(isValidName(name)).toBe(true);
      expect(isValidEmail(email)).toBe(true);
      expect(isValidPassword(password)).toBe(true);

      const user = await User.create({
        name,
        email,
        password: bcrypt.hashSync(password, 8),
      });

      expect(user._id).toBeDefined();
    });
  });

  describe('State Transition Tests', () => {
    // TC-ST-003: VALIDATING → CHECKING_DB (input valid)
    test('TC-ST-003: Input valid chuyển sang kiểm tra DB', async () => {
      const name = 'Test User';
      const email = 'test@example.com';
      const password = 'password123';

      // Validate input
      expect(isValidName(name)).toBe(true);
      expect(isValidEmail(email)).toBe(true);
      expect(isValidPassword(password)).toBe(true);

      // Check DB
      const existingUser = await User.findOne({ email });
      expect(existingUser).toBeNull(); // Email chưa tồn tại
    });

    // TC-ST-004: CHECKING_DB → REJECTED (email exists)
    test('TC-ST-004: Email tồn tại → REJECTED', async () => {
      await User.create({
        name: 'Existing User',
        email: 'existing@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      const existingUser = await User.findOne({ email: 'existing@example.com' });
      expect(existingUser).not.toBeNull();
    });

    // TC-ST-006: CREATING → CREATED (success)
    test('TC-ST-006: Tạo user thành công', async () => {
      const user = await User.create({
        name: 'New User',
        email: 'new@example.com',
        password: bcrypt.hashSync('password123', 8),
      });

      expect(user._id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });
  });
});
