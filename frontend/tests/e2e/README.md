# Selenium E2E Tests - Hướng dẫn chi tiết

## 📋 Yêu cầu

### 1. Cài đặt Chrome Browser
- Tải và cài đặt Google Chrome: https://www.google.com/chrome/

### 2. Cài đặt ChromeDriver
ChromeDriver phải tương thích với phiên bản Chrome của bạn.

**Cách 1: Tự động (khuyến nghị)**
```bash
cd frontend
npm install --save-dev selenium-webdriver chromedriver
```

**Cách 2: Thủ công**
1. Kiểm tra phiên bản Chrome: `chrome://version`
2. Tải ChromeDriver tương ứng: https://chromedriver.chromium.org/downloads
3. Thêm vào PATH

### 3. Cài đặt dependencies
```bash
cd frontend
npm install --save-dev selenium-webdriver chromedriver
```

## 🚀 Chạy Tests

### Bước 1: Khởi động Backend
```bash
cd backend
npm run dev
```
Backend sẽ chạy tại: http://localhost:5000

### Bước 2: Khởi động Frontend
```bash
cd frontend
npm start
```
Frontend sẽ chạy tại: http://localhost:3000

### Bước 3: Chạy Selenium Tests
```bash
cd frontend
npm run test:e2e
```

### Chạy ở chế độ Headless (không hiện browser)
```bash
npm run test:e2e:headless
```

## 📁 Cấu trúc Files

```
frontend/tests/e2e/
├── selenium.config.mjs        # Cấu hình WebDriver (ES Module)
├── helpers.mjs                # Helper functions (ES Module)
├── checkout.selenium.test.mjs # Test cases (ES Module)
└── README.md                  # Hướng dẫn này
```

## 🧪 Test Cases

| # | Test Case | Mô tả |
|---|-----------|-------|
| 1 | Homepage loads | Kiểm tra trang chủ load thành công |
| 2 | User Registration | Đăng ký tài khoản mới |
| 3 | User Login | Đăng nhập |
| 4 | Browse Products | Xem danh sách sản phẩm |
| 5 | View Product Detail | Xem chi tiết sản phẩm |
| 6 | Add to Cart | Thêm vào giỏ hàng |
| 7 | View Cart | Xem giỏ hàng |
| 8 | Proceed to Checkout | Tiến hành thanh toán |
| 9 | Fill Shipping Address | Điền địa chỉ giao hàng |
| 10 | Select Payment Method | Chọn phương thức thanh toán |
| 11 | Place Order | Đặt hàng |
| 12 | View Order Details | Xem chi tiết đơn hàng |
| 13 | View Order History | Xem lịch sử đơn hàng |
| 14 | Logout | Đăng xuất |
| 15 | Protected Route | Kiểm tra redirect khi chưa đăng nhập |

## ⚙️ Cấu hình

### Thay đổi URL
Sửa file `selenium.config.mjs`:
```javascript
export const BASE_URL = 'http://localhost:3000';
export const API_URL = 'http://localhost:5000';
```

### Chạy Headless Mode
Uncomment dòng sau trong `selenium.config.mjs`:
```javascript
options.addArguments('--headless');
```

### Thay đổi Timeout
```javascript
export const TIMEOUTS = {
  implicit: 10000,    // Thời gian chờ element
  pageLoad: 30000,    // Thời gian chờ page load
  script: 30000,      // Thời gian chờ script
};
```

## 🔧 Troubleshooting

### Lỗi "ChromeDriver not found"
```bash
npm install chromedriver --save-dev
```

### Lỗi "Chrome version mismatch"
Cập nhật ChromeDriver:
```bash
npm update chromedriver
```

### Lỗi "Element not found"
- Kiểm tra selector trong code
- Tăng timeout
- Đảm bảo frontend đang chạy

### Lỗi "Connection refused"
- Đảm bảo backend đang chạy (port 5000)
- Đảm bảo frontend đang chạy (port 3000)

## 📝 Thêm Test Case Mới

```javascript
// Trong checkout.selenium.test.mjs

// ============================================
// TEST X: Tên test
// ============================================
try {
  // Code test
  await navigateTo(driver, '/path');
  const element = await waitForElement(driver, By.css('.selector'));
  
  logTest('Tên test', true);
} catch (error) {
  logTest('Tên test', false, error);
}
```

## 🎯 Best Practices

1. **Sử dụng data-testid**: Thêm `data-testid` vào elements để dễ select
2. **Chờ đủ thời gian**: Sử dụng `driver.sleep()` sau các actions
3. **Clear state**: Clear localStorage trước mỗi test độc lập
4. **Screenshot on failure**: Chụp ảnh khi test fail để debug
