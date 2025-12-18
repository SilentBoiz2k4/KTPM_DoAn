# Performance Tests - Hướng dẫn chi tiết

## 📋 Giới thiệu

Performance tests sử dụng **Artillery** để kiểm tra hiệu năng API của hệ thống đặt hàng/thanh toán.

## 🛠️ Cài đặt

```bash
cd backend
npm install --save-dev artillery
```

## 📁 Cấu trúc Files

```
backend/tests/performance/
├── checkout.performance.yml   # Test browse & search products
├── order-api.performance.yml  # Test order/checkout APIs
├── stress.performance.yml     # Stress test - tìm breaking point
└── README.md                  # Hướng dẫn này
```

## 🚀 Chạy Tests

### 1. Khởi động Backend
```bash
cd backend
npm run dev
```

### 2. Chạy Performance Tests

**Test Browse Products (nhẹ):**
```bash
npm run perf:browse
```

**Test Order APIs (trung bình):**
```bash
npm run perf:order
```

**Stress Test (nặng):**
```bash
npm run perf:stress
```

**Chạy tất cả:**
```bash
npm run perf:all
```

## 📊 Các loại Test

### 1. Browse Products Test (`checkout.performance.yml`)
- **Mục đích**: Test các API đọc dữ liệu
- **Load**: 2 → 20 → 50 requests/second
- **Scenarios**:
  - Browse products (40%)
  - View product detail (30%)
  - Search products (20%)
  - Get categories (10%)

### 2. Order API Test (`order-api.performance.yml`)
- **Mục đích**: Test full checkout flow
- **Load**: 5 → 15 → 30 requests/second
- **Scenarios**:
  - User registration (10%)
  - User login (20%)
  - Browse & add to cart (40%)
  - View cart (15%)
  - Complete checkout (15%)

### 3. Stress Test (`stress.performance.yml`)
- **Mục đích**: Tìm breaking point của hệ thống
- **Load**: 10 → 30 → 60 → 100 → 150 requests/second
- **Scenarios**:
  - Health check (20%)
  - Product listing (50%)
  - Search operations (30%)

## 📈 Đọc kết quả

```
All VUs finished. Total time: 2 minutes, 30 seconds

Summary report @ 14:30:00(+0700)

Scenarios launched:  1500
Scenarios completed: 1485
Requests completed:  2970
Mean response time:  125.3 ms
Response time p95:   350 ms
Response time p99:   520 ms
RPS sent:            19.8

Codes:
  200: 2850
  201: 100
  401: 20
```

### Các metrics quan trọng:

| Metric | Mô tả | Target |
|--------|-------|--------|
| Mean response time | Thời gian phản hồi trung bình | < 200ms |
| p95 | 95% requests nhanh hơn | < 500ms |
| p99 | 99% requests nhanh hơn | < 1000ms |
| RPS | Requests per second | Tùy server |
| Error rate | Tỷ lệ lỗi | < 1% |

## ⚙️ Tùy chỉnh

### Thay đổi target URL
```yaml
config:
  target: "http://your-server:5000"
```

### Thay đổi load
```yaml
phases:
  - duration: 60      # Thời gian (giây)
    arrivalRate: 10   # Requests/second
    rampTo: 50        # Tăng dần đến
```

### Thêm scenario mới
```yaml
scenarios:
  - name: "New Scenario"
    weight: 20
    flow:
      - get:
          url: "/api/endpoint"
          expect:
            - statusCode: 200
```

## 🔧 Troubleshooting

### Lỗi "Connection refused"
- Đảm bảo backend đang chạy
- Kiểm tra port 5000

### Lỗi "Too many errors"
- Giảm arrivalRate
- Kiểm tra database connection
- Tăng timeout

### Response time cao
- Kiểm tra database indexes
- Tăng resources cho server
- Optimize queries

## 📝 Best Practices

1. **Chạy trên môi trường riêng**: Không test trên production
2. **Warm up database**: Chạy vài requests trước khi test
3. **Monitor resources**: Theo dõi CPU, RAM, DB connections
4. **Test nhiều lần**: Lấy kết quả trung bình
5. **Tăng load từ từ**: Bắt đầu nhẹ, tăng dần

## 🎯 Performance Targets

| API | Response Time | Throughput |
|-----|---------------|------------|
| GET /products | < 100ms | 100 RPS |
| GET /product/:id | < 50ms | 200 RPS |
| POST /cart | < 200ms | 50 RPS |
| POST /orders | < 500ms | 20 RPS |
| POST /signin | < 300ms | 30 RPS |
