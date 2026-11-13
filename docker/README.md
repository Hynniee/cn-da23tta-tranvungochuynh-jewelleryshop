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

API cần MongoDB thật; khi chưa kết nối, các API dữ liệu trả 503 và không thay bằng danh mục demo. Để dùng Atlas/MongoDB riêng, tạo `scr/server/.env` theo `.env.example` trước khi khởi động.

Để chạy cả MongoDB trong Docker trên máy phát triển:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.local.yml up --build -d
```

Cấu hình bổ sung dùng database `mira_jewelry` trong volume `mongo_data`, không công khai cổng MongoDB ra host và không tự nạp dữ liệu. Nó ghi đè `MONGO_URI` cho container server để dùng MongoDB local, không ghi vào Atlas. Nếu cần dữ liệu thử nghiệm, chủ động chạy `docker compose -f docker/docker-compose.yml -f docker/docker-compose.local.yml exec server npm run seed:catalog` trên database local này. Không dùng script reset `seed` với database hiện có.

Dừng bằng `docker compose -f docker/docker-compose.yml down`. Xem log bằng `docker compose -f docker/docker-compose.yml logs`.
