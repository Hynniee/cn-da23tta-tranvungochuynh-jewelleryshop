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
│   └── scripts/dev-full.mjs  # Khởi động bằng MongoDB đã cấu hình trong .env
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

**Tình trạng hồ sơ:** đã có báo cáo Word tuần 1 và [tuần 2](progress-report/week-02/BCTD%20T2.docx). Báo cáo tuần 2 ghi giai đoạn 09–15/11/2026, cập nhật đến 13/11/2026. Tài liệu thuyết minh, PDF và slide tiếp tục bổ sung theo hướng dẫn từng thư mục.

## Kiến trúc MVC

Backend tách `routes` → `controllers` → `models/services`; React đảm nhiệm View. Trang giỏ hàng tách Model tính toán, Controller hook và View JSX. Xem [hướng dẫn MVC](setup/MVC.md) để biết trách nhiệm từng lớp và cách thêm chức năng.

## Chạy nhanh với MongoDB hiện có

Chạy local từ thư mục gốc sau khi cấu hình `scr/server/.env`:

```bash
npm ci
npm run dev
```

Lệnh tự chọn cổng trống cho API và web, đồng thời cấu hình proxy đúng cổng API. Mở địa chỉ được in trong Terminal (mặc định http://localhost:5173). Không tự nhập dữ liệu mẫu. `npm run db:check` kiểm tra kết nối đọc và primary phục vụ ghi.

Hoặc chạy Docker:

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

- Website: http://localhost:8080
- API: http://localhost:5000/api/products
- Product Detail: http://localhost:8080/product/solitaire-etoile-diamond-ring

Cấu hình `MONGO_URI` trong `scr/server/.env` trỏ đúng tên database trước khi chạy. Website chỉ đọc dữ liệu từ MongoDB; không hiển thị danh mục mẫu khi mất kết nối. Xem `setup/README.md` và `scr/server/.env.example`.
Không đưa file `.env`, mật khẩu hoặc API key lên GitHub.

## Chức năng

Giao diện dùng chung tông nền kem, chữ đậm và điểm nhấn vàng; biểu mẫu, nút và thẻ nội dung thống nhất trên desktop/mobile. Thông báo yêu thích, giỏ hàng, lưu sản phẩm/tồn kho và khuyến mãi tự ẩn sau 3 giây. **Mua ngay** mở phần chọn size/khắc tên cho sản phẩm có kích cỡ; khách phải chọn trước khi thêm giỏ hoặc thanh toán, kể cả mẫu chỉ có một size. Nhẫn chọn số size, dây chuyền và vòng/lắc chọn chiều dài. Các lựa chọn của từng sản phẩm được ưu tiên; danh mục cũ thiếu size dùng cấu hình trong `scr/server/src/services/product-sizes.ts`. Phụ kiện không phân size không hiển thị “Tiêu chuẩn”. Có thể đổi size trong giỏ; máy chủ kiểm tra lại và lưu đúng lựa chọn vào đơn. Chạy `npm run test:sizes` sau `npm run build` để kiểm tra trên database riêng.

Thanh toán QR có vùng hiển thị riêng, thông tin ngân hàng/nội dung chuyển khoản kèm nút sao chép và xử lý lỗi tải ảnh. Nút **Tôi đã chuyển khoản** mở trang cảm ơn `/thank-you?order=...`, hiển thị thông tin đơn và tự cập nhật trạng thái từ máy chủ; chỉ luồng đối soát mới xác nhận đã thanh toán. Từ trang này có thể mở chi tiết đúng đơn trong tài khoản.

**Sổ địa chỉ**: thêm/sửa/xóa và chọn một địa chỉ mặc định trong tài khoản, dùng API tỉnh/thành–phường/xã chung với thanh toán (34 tỉnh/thành sau sáp nhập). Biểu mẫu chỉ mở khi thêm/sửa; hồ sơ cá nhân không còn ô địa chỉ tự do. Thanh toán mặc định mở form địa chỉ mới; người nhận có thể chủ động chọn địa chỉ đã lưu trong danh sách. Server kiểm tra chủ sở hữu và lưu bản địa chỉ tại thời điểm đặt hàng, nên sửa sổ địa chỉ không làm thay đổi đơn cũ. Danh sách đơn hàng dùng bảng cột/hàng thống nhất, cuộn ngang bên trong trên điện thoại.
E-commerce, MIRA AI Chat, Recommendation Engine, Diamond DSS 4Cs, quản trị và dữ liệu demo.

Khuyến mãi: **Admin → Khuyến mãi** quản lý voucher, giảm giá sản phẩm và flash sale theo lịch. Khách nhập mã tại giỏ hàng/thanh toán; server tính lại ưu đãi khi đặt đơn và lưu số tiền giảm trong đơn hàng. Xem [quy tắc và kiểm thử khuyến mãi](setup/promotions.md).

Private Salon: `/appointments` cho phép đặt lịch, xem trang xác nhận và nhận email qua Gmail SMTP. Xem [cấu hình email](setup/private-salon.md).

Quản trị sản phẩm: mở `/admin` → Sản phẩm → Thêm sản phẩm hoặc Sửa → **Chọn tệp ảnh**. Hỗ trợ JPG, PNG, WebP tối đa 5 MB, xem trước trước khi lưu; vẫn có thể nhập URL ảnh. Ảnh tệp được lưu tại `scr/server/uploads/products` khi bấm Lưu sản phẩm, đường dẫn lưu trong sản phẩm; sửa ảnh đại diện giữ lại các ảnh khác trong bộ ảnh. Endpoint upload yêu cầu quyền admin/manager. Docker dùng volume `product_uploads` để giữ ảnh khi tạo lại container. Có thể đặt `PRODUCT_UPLOAD_DIR` thành đường dẫn tuyệt đối để thay thư mục lưu. Build rồi chạy `npm run test:uploads` khi web local đang chạy để kiểm tra API upload và form admin bằng dữ liệu kiểm thử riêng.

## Học máy + DSS

ML Logistic Regression cung cấp tín hiệu quan tâm tham khảo; DSS quyết định điểm và thứ hạng từ sáu tiêu chí: danh mục, chất liệu, ngân sách, phong cách, dịp sử dụng, đánh giá. Trọng số tự điều chỉnh theo ngữ cảnh hoặc do khách chỉnh; kết quả trả điểm thành phần và đóng góp của từng tiêu chí. Xem [AI Advisor và DSS](setup/advisor-dss.md).

AI Advisor lưu ngữ cảnh nhiều lượt theo phiên, hỏi thêm loại trang sức/ngân sách còn thiếu; kim cương hỏi thêm carat. Trang `/advisor` và khung Hỏi MIRA dùng chung hội thoại trong tab. Có thể bắt đầu hội thoại mới, điều chỉnh trọng số và chọn 2–4 sản phẩm để so sánh. `/diamond-dss` hỗ trợ chỉnh trọng số 4Cs và Top-K. Admin → Khách hàng hỗ trợ tìm kiếm, xem lịch sử đơn và sửa tên/số điện thoại, có phân quyền và nhật ký thay đổi.

Quản trị: Tổng quan đứng đầu menu. Huy hiệu số tròn màu hồng pastel hiển thị các việc cần chú ý ở từng mục, tự cập nhật mỗi 15 giây khi trang đang mở và khi quay lại cửa sổ. Admin/manager đổi trạng thái đơn qua danh sách chọn; hệ thống lưu thay đổi, ghi nhật ký và cập nhật huy hiệu. Xem [hướng dẫn quản trị và thông báo](setup/admin.md).

**Liên hệ hỗ trợ** (`/support`): khách đăng nhập nhắn trực tiếp với nhân viên, lịch sử lưu trong MongoDB theo tài khoản và tự cập nhật mỗi 5 giây khi trang hiển thị. Liên hệ từ chi tiết đơn hàng sẽ đính kèm đúng đơn của khách. **Admin → Tin nhắn** hỗ trợ tìm theo tên/email, xem tin chưa đọc, trả lời, lọc hội thoại đang hỗ trợ/đã xử lý và mở đơn liên quan. Tin mới mở lại hội thoại đã xử lý; gửi lại cùng mã không tạo tin trùng. Kiểm tra luồng API, phân quyền và giao diện với `npm run build` rồi `npm run test:support` trên database kiểm thử riêng.

## Phát triển và kiểm thử local

```bash
npm ci
npm run dev
```

Website: http://localhost:5173. Chạy `npm run build`, sau đó `npm test` để kiểm tra xử lý mất kết nối, API trên MongoDB kiểm thử riêng và Chrome. `npm run format` định dạng source; `npm run format:check` kiểm tra định dạng. Xem `setup/README.md` khi cổng 5000 đã được Docker sử dụng.

## Trang sức đa dạng và chạy đầy đủ

Catalog của website lấy từ database trong `MONGO_URI`. Các bản ghi có `metals`, `gemstone` hoặc thiếu `slug` được chuyển đổi khi đọc để tương thích với bộ lọc và đường dẫn sản phẩm; không sửa dữ liệu gốc. `scr/server/src/data/catalog.json` chỉ còn dùng cho các script tạo dữ liệu kiểm thử.

Chạy `npm run dev:full` để mở API và website với MongoDB đã cấu hình. Lệnh này không tạo MongoDB local và không tự nạp sản phẩm mẫu. URI Atlas cần có tên database, ví dụ `/mira_jewelry`. Nếu DNS không phân giải được Atlas, có thể đặt `MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8` trong `.env`. Các lệnh seed/catalog import chỉ dành cho database thử nghiệm.

Khi danh mục không tải được, chạy `npm run db:check` để kiểm tra kết nối và đếm sản phẩm trong collection `products`, không thay đổi dữ liệu. Nếu báo lỗi TLS, kiểm tra cluster đang Active và thêm IP máy chạy API tại Atlas → Network Access → IP Access List → Add Current IP Address; đồng thời kiểm tra phần mềm chặn mạng/TLS. Lỗi TLS xảy ra trước xác thực nên chưa thể kết luận database rỗng hoặc mật khẩu sai. Xem [hướng dẫn kết nối Atlas](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

Nếu secondary truy cập được nhưng primary đang lỗi mạng/TLS, có thể tạm đặt `MONGO_READ_PREFERENCE=primaryPreferred` trong `.env` rồi khởi động lại server. Ứng dụng ưu tiên đọc primary và chỉ chuyển sang secondary khi cần; dữ liệu đọc dự phòng có thể chậm đồng bộ. Cấu hình này áp dụng cho các thao tác đọc và không khôi phục khả năng ghi: đăng ký, đặt hàng, cập nhật sản phẩm và thanh toán vẫn cần primary. Đặt lại `primary` khi kết nối cluster ổn định. `npm run db:check` báo riêng số sản phẩm đọc được và khả năng truy cập primary. Xem [MongoDB Read Preference](https://www.mongodb.com/docs/manual/core/read-preference-use-cases/).

Trang sản phẩm chung: `/products`, có mục **SẢN PHẨM** trên menu. Trang này mở toàn bộ trang sức và dùng bốn nhóm lọc: danh mục, chất liệu kim loại, loại đá / điểm nhấn và ngân sách tối đa.

Địa chỉ giao hàng dùng danh mục hai cấp sau sáp nhập: tỉnh/thành → xã/phường/đặc khu, kèm số nhà/tên đường. Nguồn [Province Open API v2](https://provinces.open-api.vn/), bản tải ngày 07/11/2026 lưu tại `scr/server/src/data/administrative-units.json` (34 tỉnh/thành, 3.321 đơn vị cấp xã). Server kiểm tra quan hệ tỉnh–xã và lưu cả mã hành chính lẫn địa chỉ đầy đủ trong đơn hàng; không tự chuyển đổi địa chỉ cũ.

Hai công cụ trên trang chủ có luồng riêng: `/ring-sizer` đổi chu vi/đường kính (mm) sang size tham khảo theo bảng DOJI, không tự chọn size mua hàng; `/jewelry-quiz` chọn dịp, ngân sách và tiêu chí từ danh mục MongoDB, hiển thị lý do gợi ý và tình trạng hàng, không tạo dữ liệu mẫu. Chạy `npm run test:tools` để kiểm tra quy đổi, giới hạn số đo và lọc sản phẩm.
