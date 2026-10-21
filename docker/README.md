# Triển khai Docker

Chạy từ thư mục gốc:

```bash
docker compose -f docker/docker-compose.yml up --build -d
docker compose -f docker/docker-compose.yml ps
```

- Website: http://localhost:8080
- Kiểm tra API: http://localhost:5000/api/health
- `client.Dockerfile`: build React và phục vụ bằng Nginx.
- `server.Dockerfile`: build và chạy API Express.
- `nginx.conf`: chuyển `/api/` tới service `server:5000`, hỗ trợ React SPA.
- `docker-compose.yml`: cấu hình hai service; build context là thư mục gốc repository.

Mặc định API chạy demo nếu chưa có MongoDB. Để chạy với dịch vụ riêng, tạo `scr/server/.env` theo `.env.example` trước khi khởi động. MongoDB không được khai báo trong Compose hiện tại; xem [sơ đồ triển khai](../setup/deployment-guide.md).

Dừng bằng `docker compose -f docker/docker-compose.yml down`. Xem log bằng `docker compose -f docker/docker-compose.yml logs`.
