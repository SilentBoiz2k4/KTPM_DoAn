import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const productListTrend = new Trend('product_list_duration');
const searchTrend = new Trend('search_duration');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Test 1: Get all products
  group('Products API', () => {
    const productsRes = http.get(`${BASE_URL}/api/products`);
    check(productsRes, {
      'products status 200': (r) => r.status === 200,
      'products response time OK': (r) => r.timings.duration < 500,
    });
    productListTrend.add(productsRes.timings.duration);
    errorRate.add(productsRes.status !== 200);
  });

  sleep(0.5);

  // Test 2: Get categories
  group('Categories API', () => {
    const categoriesRes = http.get(`${BASE_URL}/api/products/categories`);
    check(categoriesRes, {
      'categories status 200': (r) => r.status === 200,
    });
    errorRate.add(categoriesRes.status !== 200);
  });

  sleep(0.5);

  // Test 3: Search products
  group('Search API', () => {
    const searchRes = http.get(`${BASE_URL}/api/products/search?query=shirt&page=1`);
    check(searchRes, {
      'search status 200': (r) => r.status === 200,
      'search has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.products !== undefined;
        } catch {
          return false;
        }
      },
    });
    searchTrend.add(searchRes.timings.duration);
    errorRate.add(searchRes.status !== 200);
  });

  sleep(1);
}
