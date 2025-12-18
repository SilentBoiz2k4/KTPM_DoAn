# Hướng dẫn Deploy với Docker

## 📋 Yêu cầu

- Docker Desktop đã cài đặt
- Docker Compose đã cài đặt

## 🚀 Deploy nhanh (Development)

### Bước 1: Clone repo (nếu chưa có)
```bash
git clone https://github.com/SilentBoiz2k4/KTPM_DoAn.git
cd KTPM_DoAn
```

### Bước 2: Cấu hình environment
Đảm bảo file `backend/.env` có đầy đủ các biến:
```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### Bước 3: Build và chạy
```bash
docker-compose up -d --build
```

### Bước 4: Kiểm tra
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/products

## 🏭 Deploy Production

### Sử dụng docker-compose.prod.yml
```bash
# Set API URL cho frontend
set REACT_APP_API_URL=http://your-server-ip:5000

# Build và chạy
docker-compose -f docker-compose.prod.yml up -d --build
```

Frontend sẽ chạy trên port 80.

## 📝 Các lệnh Docker hữu ích

### Xem logs
```bash
# Tất cả services
docker-compose logs -f

# Chỉ backend
docker-compose logs -f backend

# Chỉ frontend
docker-compose logs -f frontend
```

### Restart services
```bash
# Restart tất cả
docker-compose restart

# Restart 1 service
docker-compose restart backend
```

### Stop services
```bash
docker-compose down
```

### Rebuild và restart
```bash
docker-compose up -d --build --force-recreate
```

### Xem trạng thái
```bash
docker-compose ps
```

### Vào container
```bash
# Backend
docker exec -it ecommerce-backend sh

# Frontend
docker exec -it ecommerce-frontend sh
```

## 🔧 Troubleshooting

### Lỗi "port already in use"
```bash
# Tìm process đang dùng port
netstat -ano | findstr :5000
netstat -ano | findstr :3000

# Kill process (thay PID)
taskkill /PID <PID> /F
```

### Lỗi build frontend
```bash
# Clear cache và rebuild
docker-compose build --no-cache frontend
```

### Lỗi kết nối MongoDB
- Kiểm tra MONGODB_URI trong backend/.env
- Đảm bảo IP của bạn được whitelist trên MongoDB Atlas

### Xem chi tiết lỗi
```bash
docker-compose logs backend --tail=100
```

## 🌐 Deploy lên VPS/Cloud

### 1. Cài Docker trên server
```bash
# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Clone và deploy
```bash
git clone https://github.com/SilentBoiz2k4/KTPM_DoAn.git
cd KTPM_DoAn

# Tạo file .env
nano backend/.env

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Cấu hình Nginx reverse proxy (optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring

### Xem resource usage
```bash
docker stats
```

### Health check
```bash
# Backend
curl http://localhost:5000/api/products

# Frontend
curl http://localhost:3000
```
