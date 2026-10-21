# Kiểm thử và sửa lỗi MIRA Jewelry

Ngày thực hiện: 21/10/2026.

## Đánh giá từ khách đã mua

- Trang chi tiết hiển thị đánh giá, số sao, điểm trung bình và phân trang; khách chưa đăng nhập cũng xem được.
- Chỉ tài khoản có đơn hàng đã hoàn tất chứa đúng sản phẩm và chưa hoàn tiền được gửi đánh giá. Mỗi tài khoản đánh giá một lần cho mỗi sản phẩm.
- Máy chủ xác minh người dùng và đơn hàng; chỉ nhận số sao nguyên từ 1–5 và nội dung tối đa 2.000 ký tự. Chỉ mục duy nhất chặn cả hai yêu cầu gửi đồng thời.
- Đã kiểm thử API và Chrome: khách chưa mua, đơn chưa hoàn tất/đã hủy/hoàn tiền, dữ liệu sai, gửi trùng, quyền riêng tư, tính điểm và gửi từ giao diện. Tổng cộng 84 kiểm tra PASS.
- Ảnh: `scr/test-data/results/reviews-mobile.png`.

## Trang sản phẩm chung và bộ lọc

- `/products` mở toàn bộ trang sức; menu có mục SẢN PHẨM.
- Chỉ giữ bốn nhóm: DANH MỤC, CHẤT LIỆU KIM LOẠI, LOẠI ĐÁ / ĐIỂM NHẤN và NGÂN SÁCH TỐI ĐA.
- Kiểm thử Chrome kiểm tra lọc kết hợp danh mục/chất liệu/ngân sách, loại đá, chọn nhiều chất liệu, giữ lựa chọn khi tải lại và đặt lại bộ lọc.
- Build, kiểm tra định dạng và toàn bộ 84 kiểm tra tự động đều PASS.
- Ảnh trang sản phẩm: `scr/test-data/results/products-desktop.png`.

## Bổ sung chức năng trang sức đa dạng

- Thêm 20 ảnh minh họa SVG theo chất liệu, loại đá và nhóm sản phẩm; các ảnh mới được lưu tại `scr/client/public/products/`.
- Thêm 20 mẫu, tổng 36 sản phẩm và 7 nhóm: Nhẫn, Dây chuyền, Vòng tay, Bông tai, Lắc chân, Charm, Bộ trang sức.
- Thêm bạc 925, vàng 14K/18K, ngọc trai, Ruby, Sapphire, Emerald, thạch anh tím và Zircon. Catalog JSON dùng chung cho client/server.
- Thêm bộ sưu tập vàng/bạc/ngọc trai/đá màu; lọc kết hợp theo loại đá; tìm kiếm không dấu; bộ lọc thu gọn trên điện thoại.
- Hiển thị chất liệu, kích cỡ, tồn kho, mô tả và tùy chọn khắc đúng theo từng sản phẩm; bỏ nội dung GIA áp dụng chung. AI phân biệt trang sức đính kim cương với kim cương rời và hiểu yêu cầu bạc/ngọc trai/không kim cương.
- Giỏ hàng và checkout kiểm tra lại giá/tồn kho, giữ lựa chọn khi đăng nhập và trở lại checkout; hỗ trợ khách hủy đơn chưa xử lý.
- Quản trị có thể sửa sản phẩm, loại đá, kích cỡ, nội dung khắc và mô tả. Slug tự cập nhật theo tên khi tạo mới.
- Cấu hình giao hàng dùng chung: 30.000₫, miễn phí từ 2.000.000₫. Chuyển khoản chỉ bật khi có thông tin ngân hàng.
- Thêm `dev:full` với MongoDB local lưu dữ liệu và `catalog:import` để thêm sản phẩm mà không ghi đè dữ liệu cũ.
- Đã xác nhận cấu hình Compose, build Docker frontend/backend và nạp catalog/model trên Node 20 trong container sau thay đổi cấu trúc catalog.

## Phạm vi đã xử lý

