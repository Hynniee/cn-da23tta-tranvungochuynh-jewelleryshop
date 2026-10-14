# MIRA Jewelry — Đồ án chuyên ngành

**Đề tài:** Xây dựng hệ thống thương mại điện tử bán trang sức ứng dụng mô hình ngôn ngữ lớn và hệ hỗ trợ ra quyết định.

**Sinh viên:** Trần Vũ Ngọc Huỳnh  
**Email:** tranvungochuynh136@gmail.com  
**Điện thoại:** 0328779845

## Cấu trúc repository
- `setup/`: hướng dẫn cài đặt, triển khai, dữ liệu demo
- `scr/client/`: React + Vite + TypeScript
- `scr/server/`: Node.js + Express + TypeScript
- `scr/test-data/`: mã và dữ liệu đánh giá
- `progress-report/`: báo cáo tiến độ theo tuần
- `thesis/doc`, `pdf`, `html`, `abs`, `refs`: tài liệu đồ án
- `soft/`: phần mềm hỗ trợ (nếu có)
- `docker/`: Docker Compose

## Chạy nhanh (demo không cần MongoDB)
```bash
docker compose -f docker/docker-compose.yml up --build -d
```
- Website: http://localhost:8080
- API: http://localhost:5000/api/products
- Product Detail: http://localhost:8080/product/solitaire-etoile-diamond-ring

Nếu muốn dùng MongoDB/Gemini, xem `setup/README.md` và `scr/server/.env.example`.
Không đưa file `.env`, mật khẩu hoặc API key lên GitHub.

## Chức năng
E-commerce, MIRA AI Chat, Recommendation Engine, Diamond DSS 4Cs, quản trị và dữ liệu demo.
