# CI/CD Pipeline - Hướng dẫn

## 📋 Tổng quan

Dự án sử dụng **GitHub Actions** cho CI/CD với 3 workflows:

| Workflow | File | Trigger | Mục đích |
|----------|------|---------|----------|
| CI Pipeline | `ci.yml` | Push/PR | Chạy tests, build |
| CD Pipeline | `cd.yml` | Push to main | Deploy |
| Performance | `performance.yml` | Weekly/Manual | Performance tests |

## 🔄 CI Pipeline (`ci.yml`)

### Khi nào chạy?
- Push code lên `main` hoặc `develop`
- Tạo Pull Request vào `main` hoặc `develop`

### Các jobs:

```
┌─────────────────┐     ┌─────────────────┐
│ Backend Tests   │     │ Frontend Tests  │
│ - Unit          │     │ - Jest          │
│ - Integration   │     │ - Coverage      │
│ - Smoke         │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │      Build Check      │
         │ - Frontend build      │
         │ - Docker build        │
         └───────────────────────┘
```

## 🚀 CD Pipeline (`cd.yml`)

### Khi nào chạy?
- Push code lên `main`
- Manual trigger

### Các jobs:

```
┌─────────────────────┐
│ Build & Push Docker │
│ - Backend image     │
│ - Frontend image    │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Deploy to Staging  │
│  (Auto)             │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ Deploy to Production│
│ (Manual Approval)   │
└─────────────────────┘
```

## ⚙️ Cấu hình cần thiết

### 1. GitHub Secrets
Vào **Settings > Secrets and variables > Actions** và thêm:

```
# Database
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret

# Cloudinary (nếu dùng)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Deploy (tùy platform)
SSH_PRIVATE_KEY=...
SERVER_HOST=...
SERVER_USER=...
```

### 2. Environments
Vào **Settings > Environments** và tạo:

- **staging**: Auto deploy
- **production**: Require approval

### 3. Branch Protection
Vào **Settings > Branches** và thêm rule cho `main`:

- ✅ Require pull request before merging
- ✅ Require status checks to pass
- ✅ Require branches to be up to date

## 📊 Xem kết quả

### Actions Tab
1. Vào tab **Actions** trên GitHub
2. Chọn workflow run
3. Xem logs của từng job

### Artifacts
- Coverage reports
- Build files
- Performance results

## 🔧 Tùy chỉnh Deploy

### Deploy lên VPS/Server

```yaml
- name: Deploy to Server
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /app
      docker-compose pull
      docker-compose up -d
```

### Deploy lên AWS ECS

```yaml
- name: Deploy to ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: task-definition.json
    service: my-service
    cluster: my-cluster
```

### Deploy lên Vercel (Frontend)

```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Deploy lên Heroku

```yaml
- name: Deploy to Heroku
  uses: akhileshns/heroku-deploy@v3
  with:
    heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
    heroku_app_name: "your-app-name"
    heroku_email: "your-email@example.com"
```

## 🐛 Troubleshooting

### Tests fail
- Kiểm tra logs trong Actions tab
- Đảm bảo MongoDB service đang chạy
- Kiểm tra environment variables

### Docker build fail
- Kiểm tra Dockerfile syntax
- Đảm bảo .dockerignore đúng

### Deploy fail
- Kiểm tra secrets đã được set
- Kiểm tra permissions
- Kiểm tra server connectivity

## 📝 Best Practices

1. **Không commit secrets**: Dùng GitHub Secrets
2. **Branch protection**: Bắt buộc PR và tests pass
3. **Staging trước Production**: Test trên staging trước
4. **Manual approval**: Require approval cho production
5. **Rollback plan**: Có kế hoạch rollback nếu deploy fail
