# Experimental evaluation

## Kiểm thử tự động

Chạy từ thư mục gốc repository sau `npm ci`:

```bash
npm run build
npm run test:cart
npm run test:appointments
npm test
npm run test:decision-support
npm run test:admin-notifications
```

- `test.mjs`: kiểm thử API demo, MongoDB tạm và giao diện Chrome/Edge.
- `decision-support.test.mjs`: quản trị khách hàng và phân quyền; phiên tư vấn nhiều lượt và cách ly người dùng; thiếu/đổi tiêu chí; DSS đổi trọng số, chuẩn hóa, điểm thành phần và Top-K; 4Cs; hành vi và purchase chống trùng; Gemini mô phỏng thành công/lỗi; giao diện quản trị, tư vấn, so sánh desktop/mobile. Không gọi Gemini thật hoặc ghi database `.env`. Chạy sau build.
- `admin-notifications.test.mjs`: thứ tự menu, số thông báo theo từng mục, huy hiệu tròn hồng pastel, mốc đọc riêng từng admin, nút Cập nhật đơn, lưu trạng thái COD và xác nhận thủ công đơn chuyển khoản, xác nhận đã nhận tiền, bảo toàn chứng từ ngân hàng, khóa khi đang lưu, tự cập nhật và mobile. Chạy sau build với MongoDB kiểm thử riêng.
- `cart-model.test.ts`: quy tắc số lượng, tồn kho giữa các biến thể và phí vận chuyển.
- `appointments.test.mjs`: đặt lịch Private Salon, email qua SMTP giả lập và giao diện xác nhận desktop/mobile.
- `promotions.test.mjs`: voucher, giảm giá, flash sale, báo giá và tạo đơn trên MongoDB kiểm thử riêng. Chạy `npm run test:promotions` sau build.
- `product-upload.test.mjs`, `database-errors.test.mjs`: tải ảnh quản trị và xử lý lỗi MongoDB; chạy `npm run test:uploads`, `npm run test:db-errors` sau build.
- `ui-regressions.mjs`: tìm kiếm, menu mobile, trạng thái tải/lỗi và đăng nhập; chạy `npm run test:ui` khi web dev đang chạy.
- `checkout-ui.test.mjs`: QR ở 320/390/768/1440 px, sao chép, lỗi ảnh/thử lại, trạng thái thanh toán, Mua ngay và 18 màn hình desktop/mobile. Chạy `npm run test:checkout-ui` khi web dev đang chạy; toàn bộ API và ảnh QR được mô phỏng trong trình duyệt, không gửi giao dịch thật. Có thể đặt `UI_TEST_URL` nếu web dùng cổng khác.
- `account-checkout.test.mjs`: CRUD địa chỉ, mặc định/giới hạn khi lưu đồng thời, phân quyền, bản địa chỉ trong đơn hàng, thanh toán bằng địa chỉ đã lưu/nhập mới, trang cảm ơn và bảng đơn hàng trên desktop/mobile. Chạy `npm run test:account-checkout` sau build khi web dev đang chạy. MongoDB tạm và API kiểm thử riêng, không ghi Atlas.
- `results/`: ảnh và `summary.json` được tạo khi chạy, không đưa vào Git.

Điều kiện chạy và dữ liệu tái lập: [setup/README.md](../../setup/README.md), [demo-data](../../setup/demo-data/README.md).

## Đánh giá thực nghiệm

Không điền số liệu giả. Chạy các ca kiểm thử thật rồi nhập vào `test_cases.csv`.

- Intent Accuracy: Gemini/parser hiểu đúng ràng buộc người dùng.
- Precision@5: số item liên quan trong top 5 / 5.
- Recall@5: số item liên quan tìm được trong top 5 / tổng item liên quan theo ground truth.
- Hit Rate@5: top 5 có ít nhất một item phù hợp hay không.
- Response Time: ms đo thực tế.

So sánh ít nhất 3 phương pháp: Random, Popular và Personalized DSS. Có thể lưu mỗi phương pháp thành một CSV riêng và chạy `python evaluate.py file.csv`.
