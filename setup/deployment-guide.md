# Sơ đồ triển khai

## Docker

```mermaid
flowchart LR
    Browser[Trình duyệt] -->|localhost:8080| Web[Nginx + React SPA]
    Web -->|/api → server:5000| API[Express API]
    Browser -->|localhost:5000/api, kiểm tra trực tiếp| API
    API -->|MONGO_URI, bắt buộc| Mongo[(MongoDB Atlas hoặc MongoDB riêng)]
    API -->|GEMINI_API_KEY, tùy chọn| Gemini[Google Gemini API]
```

Compose mặc định có `web` và `server`, dùng MongoDB đã cấu hình trong `.env`. File bổ sung `docker/docker-compose.local.yml` tạo MongoDB local với volume riêng; xem [hướng dẫn Docker](../docker/README.md). Chưa kết nối database thì API dữ liệu trả 503. Với MongoDB ở host, dùng URI phù hợp từ trong container, chẳng hạn `host.docker.internal` trên Docker Desktop.

Từ gốc repository:

```bash
docker compose -f docker/docker-compose.yml up --build -d
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs
```

Mở http://localhost:8080 và kiểm tra http://localhost:5000/api/health. API trả `database: "disconnected"` hoặc `"mongodb"`. Dừng bằng `docker compose -f docker/docker-compose.yml down` (thêm file local nếu đã dùng khi khởi động).

## Local đầy đủ

```text
Trình duyệt → Vite (mặc định 5173) → /api proxy → Express (mặc định 5001)
                                                   ├─ MongoDB theo MONGO_URI
                                                   └─ Gemini (tùy chọn)
```

`npm ci` rồi `npm run dev:full` tự chọn cổng trống và dùng MongoDB hiện có từ `.env`; không tự tạo database hoặc nạp catalog. Địa chỉ thực tế được in trong terminal. Script nằm tại `setup/scripts/dev-full.mjs`. Chỉ chủ động nạp catalog bằng `npm run catalog:import` nếu muốn thêm dữ liệu mẫu vào database thử nghiệm.

## Cấu hình và thành phần bên ngoài

Tạo `scr/server/.env` từ `scr/server/.env.example` nếu dùng dịch vụ riêng. Các biến gồm `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY` và cấu hình ngân hàng/webhook nếu cần thanh toán chuyển khoản. Xem [hướng dẫn cài đặt](README.md) để biết điều kiện của từng tính năng.

Không kèm database khách hàng, API key, bộ cài Node/Docker hoặc MongoDB binary trong bản nguồn. Các phần mềm và nơi cài đặt được liệt kê ở [soft/README.md](../soft/README.md). Dữ liệu demo và quy trình tái lập nằm trong [demo-data/README.md](demo-data/README.md).
