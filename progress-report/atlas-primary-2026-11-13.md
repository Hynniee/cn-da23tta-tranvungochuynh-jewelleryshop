# Atlas primary: kết quả kiểm tra ngày 13/11/2026

## Cập nhật: đã khôi phục kết nối primary

Kiểm tra trực tiếp Atlas bằng Chrome phát hiện IP công khai hiện tại của máy chưa có trong IP Access List. Người dùng đã xác nhận thêm đúng địa chỉ với phạm vi `/32`; giao diện hiện hiển thị Active.

- `npm run db:check` thành công, đọc được 109 sản phẩm và xác nhận primary truy cập được, kết nối phục vụ ghi đã sẵn sàng.
- API tại cổng 5000 và proxy tại 5173 đều trả `database: mongodb`.
- Sau khi kết nối phục hồi, phát hiện `admin@mira.vn` chưa tồn tại. Người dùng đã chấp thuận trực tiếp việc tạo tài khoản này với quyền admin và mật khẩu ngẫu nhiên mới.
- Đã tạo duy nhất tài khoản `admin@mira.vn`; mật khẩu lưu dưới dạng bcrypt, không ghi mật khẩu hoặc token vào source/báo cáo. Giữ nguyên tài khoản hiện có.
- Đăng nhập qua cổng web 5173 trả HTTP 200 với role admin; `/api/auth/me`, `/api/promotions` và POST `/api/products/write-status` đều trả 200. Chưa tạo đơn hàng hoặc sửa sản phẩm thật để kiểm thử.

Các kết quả TLS bên dưới là lịch sử trước khi thêm IP mới, không phản ánh tình trạng sau khi kết nối đã phục hồi.

## Kết quả thực tế

- Database `mira_jewelry` đọc được 109 sản phẩm.
- Lệnh `hello` xác nhận primary là `ac-e9ynwra-shard-00-02.9cl3lue.mongodb.net:27017`.
- `replSetGetStatus` trả cả ba member `health: 1`; node 00 và 01 là secondary, node 02 là primary.
- DNS công cộng phân giải thành công cả ba hostname.
- Hai secondary bắt tay TLS thành công với cả TLS 1.2 và TLS 1.3, có kiểm tra chứng chỉ.
- Primary (`159.143.172.125` ở thời điểm kiểm tra) trả `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` với TLS mặc định, TLS 1.2 và TLS 1.3. Lỗi xảy ra trước xác thực MongoDB.
- Kiểm tra primary bằng driver thất bại. Chưa khôi phục thao tác ghi, chưa thay đổi dữ liệu thật.

Không đủ bằng chứng kết luận nguyên nhân là IP Access List, ISP hay phía dịch vụ Atlas. Không tắt xác minh chứng chỉ, không chuyển thao tác ghi sang secondary, không đổi database.

## Bước cần thực hiện trong Atlas

Mở hỗ trợ MongoDB Atlas và gửi nội dung bên dưới, kèm tên project/cluster. Tài khoản database trong `.env` không có quyền quản lý hạ tầng Atlas; không gửi mật khẩu hoặc connection string chứa credential cho hỗ trợ.

```text
Primary TLS handshake failure on one replica-set member.
Replica set: atlas-wmg9uc-shard-0
Primary: ac-e9ynwra-shard-00-02.9cl3lue.mongodb.net:27017
Both secondaries accept TLS 1.2 and TLS 1.3 and authenticated reads work.
The primary rejects TLS 1.2 and TLS 1.3 with
ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR before MongoDB authentication.
hello and replSetGetStatus on a secondary report this primary healthy.
DNS resolves successfully. Several client public /32 addresses were added
to the project's IP access list and are Active, but the issue persists.
Please inspect the primary endpoint's TLS/network access enforcement
and advise how to restore connectivity without losing data.
```

Sau khi phía mạng/Atlas xử lý, chạy `npm run db:check` từ Terminal trên máy chạy server. Chỉ coi kết nối ghi đã phục hồi khi có dòng `Primary truy cập được; kết nối phục vụ ghi dữ liệu đã sẵn sàng.`. Lệnh trả mã khác 0 khi chưa sẵn sàng. Script Node trực tiếp đặt mã 2 khi chỉ đọc được secondary, mã 1 khi không kết nối được, mã 0 khi kiểm tra thành công; npm trên Windows có thể quy lỗi thành mã 1.

Tài liệu đối chiếu: https://www.mongodb.com/docs/atlas/troubleshoot-connection/
