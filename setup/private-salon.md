# Đặt lịch Private Salon và Gmail SMTP

## Luồng người dùng

1. Chọn **ĐẶT LỊCH TƯ VẤN** ở cuối trang hoặc liên kết Private Salon trên thanh đầu trang.
2. Tại `/appointments`, nhập tên, email, số điện thoại, Salon, ngày theo thứ tự `dd/mm/yyyy`, giờ, nhu cầu, ngân sách và ghi chú. Form tự thêm dấu `/` và chặn ngày quá khứ/ngày không tồn tại; API vẫn nhận ngày dạng `yyyy-mm-dd` sau khi chuyển đổi.
3. Backend kiểm tra dữ liệu rồi lưu vào MongoDB, sinh mã `MIRA-…`.
4. Trang `/appointments/:code` lấy lại thông tin đã lưu và hiển thị mã hẹn, Salon, ngày giờ và trạng thái gửi email.
5. Khi SMTP sẵn sàng, email xác nhận được gửi tới địa chỉ khách vừa nhập, chứa cùng mã hẹn và thông tin buổi tư vấn.

Không bắt buộc đăng nhập. Khách được chọn khung giờ trong 90 ngày tới, theo giờ Việt Nam UTC+7; ngày/giờ trong quá khứ không được chấp nhận. Danh sách Salon, khung giờ, nhu cầu và ngân sách được cấu hình dùng chung tại `scr/server/src/data/appointmentConfig.json`.

## Cấu hình Gmail

Tạo `scr/server/.env` từ `.env.example` nếu chưa có, giữ lại cấu hình database và các dịch vụ khác. Điền:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-salon@gmail.com
SMTP_PASS=your_google_app_password
MAIL_FROM="MIRA Private Salon <your-salon@gmail.com>"
```

`SMTP_USER` là Gmail gửi thư; `MAIL_FROM` dùng cùng địa chỉ đó. `SMTP_PASS` là **App Password** của tài khoản này, không phải mật khẩu đăng nhập Gmail. Bật Xác minh 2 bước và tạo App Password theo [hướng dẫn Google](https://support.google.com/accounts/answer/185833?hl=vi). Nhập bí mật trực tiếp vào `.env`, không đưa vào chat hay commit Git.

Sau khi sửa cấu hình, khởi động lại `npm run dev:full` (hoặc backend). MongoDB phải đang kết nối. Nếu dùng Docker, tạo lại service để nạp môi trường:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Gửi SMTP được triển khai bằng [Nodemailer SMTP transport](https://nodemailer.com/smtp), kết nối TLS cổng 465 và giới hạn thời gian chờ.

## Trạng thái email

- `sent`: SMTP đã chấp nhận thư; người dùng cần kiểm tra cả thư rác. Đây không phải bảo đảm thư đã vào inbox.
- `not_configured`: lịch đã lưu, chưa cấu hình đủ SMTP.
- `failed`: lịch đã lưu nhưng SMTP gửi lỗi; có thể gửi lại sau tối thiểu một phút.
- `pending`: đang xử lý gửi thư.

Nút gửi lại dùng chính lịch hẹn đã lưu, không tạo lịch mới. Giới hạn tối đa 5 lần gửi email cho một lịch hẹn. Gửi lại yêu cầu đặt lịch cùng token cũng trả về lịch cũ, tránh tạo trùng khi người dùng nhấn nhiều lần hoặc mất phản hồi mạng. Tạo lịch giới hạn 5 lịch/giờ theo IP; khi triển khai qua proxy, cần xem xét giới hạn phù hợp với lượng khách thực tế.

Thông tin khách chỉ được đọc bằng mã hẹn kèm token bí mật của phiên đặt lịch. Token được giữ trong session trình duyệt, không nằm trong URL hay email. Khách có thể tải lại trang xác nhận trên phiên đang dùng; đóng/mất phiên thì giữ thông tin trong email. Không có API công khai liệt kê lịch và dữ liệu liên hệ.

## Kiểm thử

```bash
npm run build
npm run test:appointments
npm test
```

`test:appointments` khởi động MongoDB tạm, SMTP giả lập tại localhost và Chrome/Edge. Kiểm tra dữ liệu đầu vào, ngày giờ, email đúng nội dung/người nhận, gửi lỗi/gửi lại, chống trùng, bảo vệ thông tin, giới hạn tạo lịch, luồng giao diện và kích thước mobile. Thư trong kiểm thử được giữ trong bộ nhớ, không gửi tới Gmail hay khách thật. Cần cài Chrome (hoặc `TEST_BROWSER_CHANNEL=msedge`) và có MongoDB binary như bộ kiểm thử hiện có.

Để xác minh Gmail thật, sau khi điền cấu hình, đặt một lịch bằng địa chỉ nhận do bạn kiểm soát và kiểm tra mã hẹn/ngày giờ trong inbox.
