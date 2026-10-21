# Cài đặt MIRA Jewelry
Yêu cầu: Docker Desktop có Docker Compose hoặc Node.js 20+.

## Chạy demo không cần MongoDB
Từ thư mục gốc:
```bash
docker compose -f docker/docker-compose.yml up --build -d
```
Frontend: http://localhost:8080
Backend: http://localhost:5000/api/products

## Chạy đầy đủ trên máy local

```bash
npm ci
npm run dev:full
```

Nếu chưa cấu hình MongoDB, lệnh này tự chạy MongoDB local, bổ sung 36 sản phẩm và lưu dữ liệu trong `.local-data/`. Có thể đăng ký, đăng nhập, lưu hồ sơ, đặt đơn COD, theo dõi và hủy đơn chưa xử lý. Dữ liệu local được giữ khi đóng ứng dụng; không commit `.local-data/`.

Mặc định dùng frontend 5173 và API 5001; nếu cổng bận sẽ chọn cổng trống tiếp theo và in địa chỉ vào terminal. Có thể đặt `WEB_PORT` / `PORT` để chọn cổng. Nếu `.env` chứa MongoDB thật, ứng dụng dùng database đã cấu hình và không tự thêm dữ liệu vào đó.

### Bổ sung catalog vào MongoDB đã cấu hình

```bash
npm run catalog:import
```

Lệnh này dùng `MONGO_URI` trong `scr/server/.env`, chỉ thêm sản phẩm chưa có theo slug và giữ nguyên dữ liệu sản phẩm, tồn kho, tài khoản và đơn hàng hiện có. `seed:catalog` có thể chạy nhiều lần. Khác với script reset demo `seed`, đây là lệnh phù hợp để thêm danh mục mà không xóa dữ liệu.

Catalog dùng chung: `scr/server/src/data/catalog.json`. Sửa file này để bổ sung mẫu demo cho cả client lẫn server. Sản phẩm đã tồn tại trong MongoDB được sửa bằng trang quản trị, không tự bị ghi đè bởi catalog mẫu.

## Chạy local

Từ thư mục gốc (Node.js 20+):
```bash
npm ci
npm run dev
```

Frontend: http://localhost:5173. API: http://localhost:5000/api/health.
Vite tự chuyển các yêu cầu `/api` đến backend. MongoDB chưa được cấu hình thì danh mục, tư vấn và DSS vẫn chạy demo; đăng ký, hồ sơ, đơn hàng và quản trị cần MongoDB.

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
npm run format:check
```

`npm test` chạy API demo, MongoDB tạm và Chrome headless trên cổng 5107/5187. Dữ liệu test được tạo riêng và xóa khi kết thúc, không đọc database trong `.env`. Cần Chrome cài sẵn; có thể đặt `TEST_BROWSER_CHANNEL=msedge` để dùng Edge. Lần chạy đầu cần Internet để tải MongoDB binary. Build trước khi chạy test. Ảnh desktop/mobile và kết quả được ghi trong `scr/test-data/results/`.

```bash
npm run format
python scr/ml/evaluate_demo.py
```

Script ML chỉ đánh giá dữ liệu mô phỏng. `scr/test-data/test_cases.csv` hiện chưa có dữ liệu thực nghiệm, nên chưa thể tính độ chính xác tư vấn trên truy vấn thực tế.

## Kết nối MongoDB/Gemini
Copy `scr/server/.env.example` thành `scr/server/.env`, điền MONGO_URI, JWT_SECRET, GEMINI_API_KEY (nếu có).
Không commit .env lên GitHub. Không cần MongoDB để xem danh mục demo.

Trong production, đặt `JWT_SECRET` ngẫu nhiên tối thiểu 32 ký tự. Không dùng giá trị mẫu. Webhook thanh toán chỉ hoạt động khi có `PAYMENT_WEBHOOK_SECRET` thật; định dạng chữ ký hiện tại là HMAC SHA-256 trên `JSON.stringify(body)` qua header `x-webhook-signature`. Cần khớp hợp đồng của nhà cung cấp trước khi tích hợp giao dịch thật.

## Danh mục và mua hàng

Catalog có 36 sản phẩm thuộc Nhẫn, Dây chuyền, Vòng tay, Bông tai, Lắc chân, Charm và Bộ trang sức. Bộ lọc hỗ trợ chất liệu, loại đá, ngân sách, tìm kiếm có/không dấu và bộ sưu tập vàng/bạc/ngọc trai/đá màu.

Cấu hình cửa hàng dùng chung ở `scr/server/src/data/storeConfig.json`: hiện phí vận chuyển 30.000₫, miễn phí từ 2.000.000₫. Client và server cùng đọc cấu hình này. Thông tin ngân hàng chưa được cấu hình thì giao diện chỉ cho chọn COD. Muốn bật chuyển khoản, điền `BANK_NAME`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`; webhook và QR dùng cấu hình nhà cung cấp tương ứng.

Ảnh catalog là ảnh minh họa demo, cần thay bằng ảnh và thông số sản phẩm thật trước khi bán hàng thực tế.
