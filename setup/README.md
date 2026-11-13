# Cài đặt MIRA Jewelry

Đặt lịch Private Salon và gửi email Gmail: xem [private-salon.md](private-salon.md).
Yêu cầu: Docker Desktop có Docker Compose hoặc Node.js 20+.

## Chạy Docker với MongoDB đã cấu hình

Từ thư mục gốc:

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

Frontend: http://localhost:8080
Backend: http://localhost:5000/api/products

Tạo `scr/server/.env` từ `.env.example`, cấu hình `MONGO_URI` trước khi chạy. Hoặc chạy cả MongoDB local bằng `docker compose -f docker/docker-compose.yml -f docker/docker-compose.local.yml up --build -d`. Xem [Docker](../docker/README.md).

## Chạy đầy đủ trên máy local

```bash
npm ci
npm run dev:full
```

Lệnh yêu cầu `MONGO_URI` hợp lệ trong `scr/server/.env`. Không tự tạo MongoDB, không tự nạp sản phẩm mẫu và không ghi đè database hiện có. `.local-data/` chỉ giữ cấu hình phát triển được tạo khi chạy, không commit thư mục này.

Mặc định dùng frontend 5173 và API 5001; nếu cổng bận sẽ chọn cổng trống tiếp theo và in địa chỉ vào terminal. Có thể đặt `WEB_PORT` / `PORT` để chọn cổng. Ứng dụng dùng database đã cấu hình và không tự thêm dữ liệu vào đó.

### Bổ sung catalog vào MongoDB đã cấu hình

```bash
npm run catalog:import
```

Chỉ chạy khi chủ động muốn nạp dữ liệu thử nghiệm vào đúng database trong `MONGO_URI`. Lệnh thêm sản phẩm chưa có theo slug và giữ nguyên bản ghi hiện có; có thể chạy nhiều lần. Không dùng script reset `seed` trên database đang sử dụng.

`scr/server/src/data/catalog.json` là dữ liệu mẫu phục vụ seed/kiểm thử. Website lấy danh mục từ MongoDB; sản phẩm đang sử dụng được sửa bằng trang quản trị.

## Chạy local

Từ thư mục gốc (Node.js 20+):

```bash
npm ci
npm run dev
```

Frontend: http://localhost:5173. API: http://localhost:5000/api/health.
Vite tự chuyển các yêu cầu `/api` đến đúng backend do script khởi động chọn. MongoDB chưa cấu hình hoặc mất kết nối thì API dữ liệu trả 503, không dùng sản phẩm mẫu thay thế.

Nếu cổng 5000 đã được Docker hoặc ứng dụng khác dùng, chạy PowerShell:

```powershell
$env:PORT = '5001'
$env:API_PROXY_TARGET = 'http://127.0.0.1:5001'
npm run dev
```

`API_PROXY_TARGET` chỉ cấu hình proxy Vite khi phát triển. Nginx trong Docker vẫn dùng `server:5000`.

## Build và kiểm thử

```bash
npm run build
npm test
npm run test:decision-support
npm run format:check
```

`npm test` chạy tình huống mất database, MongoDB tạm và Chrome headless trên cổng 5107/5187. `test:decision-support` kiểm tra quản lý khách hàng, hội thoại nhiều lượt, DSS và hành vi. Dữ liệu test được tạo riêng và xóa khi kết thúc, không ghi database trong `.env`. Cần Chrome cài sẵn; có thể đặt `TEST_BROWSER_CHANNEL=msedge` để dùng Edge. Lần chạy đầu cần Internet để tải MongoDB binary. Build trước khi chạy test. Ảnh desktop/mobile và kết quả được ghi trong `scr/test-data/results/`.

```bash
npm run format
python scr/ml/evaluate_demo.py
```

Script ML chỉ đánh giá dữ liệu mô phỏng. `scr/test-data/test_cases.csv` hiện chưa có dữ liệu thực nghiệm, nên chưa thể tính độ chính xác tư vấn trên truy vấn thực tế.

## Kết nối MongoDB/Gemini

Copy `scr/server/.env.example` thành `scr/server/.env`, điền MONGO_URI, JWT_SECRET, GEMINI_API_KEY (nếu có).
Không commit .env lên GitHub. MongoDB bắt buộc cho danh mục, tư vấn, DSS và các luồng lưu dữ liệu. Không cấu hình Gemini thì ứng dụng dùng parser và diễn giải DSS tại server. Xem [AI Advisor và DSS](advisor-dss.md).

Trong production, đặt `JWT_SECRET` ngẫu nhiên tối thiểu 32 ký tự. Không dùng giá trị mẫu. Webhook thanh toán chỉ hoạt động khi có `PAYMENT_WEBHOOK_SECRET` thật; định dạng chữ ký hiện tại là HMAC SHA-256 trên `JSON.stringify(body)` qua header `x-webhook-signature`. Cần khớp hợp đồng của nhà cung cấp trước khi tích hợp giao dịch thật.

## Danh mục và mua hàng

Catalog có 36 sản phẩm thuộc Nhẫn, Dây chuyền, Vòng tay, Bông tai, Lắc chân, Charm và Bộ trang sức. Bộ lọc hỗ trợ chất liệu, loại đá, ngân sách, tìm kiếm có/không dấu và bộ sưu tập vàng/bạc/ngọc trai/đá màu.

Cấu hình cửa hàng dùng chung ở `scr/server/src/data/storeConfig.json`: hiện phí vận chuyển 30.000₫, miễn phí từ 2.000.000₫. Client và server cùng đọc cấu hình này. Thông tin ngân hàng chưa được cấu hình thì giao diện chỉ cho chọn COD. Muốn bật chuyển khoản, điền `BANK_NAME`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`; webhook và QR dùng cấu hình nhà cung cấp tương ứng.

Ảnh catalog là ảnh minh họa demo, cần thay bằng ảnh và thông số sản phẩm thật trước khi bán hàng thực tế.
