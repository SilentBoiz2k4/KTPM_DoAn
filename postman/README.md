# Postman API Testing

## Cấu trúc thư mục

```
postman/
├── collections/          # Postman collections
│   └── ktpm-api.postman_collection.json
├── environments/         # Environment configs
│   ├── local.json       # localhost:5000
│   └── production.json  # ktpm-doan.onrender.com
└── README.md
```

## Chạy tests local với Newman

### Cài đặt Newman
```bash
npm install -g newman
npm install -g newman-reporter-htmlextra
```

### Chạy test môi trường local
```bash
newman run postman/collections/ktpm-api.postman_collection.json -e postman/environments/local.json
```

### Chạy test môi trường production
```bash
newman run postman/collections/ktpm-api.postman_collection.json -e postman/environments/production.json
```

### Xuất HTML report
```bash
newman run postman/collections/ktpm-api.postman_collection.json \
  -e postman/environments/production.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export report.html
```

## Import vào Postman

1. Mở Postman
2. Click **Import**
3. Chọn file `collections/ktpm-api.postman_collection.json`
4. Import environment từ `environments/`

## Thêm test cases mới

1. Thêm requests trong Postman
2. Viết test scripts trong tab **Tests**
3. Export collection và thay thế file JSON
