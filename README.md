# MIRA Jewelry — Đồ án chuyên ngành

**Đề tài:** Xây dựng hệ thống thương mại điện tử bán trang sức ứng dụng mô hình ngôn ngữ lớn và hệ hỗ trợ ra quyết định.

**Sinh viên:** Trần Vũ Ngọc Huỳnh  
**Email:** 110123012@st.tvu.edu.vn 
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

## Chạy nhanh với MongoDB hiện có
```bash
docker compose -f docker/docker-compose.yml up --build -d
```
- Website: http://localhost:8080
- API: http://localhost:5000/api/products
- Product Detail: http://localhost:8080/product/solitaire-etoile-diamond-ring

Cấu hình `MONGO_URI` trong `scr/server/.env` trỏ đúng tên database trước khi chạy. Website chỉ đọc dữ liệu từ MongoDB; không hiển thị danh mục mẫu khi mất kết nối. Xem `setup/README.md` và `scr/server/.env.example`.
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

Website: http://localhost:5173. Chạy `npm run build`, sau đó `npm test` để kiểm tra xử lý mất kết nối, API trên MongoDB kiểm thử riêng và Chrome. `npm run format` định dạng source; `npm run format:check` kiểm tra định dạng. Xem `setup/README.md` khi cổng 5000 đã được Docker sử dụng.

## Trang sức đa dạng và chạy đầy đủ

Catalog của website lấy từ database trong `MONGO_URI`. Các bản ghi có `metals`, `gemstone` hoặc thiếu `slug` được chuyển đổi khi đọc để tương thích với bộ lọc và đường dẫn sản phẩm; không sửa dữ liệu gốc. `scr/server/src/data/catalog.json` chỉ còn dùng cho các script tạo dữ liệu kiểm thử.

Chạy `npm run dev:full` để mở API và website với MongoDB đã cấu hình. Lệnh này không tạo MongoDB local và không tự nạp sản phẩm mẫu. URI Atlas cần có tên database, ví dụ `/mira_jewelry`. Nếu DNS không phân giải được Atlas, có thể đặt `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` trong `.env`. Các lệnh seed/catalog import chỉ dành cho database thử nghiệm.

Trang sản phẩm chung: `/products`, có mục **SẢN PHẨM** trên menu. Trang này mở toàn bộ trang sức và dùng bốn nhóm lọc: danh mục, chất liệu kim loại, loại đá / điểm nhấn và ngân sách tối đa.

Địa chỉ giao hàng dùng danh mục hai cấp sau sáp nhập: tỉnh/thành → xã/phường/đặc khu, kèm số nhà/tên đường. Nguồn [Province Open API v2](https://provinces.open-api.vn/), bản tải ngày 07/11/2026 lưu tại `scr/server/src/data/administrative-units.json` (34 tỉnh/thành, 3.321 đơn vị cấp xã). Server kiểm tra quan hệ tỉnh–xã và lưu cả mã hành chính lẫn địa chỉ đầy đủ trong đơn hàng; không tự chuyển đổi địa chỉ cũ.

Hai công cụ trên trang chủ có luồng riêng: `/ring-sizer` đổi chu vi/đường kính (mm) sang size tham khảo theo bảng DOJI, không tự chọn size mua hàng; `/jewelry-quiz` chọn dịp, ngân sách và tiêu chí từ danh mục MongoDB, hiển thị lý do gợi ý và tình trạng hàng, không tạo dữ liệu mẫu. Chạy `npm run test:tools` để kiểm tra quy đổi, giới hạn số đo và lọc sản phẩm.
