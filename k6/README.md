# K6 Performance Testing

## Cài đặt k6

### Windows
```powershell
# Chocolatey
choco install k6

# Hoặc winget
winget install k6
```

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Chạy Tests

### Load Test (kiểm tra tải bình thường)
```bash
k6 run scripts/load-test.js
```

### Stress Test (tìm điểm giới hạn)
```bash
k6 run scripts/stress-test.js
```

### Spike Test (kiểm tra tải đột ngột)
```bash
k6 run scripts/spike-test.js
```

### API Test (kiểm tra các endpoints)
```bash
k6 run scripts/api-test.js
```

### Auth Flow Test (kiểm tra luồng đăng nhập)
```bash
k6 run scripts/auth-flow-test.js
```

## Cấu hình URL

Mặc định tests chạy với `http://localhost:5000`. Để thay đổi:

```bash
k6 run -e BASE_URL=http://your-server.com scripts/load-test.js
```

## Xuất kết quả

### JSON output
```bash
k6 run --out json=results.json scripts/load-test.js
```

### HTML Report (cần k6-reporter)
```bash
k6 run scripts/load-test.js --out json=results.json
# Sau đó dùng tool convert sang HTML
```

## Các loại test

| Test Type | Mục đích | Khi nào dùng |
|-----------|----------|--------------|
| Load Test | Kiểm tra hiệu năng với tải bình thường | Trước khi deploy |
| Stress Test | Tìm điểm giới hạn của hệ thống | Đánh giá capacity |
| Spike Test | Kiểm tra xử lý tải đột ngột | Chuẩn bị cho flash sale |
| Soak Test | Kiểm tra memory leak | Chạy dài hạn |

## Thresholds (Ngưỡng)

Các test đã cấu hình sẵn các ngưỡng:
- `http_req_duration['p(95)<500']` - 95% requests phải < 500ms
- `http_req_failed['rate<0.01']` - Tỷ lệ lỗi < 1%