- Định dạng source TypeScript/TSX/CSS/HTML/JSON bằng Prettier; thêm lockfile và lệnh kiểm tra lặp lại.
- Nâng Express 5 để các lỗi trong async route đi vào middleware xử lý lỗi; trả JSON cho API không tồn tại, dữ liệu sai và lỗi database.
- Thêm Vite proxy, cấu hình cổng API thay thế và nâng Vite lên 6.4.4. Chuyển công cụ build frontend vào devDependencies.
- Các chức năng phụ thuộc MongoDB trả lỗi rõ ràng khi chạy demo. DSS dùng dữ liệu demo khi chưa có database, kiểm tra đầu vào và chuẩn hóa trọng số về 100%.
- Tìm kiếm, lọc danh mục/chất liệu/ngân sách, sắp xếp và phân trang cửa hàng sử dụng dữ liệu thật. Wishlist lưu, bỏ lưu và hiển thị sản phẩm.
- Trang chủ lấy danh mục sản phẩm từ API. Chi tiết sản phẩm dùng giá/chất liệu thật, giữ nội dung khắc trong giỏ hàng, xử lý sản phẩm không tồn tại và hết hàng. Loại các lựa chọn carat/biến thể và đánh giá mẫu chưa có dữ liệu hỗ trợ.
- API đặt hàng tự tính giá và phí vận chuyển, kiểm tra sản phẩm/số lượng/kích cỡ, giữ tồn kho bằng cập nhật có điều kiện; hoàn tồn khi hủy. Mã đơn dùng UUID để tránh trùng thời gian.
- Kiểm soát chuyển trạng thái đơn. Hoàn tất COD ghi nhận đã thanh toán.
- Webhook yêu cầu secret và chữ ký hợp lệ, kiểm tra số tiền, chống xử lý lại transaction đã có và ngăn tạo QR lại cho đơn đã thanh toán. Khách chỉ xem thanh toán của đơn thuộc mình. Có thể mở lại trang thanh toán từ đơn chờ chuyển khoản.
- Hồ sơ được lưu xuống MongoDB, không chỉ localStorage; không cho thay đổi role qua API hồ sơ. Chuẩn hóa email khi đăng nhập/đăng ký.
- Bổ sung lỗi hiển thị ở checkout/admin, xử lý storage JSON hỏng và trang 404. Thêm ảnh placeholder có thật trong public.
- Sửa header/footer và các bố cục chính trên màn hình 390px. Thay các form đặt lịch/newsletter chưa có xử lý bằng liên kết đến chức năng tư vấn/bộ sưu tập đang hoạt động.
- JWT không còn dùng secret mặc định cố định. Production yêu cầu secret được cấu hình; phản hồi gợi ý chỉ cập nhật log thuộc người đăng nhập.

## Kết quả xác nhận cuối

- Build frontend/backend: PASS.
- Bộ kiểm thử API + MongoDB tạm + Chrome desktop/mobile: **84 kiểm tra PASS**.
- Prettier: PASS.
- `npm audit`: **0 lỗ hổng được báo cáo** tại thời điểm kiểm tra.
- Bản local hiện chạy tại http://localhost:5174, proxy đến API http://127.0.0.1:5002. Health và ảnh placeholder trả HTTP 200. Bản xem hiện dùng MongoDB local; kiểm thử tích hợp dùng MongoDB tạm riêng.

## Cách kiểm tra lại

```bash
npm ci
npm run build
npm test
npm run format:check
npm audit
python scr/ml/evaluate_demo.py
```

Test Node chạy demo và MongoDB tạm trên cổng 5107, Vite trên 5187, Chrome headless. Test không dùng database thật trong `.env`; database tạm được dọn khi kết thúc. Lần đầu cần tải MongoDB binary. Có thể dùng `TEST_BROWSER_CHANNEL=msedge` nếu máy dùng Edge.

Kết quả tự động: `scr/test-data/results/summary.json`. Ảnh kiểm tra: `scr/test-data/results/shop-desktop.png` và `scr/test-data/results/shop-mobile.png`.

## Giới hạn kiểm chứng

- Gemini thật và giao dịch ngân hàng thật chưa được gọi vì chưa có cấu hình nhà cung cấp. Đã kiểm tra bộ phân tích dự phòng và webhook bằng chữ ký/số tiền thử nghiệm.
- Chữ ký webhook hiện dùng HMAC SHA-256 trên `JSON.stringify(body)`; cần đối chiếu hợp đồng API trước khi nối nhà cung cấp thanh toán.
- Giữ tồn kho nhiều sản phẩm dùng cập nhật từng sản phẩm và hoàn lại nếu lỗi. Chưa có transaction nhiều document, cơ chế tự hết hạn đơn chờ thanh toán hay kiểm thử lỗi máy chủ dừng giữa các bước.
- `scr/test-data/test_cases.csv` chỉ có header, chưa có dữ liệu đánh giá tư vấn thực tế. Không tạo số liệu giả.
- Đánh giá mô hình đi kèm chỉ dùng dữ liệu tổng hợp: 200 mẫu test, accuracy 0.69, F1 0.4833; chưa chứng minh hiệu quả trên khách hàng thực tế.
- Source hiện không có thư mục `.git`, vì vậy không có git diff/commit của đợt sửa này.
