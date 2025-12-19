import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình test scenarios
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% requests phải < 500ms
    http_req_failed: ['rate<0.01'],   // Tỷ lệ lỗi < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Test GET products endpoint
  const res = http.get(`${BASE_URL}/api/products`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1); // Nghỉ 1 giây giữa các request
}
