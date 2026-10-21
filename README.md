# MIRA Jewelry — Đồ án chuyên ngành

**Đề tài:** Xây dựng hệ thống thương mại điện tử bán trang sức ứng dụng mô hình ngôn ngữ lớn và hệ hỗ trợ ra quyết định.

**Sinh viên:** Trần Vũ Ngọc Huỳnh  
**Email:** tranvungochuynh136@gmail.com  
**Điện thoại:** 0328779845

## Cấu trúc repository

```text
MIRA-Jewelry/
├── README.md                 # Giới thiệu, liên hệ và cách chạy
├── package.json              # Các lệnh chạy chung cho npm workspace
├── package-lock.json         # Khóa phiên bản dependency
├── setup/                    # Cài đặt, triển khai và tái lập demo
│   ├── README.md
│   ├── deployment-guide.md   # Sơ đồ và cấu hình triển khai
│   ├── MVC.md                # Kiến trúc mã nguồn
│   ├── demo-data/            # Danh mục dữ liệu, cách tái lập kết quả
│   └── scripts/dev-full.mjs  # Khởi động đầy đủ với MongoDB local
├── scr/                      # Mã nguồn và dữ liệu thử nghiệm
│   ├── client/               # React + Vite + TypeScript (View)
│   ├── server/               # Express, Controller, Model, Service
│   ├── ml/                   # Huấn luyện, dữ liệu mô phỏng, đánh giá ML
│   └── test-data/            # Kiểm thử API/UI, ca đánh giá và kết quả
├── progress-report/          # Báo cáo tiến độ và kiểm chứng
│   ├── week-01/ … week-04/   # Vị trí nộp báo cáo theo tuần
│   └── validation-2026-10-21.md
├── thesis/                   # Tài liệu đồ án
│   ├── doc/                  # Bản Word .doc/.docx
│   ├── pdf/                  # Bản báo cáo .pdf
│   ├── html/                 # Tài liệu web
│   ├── abs/                  # Slide .ppt/.pptx, video .avi/.mp4
│   └── refs/                 # Tài liệu tham khảo, tên gợi nhớ
├── soft/                     # Danh mục phần mềm hỗ trợ
└── docker/                   # Compose, Dockerfile, Nginx
```

Các lệnh bên dưới chạy từ thư mục gốc. Giữ tên `scr` theo yêu cầu của đồ án. `node_modules/`, `dist/`, `.local-data/` và kết quả kiểm thử được tạo khi chạy, không đưa vào Git.

Hướng dẫn cho người chấm: [cài đặt](setup/README.md) → [dữ liệu và tái lập kết quả](setup/demo-data/README.md) → [báo cáo tiến độ](progress-report/README.md) → [tài liệu đồ án](thesis/README.md).

**Tình trạng hồ sơ:** các thư mục tuần và tài liệu Word/PDF/slide hiện chưa có báo cáo chính thức. Cần bổ sung tài liệu thực tế trước khi nộp; hướng dẫn trong từng thư mục xác định nội dung cần đặt vào đó.

## Kiến trúc MVC

Backend tách `routes` → `controllers` → `models/services`; React đảm nhiệm View. Trang giỏ hàng tách Model tính toán, Controller hook và View JSX. Xem [hướng dẫn MVC](setup/MVC.md) để biết trách nhiệm từng lớp và cách thêm chức năng.

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

Private Salon: `/appointments` cho phép đặt lịch, xem trang xác nhận và nhận email qua Gmail SMTP. Xem [cấu hình email](setup/private-salon.md).

## Học máy + DSS

ML Logistic Regression hỗ trợ dự đoán mức độ quan tâm; DSS giữ vai trò chấm điểm đa tiêu chí. Khi chưa huấn luyện, ứng dụng tự động quay về DSS. Xem `scr/ml/README.md` để huấn luyện bằng dữ liệu có nhãn và kiểm tra API demo.

## Phát triển và kiểm thử local

```bash
npm ci
npm run dev
```

Website: http://localhost:5173. Chạy `npm run build`, sau đó `npm test` để kiểm tra API demo, MongoDB tạm và Chrome. `npm run format` định dạng source; `npm run format:check` kiểm tra định dạng. Xem `setup/README.md` khi cổng 5000 đã được Docker sử dụng.

## Trang sức đa dạng và chạy đầy đủ

Catalog hiện có 36 sản phẩm vàng, bạc 925, ngọc trai, đá màu và kim cương, gồm cả lắc chân, charm và bộ trang sức. Dữ liệu demo được dùng chung tại `scr/server/src/data/catalog.json`.

Chạy `npm run dev:full` để dùng MongoDB local có lưu dữ liệu và thử đầy đủ luồng đăng ký → mua hàng → quản lý đơn. Để chỉ bổ sung mẫu vào database đã cấu hình và giữ nguyên dữ liệu hiện có, dùng `npm run catalog:import`. Xem `setup/README.md` cho cấu hình chi tiết.

Trang sản phẩm chung: `/products`, có mục **SẢN PHẨM** trên menu. Trang này mở toàn bộ trang sức và dùng bốn nhóm lọc: danh mục, chất liệu kim loại, loại đá / điểm nhấn và ngân sách tối đa.
