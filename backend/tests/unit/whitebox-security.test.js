/**
 * White-box Security Testing
 * Kiểm thử hộp trắng bảo mật: Authentication, Authorization, Input Validation
 * Tập trung vào kiểm tra từng dòng code trong utils.js và routes
 */

import jwt from 'jsonwebtoken';
import { generateToken, isAuth, isAdmin } from '../../utils.js';

// Mock Express request/response
const mockReq = (overrides = {}) => ({
  headers: {},
  user: null,
  params: {},
  body: {},
  ...overrides,
});

const mockRes = () => {
  const res = { statusCode: null, data: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.send = (data) => { res.data = data; return res; };
  return res;
};

describe('White-box Security Testing', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-whitebox-security-testing';
  });

  /**
   * ============================================
   * generateToken() - Line by Line Coverage
   * File: utils.js, Lines 6-18
   * ============================================
   */
  describe('WB-SEC-001: generateToken() Function', () => {
    // Statement Coverage: Line 7-17 (jwt.sign call)
    it('WB-SEC-001a: Should execute jwt.sign with user data', () => {
      const user = {
        _id: '123',
        name: 'Test',
        email: 'test@test.com',
        password: 'hashed',
        isAdmin: false,
      };

      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    // Branch Coverage: Test với user có isAdmin = true
    it('WB-SEC-001b: Should include isAdmin=true in token', () => {
      const adminUser = {
        _id: '456',
        name: 'Admin',
        email: 'admin@test.com',
        password: 'hashed',
        isAdmin: true,
      };

      const token = generateToken(adminUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.isAdmin).toBe(true);
    });

    // Branch Coverage: Test với user có isAdmin = false
    it('WB-SEC-001c: Should include isAdmin=false in token', () => {
      const regularUser = {
        _id: '789',
        name: 'User',
        email: 'user@test.com',
        password: 'hashed',
        isAdmin: false,
      };

      const token = generateToken(regularUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.isAdmin).toBe(false);
    });

    // Security Issue: Password in token
    it('WB-SEC-001d: SECURITY ISSUE - Password included in token', () => {
      const user = {
        _id: '123',
        name: 'Test',
        email: 'test@test.com',
        password: 'secret123',
        isAdmin: false,
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // BUG: Password should NOT be in token!
      expect(decoded.password).toBe('secret123');
      // TODO: Fix generateToken to exclude password
    });

    // Expiration test
    it('WB-SEC-001e: Token should expire in 30 days', () => {
      const user = { _id: '123', name: 'Test', email: 'test@test.com', isAdmin: false };
      const token = generateToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const expirationDays = (decoded.exp - decoded.iat) / (60 * 60 * 24);
      expect(expirationDays).toBe(30);
    });
  });

  /**
   * ============================================
   * isAuth() Middleware - Line by Line Coverage
   * File: utils.js, Lines 20-40
   * ============================================
   */
  describe('WB-SEC-002: isAuth() Middleware', () => {
    /**
     * Path 1: No authorization header
     * Line 22: if (authorization) -> FALSE
     * Line 38-39: else { res.status(401).send({ message: 'No Token' }) }
     */
    it('WB-SEC-002a: Path - No authorization header', () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'No Token' });
      expect(nextCalled).toBe(false);
    });

    /**
     * Path 2: Authorization header exists but token invalid
     * Line 22: if (authorization) -> TRUE
     * Line 24: token = authorization.slice(7, ...)
     * Line 26: jwt.verify -> err
     * Line 27-28: if (err) { res.status(401).send({ message: 'Invalid Token' }) }
     */
    it('WB-SEC-002b: Path - Invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Token' });
      expect(nextCalled).toBe(false);
    });

    /**
     * Path 3: Valid token
     * Line 22: if (authorization) -> TRUE
     * Line 24: token = authorization.slice(7, ...)
     * Line 26: jwt.verify -> success (decode)
     * Line 30-32: else { req.user = decode; next(); }
     */
    it('WB-SEC-002c: Path - Valid token', () => {
      const user = { _id: '123', name: 'Test', email: 'test@test.com', isAdmin: false };
      const token = generateToken(user);
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(req.user).toBeDefined();
      expect(req.user.email).toBe('test@test.com');
      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    /**
     * Condition Coverage: authorization.slice(7, authorization.length)
     * Test với các format khác nhau
     */
    it('WB-SEC-002d: Condition - Bearer prefix extraction', () => {
      const user = { _id: '123', name: 'Test', email: 'test@test.com', isAdmin: false };
      const token = generateToken(user);
      
      // "Bearer " = 7 characters
      const authHeader = `Bearer ${token}`;
      const extractedToken = authHeader.slice(7, authHeader.length);
      
      expect(extractedToken).toBe(token);
    });

    /**
     * Edge Case: Empty Bearer token
     */
    it('WB-SEC-002e: Edge - Empty token after Bearer', () => {
      const req = mockReq({ headers: { authorization: 'Bearer ' } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * Edge Case: Expired token
     */
    it('WB-SEC-002f: Edge - Expired token', () => {
      const expiredToken = jwt.sign(
        { _id: '123', email: 'test@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const req = mockReq({ headers: { authorization: `Bearer ${expiredToken}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Token' });
      expect(nextCalled).toBe(false);
    });

    /**
     * Edge Case: Token with wrong secret
     */
    it('WB-SEC-002g: Edge - Token signed with wrong secret', () => {
      const wrongToken = jwt.sign(
        { _id: '123', email: 'test@test.com' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );
      const req = mockReq({ headers: { authorization: `Bearer ${wrongToken}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Token' });
    });

    /**
     * Edge Case: Malformed JWT (not 3 parts)
     */
    it('WB-SEC-002h: Edge - Malformed JWT structure', () => {
      const req = mockReq({ headers: { authorization: 'Bearer not.a.valid.jwt.token' } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * ============================================
   * isAdmin() Middleware - Line by Line Coverage
   * File: utils.js, Lines 44-52
   * ============================================
   */
  describe('WB-SEC-003: isAdmin() Middleware', () => {
    /**
     * Path 1: req.user exists AND isAdmin = true
     * Line 46: if (req.user && req.user.isAdmin) -> TRUE
     * Line 48: next()
     */
    it('WB-SEC-003a: Path - Admin user granted access', () => {
      const req = mockReq({ user: { _id: '123', isAdmin: true } });
      const res = mockRes();
      let nextCalled = false;

      isAdmin(req, res, () => { nextCalled = true; });

      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    /**
     * Path 2: req.user exists BUT isAdmin = false
     * Line 46: if (req.user && req.user.isAdmin) -> FALSE (isAdmin false)
     * Line 50: res.status(401).send({ message: 'Invalid Admin Token' })
     */
    it('WB-SEC-003b: Path - Non-admin user rejected', () => {
      const req = mockReq({ user: { _id: '123', isAdmin: false } });
      const res = mockRes();
      let nextCalled = false;

      isAdmin(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Admin Token' });
      expect(nextCalled).toBe(false);
    });

    /**
     * Path 3: req.user is null/undefined
     * Line 46: if (req.user && req.user.isAdmin) -> FALSE (req.user falsy)
     * Line 50: res.status(401).send({ message: 'Invalid Admin Token' })
     */
    it('WB-SEC-003c: Path - No user object', () => {
      const req = mockReq({ user: null });
      const res = mockRes();
      let nextCalled = false;

      isAdmin(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'Invalid Admin Token' });
      expect(nextCalled).toBe(false);
    });

    /**
     * Path 4: req.user exists but isAdmin undefined
     * Line 46: if (req.user && req.user.isAdmin) -> FALSE (isAdmin undefined)
     */
    it('WB-SEC-003d: Path - User without isAdmin property', () => {
      const req = mockReq({ user: { _id: '123', name: 'Test' } }); // No isAdmin
      const res = mockRes();
      let nextCalled = false;

      isAdmin(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * Condition Coverage: req.user && req.user.isAdmin
     * Test all 4 combinations
     */
    describe('Condition Coverage: req.user && req.user.isAdmin', () => {
      it('WB-SEC-003e: user=truthy, isAdmin=true -> TRUE', () => {
        const req = mockReq({ user: { isAdmin: true } });
        const res = mockRes();
        let nextCalled = false;
        isAdmin(req, res, () => { nextCalled = true; });
        expect(nextCalled).toBe(true);
      });

      it('WB-SEC-003f: user=truthy, isAdmin=false -> FALSE', () => {
        const req = mockReq({ user: { isAdmin: false } });
        const res = mockRes();
        let nextCalled = false;
        isAdmin(req, res, () => { nextCalled = true; });
        expect(nextCalled).toBe(false);
      });

      it('WB-SEC-003g: user=null, isAdmin=N/A -> FALSE', () => {
        const req = mockReq({ user: null });
        const res = mockRes();
        let nextCalled = false;
        isAdmin(req, res, () => { nextCalled = true; });
        expect(nextCalled).toBe(false);
      });

      it('WB-SEC-003h: user=undefined, isAdmin=N/A -> FALSE', () => {
        const req = mockReq({ user: undefined });
        const res = mockRes();
        let nextCalled = false;
        isAdmin(req, res, () => { nextCalled = true; });
        expect(nextCalled).toBe(false);
      });
    });
  });

  /**
   * ============================================
   * Security Attack Vectors - White-box Testing
   * ============================================
   */
  describe('WB-SEC-004: Security Attack Vectors', () => {
    /**
     * JWT Algorithm Confusion Attack
     * Attacker tries to use 'none' algorithm
     */
    it('WB-SEC-004a: JWT Algorithm None Attack', () => {
      // Create token with 'none' algorithm (attack vector)
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ _id: '123', isAdmin: true })).toString('base64url');
      const maliciousToken = `${header}.${payload}.`;

      const req = mockReq({ headers: { authorization: `Bearer ${maliciousToken}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      // Should reject - jwt.verify requires valid signature
      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * JWT Payload Tampering
     * Attacker modifies payload but keeps signature
     */
    it('WB-SEC-004b: JWT Payload Tampering Attack', () => {
      const user = { _id: '123', isAdmin: false };
      const token = generateToken(user);
      const parts = token.split('.');
      
      // Tamper payload to make isAdmin=true
      const tamperedPayload = Buffer.from(JSON.stringify({ 
        _id: '123', 
        isAdmin: true,
        exp: Math.floor(Date.now() / 1000) + 3600 
      })).toString('base64url');
      
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const req = mockReq({ headers: { authorization: `Bearer ${tamperedToken}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      // Should reject - signature won't match
      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * SQL Injection in Authorization Header
     */
    it('WB-SEC-004c: SQL Injection in Auth Header', () => {
      const sqlInjection = "Bearer ' OR '1'='1";
      const req = mockReq({ headers: { authorization: sqlInjection } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * XSS in Token
     */
    it('WB-SEC-004d: XSS Payload in Token', () => {
      const xssPayload = "<script>alert('xss')</script>";
      const req = mockReq({ headers: { authorization: `Bearer ${xssPayload}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * Very Long Token (Buffer Overflow attempt)
     */
    it('WB-SEC-004e: Buffer Overflow - Very Long Token', () => {
      const longToken = 'a'.repeat(100000);
      const req = mockReq({ headers: { authorization: `Bearer ${longToken}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });

    /**
     * Unicode/Special Characters in Token
     */
    it('WB-SEC-004f: Unicode Characters in Token', () => {
      const unicodeToken = 'Bearer 你好世界🔐';
      const req = mockReq({ headers: { authorization: unicodeToken } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(nextCalled).toBe(false);
    });
  });

  /**
   * ============================================
   * Boundary Testing for Security
   * ============================================
   */
  describe('WB-SEC-005: Boundary Testing', () => {
    it('WB-SEC-005a: Token at exact expiration boundary', () => {
      // Token that expires in exactly 1 second
      const token = jwt.sign(
        { _id: '123', email: 'test@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1s' }
      );

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      // Should still be valid
      expect(nextCalled).toBe(true);
    });

    it('WB-SEC-005b: Empty string authorization header', () => {
      const req = mockReq({ headers: { authorization: '' } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
      expect(res.data).toEqual({ message: 'No Token' });
    });

    it('WB-SEC-005c: Authorization header with only spaces', () => {
      const req = mockReq({ headers: { authorization: '       ' } });
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      expect(res.statusCode).toBe(401);
    });

    it('WB-SEC-005d: Bearer with extra spaces', () => {
      const user = { _id: '123', email: 'test@test.com', isAdmin: false };
      const token = generateToken(user);
      const req = mockReq({ headers: { authorization: `Bearer  ${token}` } }); // Extra space
      const res = mockRes();
      let nextCalled = false;

      isAuth(req, res, () => { nextCalled = true; });

      // Extra space causes token extraction to fail
      expect(res.statusCode).toBe(401);
    });
  });
});
