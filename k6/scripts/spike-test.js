import http from 'k6/http';
import { check, sleep } from 'k6';

// Spike test - kiểm tra hệ thống với tải đột ngột
export const options = {
  stages: [
    { duration: '10s', target: 5 },    // Warm up
    { duration: '1m', target: 5 },     // Normal load
    { duration: '10s', target: 200 },  // Spike lên 200 users
    { duration: '1m', target: 200 },   // Stay at spike
    { duration: '10s', target: 5 },    // Scale down
    { duration: '1m', target: 5 },     // Recovery
    { duration: '10s', target: 0 },    // Ramp down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  const res = http.get(`${BASE_URL}/api/products`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => r.body.length > 0,
  });

  sleep(1);
}
