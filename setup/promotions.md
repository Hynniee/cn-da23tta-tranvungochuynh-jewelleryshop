# Voucher, giảm giá và flash sale

Mở `/admin` và chọn **Khuyến mãi**. Tài khoản admin hoặc manager có thể tạo, sửa, bật/tắt chương trình trong ba tab:

- **Voucher:** mã 3–32 ký tự, giảm theo phần trăm hoặc số tiền, đơn tối thiểu và giảm tối đa mỗi đơn.
- **Giảm giá:** chọn một số sản phẩm hoặc toàn bộ danh mục; giảm theo phần trăm hoặc số tiền.
- **Flash sale:** cùng cách chọn sản phẩm, với lịch bắt đầu/kết thúc rõ ràng. Sản phẩm nhận nhãn Flash Sale khi đây là ưu đãi tạo ra giá thấp nhất.

Ngày giờ nhập theo múi giờ thiết bị, gửi lên API dưới dạng ISO UTC. Chương trình chỉ áp dụng khi được bật và `startsAt <= thời điểm tính giá < endsAt`. Trạng thái gồm Sắp diễn ra, Đang diễn ra, Đã kết thúc và Đã tắt. Tắt chương trình giữ lại lịch sử, không xóa dữ liệu.

## Quy tắc tính tiền

1. Mỗi sản phẩm chọn giá thấp nhất giữa giá bán hiện có và các discount/flash sale đang chạy. Các mức giảm không cộng chồng; phần trăm được tính từ giá gốc và làm tròn xuống theo đồng. Giảm tối đa của chương trình sản phẩm áp dụng cho mỗi đơn vị sản phẩm.
2. Mỗi đơn dùng tối đa một voucher, được nhập ở giỏ hàng hoặc thanh toán và chuyển tiếp trong phiên trình duyệt. Đơn tối thiểu được kiểm tra sau giảm giá sản phẩm, trước phí giao hàng. Giảm tối đa của voucher áp dụng cho cả đơn.
3. Voucher không giảm phí giao hàng và không thể làm giá trị hàng hóa âm. Điều kiện miễn phí giao hàng dựa trên giá trị hàng sau discount/flash sale, trước voucher.
4. Server đọc lại giá, tồn kho, chương trình và voucher từ primary khi tạo đơn; không tin giá hay số tiền giảm do client gửi. Nếu tổng tiền khác báo giá khách vừa xác nhận, API trả 409, chưa tạo đơn/trừ tồn kho và yêu cầu xác nhận lại.
5. Đơn hàng lưu giá đã áp dụng, snapshot chương trình từng dòng, mã voucher, số tiền giảm và tổng cuối cùng. Việc tắt/hết hạn chương trình không sửa đơn cũ hoặc giá gốc của sản phẩm.

Voucher hiện không giới hạn số lượt dùng hay số lần dùng trên mỗi khách. Flash sale chưa có quota tồn kho riêng; vẫn kiểm tra và trừ tồn kho chung của sản phẩm khi đặt đơn.

## API

- `GET /api/promotions`: danh sách quản trị, cần admin/manager.
- `POST /api/promotions`: tạo chương trình.
- `PUT /api/promotions/:id`: sửa đầy đủ chương trình.
- `PATCH /api/promotions/:id/active`: bật/tắt qua `{ "active": true/false }`.
- `POST /api/promotions/quote`: tính báo giá từ danh sách `{ product, quantity, size, engraving? }` và `voucherCode` tùy chọn; khách chưa đăng nhập cũng có thể kiểm tra giỏ.

API thay đổi chương trình kiểm tra kết nối primary trước khi ghi. Nếu Atlas chỉ đọc được secondary, giao diện báo lỗi kết nối; không báo lưu thành công hoặc tự chuyển database.

## Kiểm thử

Chạy `npm run build`, mở web local rồi chạy `npm run test:promotions`. Bộ kiểm thử dùng MongoDB tạm riêng, bao gồm phân quyền, mã trùng, dữ liệu không hợp lệ, điều kiện áp dụng, lịch chạy, giá tốt nhất, tính tổng, lưu đơn, xác nhận lại khi giá đổi và thao tác quản trị/thanh toán trên Chrome. Không tạo khuyến mãi hay đơn thử trong Atlas thật.
