import http from 'k6/http';
import { check, sleep } from 'k6';

// Stress test - tăng tải liên tục để tìm điểm giới hạn
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% requests < 1.5s
    http_req_failed: ['rate<0.05'],    // Tỷ lệ lỗi < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const res = http.get(`${BASE_URL}/api/products`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
