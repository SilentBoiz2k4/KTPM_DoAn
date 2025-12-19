import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test user credentials (dùng cho testing)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User',
};

export default function () {
  let authToken = null;

  // Test 1: User Signup (có thể fail nếu user đã tồn tại)
  group('User Signup', () => {
    const signupPayload = JSON.stringify({
      name: `${TEST_USER.name}_${__VU}_${__ITER}`,
      email: `test_${__VU}_${__ITER}@example.com`,
      password: TEST_USER.password,
    });

    const signupRes = http.post(`${BASE_URL}/api/users/signup`, signupPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(signupRes, {
      'signup successful or user exists': (r) => r.status === 200 || r.status === 400,
    });

    if (signupRes.status === 200) {
      try {
        const body = JSON.parse(signupRes.body);
        authToken = body.token;
      } catch (e) {}
    }
  });

  sleep(0.5);

  // Test 2: User Signin
  group('User Signin', () => {
    const signinPayload = JSON.stringify({
      email: `test_${__VU}_${__ITER}@example.com`,
      password: TEST_USER.password,
    });

    const signinRes = http.post(`${BASE_URL}/api/users/signin`, signinPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(signinRes, {
      'signin status 200 or 401': (r) => r.status === 200 || r.status === 401,
    });

    if (signinRes.status === 200) {
      try {
        const body = JSON.parse(signinRes.body);
        authToken = body.token;
      } catch (e) {}
    }
  });

  sleep(0.5);

  // Test 3: Access protected route (if authenticated)
  if (authToken) {
    group('Protected Route - Get Cart', () => {
      const cartRes = http.get(`${BASE_URL}/api/cart`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      check(cartRes, {
        'cart access successful': (r) => r.status === 200,
      });
    });
  }

  sleep(1);
}
