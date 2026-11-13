# Quản trị và thông báo

Mở `/admin` bằng tài khoản admin hoặc manager. Menu lần lượt: Tổng quan, Sản phẩm, Đơn hàng, Khách hàng, Khuyến mãi, AI & Gợi ý.

## Huy hiệu số

Mỗi mục có huy hiệu tròn màu hồng pastel khi số thông báo lớn hơn 0; số lớn hơn 99 hiển thị `99+`. Di chuột vào mục để xem nội dung; khi mở mục có thông báo, nội dung cũng hiện phía trên trang. Trên điện thoại, huy hiệu nằm cạnh biểu tượng.

| Mục        | Số được hiển thị                                                                            |
| ---------- | ------------------------------------------------------------------------------------------- |
| Sản phẩm   | Sản phẩm còn từ 5 đơn vị trở xuống, kể cả hết hàng                                          |
| Đơn hàng   | Đơn chờ xác nhận và đơn chờ thanh toán                                                      |
| Khách hàng | Khách đăng ký kể từ lần quản trị viên xem danh sách gần nhất; lần đầu là các khách chưa xem |
| Khuyến mãi | Chương trình đang chạy sẽ kết thúc trong 24 giờ tới                                         |
| AI & Gợi ý | Giao dịch có số tiền chưa khớp cần đối soát                                                 |

Số liệu cập nhật mỗi 15 giây khi trang đang hiển thị, khi quay lại cửa sổ và sau khi lưu trạng thái đơn. Ví dụ chỉ có một đơn chờ xác nhận thì mục Đơn hàng hiện số **1**; xác nhận đơn đó thì số giảm đi. Thông báo tồn kho/đơn/khuyến mãi/giao dịch giữ đến khi điều kiện cần chú ý được xử lý. Thông báo khách hàng được đánh dấu đã xem sau khi danh sách tải thành công; mốc đã xem lưu theo từng quản trị viên trong database, nên tải lại trang vẫn giữ được và không ảnh hưởng tài khoản quản trị khác.

## Đổi trạng thái đơn

Trong Tổng quan hoặc Đơn hàng, chọn **Trạng thái đơn …** ở từng hàng rồi bấm **Cập nhật**. Danh sách giữ đầy đủ các trạng thái; các bước không được phép sẽ bị vô hiệu hóa. Sau **Đã xác nhận**, admin có thể chọn ngay **Đang giao**, **Đã giao** hoặc **Hoàn tất** trong cùng danh sách, không cần lưu lần lượt từng bước trung gian. **Đã giao** có thể chuyển tiếp sang **Hoàn tất**. Có thể hủy ở các bước được hệ thống cho phép; đơn đã hủy/hoàn tất không chuyển ngược.

Đơn chuyển khoản **Chờ thanh toán** có thể chuyển sang **Đã xác nhận** ngay tại admin: chọn trạng thái, tích **Đã kiểm tra và nhận đủ … chuyển khoản**, rồi bấm **Cập nhật**. Chỉ tích sau khi đã kiểm tra thực tế. Server yêu cầu `confirmPayment: true`, đồng thời lưu trạng thái đơn `confirmed`, thanh toán `PAID`, thời điểm và phương thức xác nhận `ADMIN` trong cùng cập nhật. Khách hàng không có quyền thực hiện thao tác này. Webhook tự động vẫn hoạt động như trước; bằng chứng giao dịch gốc được giữ lại và các giao dịch đã được xác nhận đủ tiền không còn tính là cảnh báo chưa đối soát.

Đơn hoàn tất/đã hủy hiển thị nhãn trạng thái và không chuyển ngược bằng danh sách này.

Khi lưu, danh sách chọn tạm khóa để tránh gửi trùng; sau khi thành công, hiển thị thông báo tên trạng thái mới. API kiểm tra quyền admin/manager, kiểm tra chuyển trạng thái hợp lệ, bảo vệ cập nhật đồng thời và ghi AuditLog. Hoàn tất COD ghi nhận đã thanh toán và hành vi PURCHASE; hủy đơn hoàn lại tồn kho theo luồng hiện có.

## API và kiểm thử

- `GET /api/admin/notifications`: số và nội dung theo từng mục, yêu cầu admin/manager.
- `POST /api/admin/notifications/customers/read`: ghi nhận đã xem khách hàng cho tài khoản hiện tại.
- `PATCH /api/orders/:id/status`: `{ status, confirmPayment? }`, yêu cầu admin/manager và database ghi được. Với đơn chuyển khoản chưa thanh toán chuyển sang `confirmed`, bắt buộc `confirmPayment: true`.

Chạy `npm run build`, sau đó `npm run test:admin-notifications`. Bộ test dùng MongoDB tạm và Chrome, kiểm tra phân quyền, số theo từng mục, mốc đã xem riêng từng admin, lưu trạng thái thực, huy hiệu giảm từ 2 xuống 1, màu hồng pastel, tự cập nhật và giao diện mobile. Không ghi vào database trong `.env`.
