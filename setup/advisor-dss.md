# AI Advisor, hồ sơ hành vi và DSS

## Dùng trên giao diện

- **Admin → Khách hàng**: tìm theo tên/email/số điện thoại; phân trang 20 khách/trang; xem tối đa 100 đơn gần nhất; sửa tên và số điện thoại. Chỉ admin/manager được truy cập. Không sửa vai trò, mật khẩu hay tài khoản nhân viên qua API này; thay đổi được ghi AuditLog.
- **Hỏi MIRA / `/advisor`**: hội thoại nhiều lượt, cùng phiên trong một tab. Ví dụ: “Tôi muốn mua nhẫn” → trả lời ngân sách còn thiếu → “Nhẫn bạc dưới 1 triệu” → “Giảm xuống 700 nghìn”. Danh mục, chất liệu và các tiêu chí không đổi được giữ lại. Có nút Hội thoại mới.
- Nếu thiếu danh mục hoặc ngân sách tối đa, Advisor hỏi bổ sung trước khi xếp hạng. Chất liệu, phong cách, dịp sử dụng là tiêu chí tùy chọn; trang tư vấn nhắc bổ sung khi chưa biết. Với kim cương, cần ngân sách và carat mục tiêu.
- Chọn **Tự điều chỉnh trọng số trang sức** để dùng thanh mức ưu tiên. Bỏ chọn và gửi nhu cầu để trở lại trọng số theo ngữ cảnh. Lời nhắn “ưu tiên ngân sách/phong cách/chất liệu/dịp/đánh giá” cũng điều chỉnh ưu tiên.
- Chọn 2–4 kết quả để so sánh giá, thông số, điểm chuẩn hóa và đóng góp từng tiêu chí. Liên kết mở đúng trang sản phẩm. Kim cương có trang `/diamond/:id` với thông số thật và liên kết đặt lịch tư vấn.
- **`/diamond-dss`**: chỉnh trọng số carat/cut/color/clarity, ngân sách, carat mục tiêu và Top-K (3/5/10); so sánh các kim cương trong kết quả.

## Công thức và trách nhiệm

Service gợi ý tạo ứng viên từ sản phẩm còn hàng, áp dụng ràng buộc cứng về khoảng ngân sách, danh mục, chất liệu và loại đá. Các tiêu chí mềm được chuẩn hóa về [0,1]:

- Danh mục/chất liệu/phong cách: khớp tiêu chí hiện tại, hoặc điểm sở thích chia cho mức quan tâm lớn nhất của thuộc tính đó. Người chưa có lịch sử dùng mức trung tính 0,5.
- Ngân sách: độ gần giá hiện tại với trung điểm khoảng ngân sách (nếu chỉ có trần thì lấy trung điểm 0–trần); khi không có ngân sách dùng giá sở thích hoặc giá sản phẩm.
- Dịp sử dụng: 1 khi sản phẩm được gắn đúng dịp, 0 khi không khớp; 0,5 khi chưa chỉ định dịp.
- Đánh giá: rating / 5.

Trọng số gốc: danh mục 25, chất liệu 20, ngân sách 20, phong cách 15, dịp 15, đánh giá 5. Có trần ngân sách: tăng ngân sách 10; có dịp: tăng dịp 15; có phong cách: tăng phong cách 10. Tiêu chí khách ưu tiên được nhân 2, sau đó chuẩn hóa tổng về 1. Trọng số nhập tay thay thế toàn bộ trọng số tự động; tiêu chí không truyền vào có trọng số 0. Tất cả phải hữu hạn, không âm, tổng lớn hơn 0.

`DSS score = 100 × Σ(value_i × weight_i)`. Xếp hạng theo điểm chưa làm tròn, sau đó giá tăng dần khi bằng điểm. Kết quả gồm `score`, `dssScore`, `scoreParts`, `weights`, `reasons`, `mlScore`. ML là tín hiệu tham khảo, không thay thứ hạng DSS. Điểm không phải xác suất hài lòng.

4Cs chuẩn hóa cut/color/clarity bằng thứ hạng trong các thang đã khai báo; carat dùng độ gần carat mục tiêu. API nhận `weights` và `limit`; mặc định Top-5. Trong chat, câu “ưu tiên giác cắt/carat/màu/độ tinh khiết” chuyển tiêu chí đó lên mức ưu tiên cao nhất. Đây là mô hình hỗ trợ lựa chọn của đồ án, không phải định giá/chứng nhận chất lượng kim cương.

Gemini trích xuất tiêu chí mới dựa trên nhu cầu và các lượt trước, sau đó chỉ diễn giải sản phẩm, điểm, trọng số, đóng góp do DSS trả về. Gemini không tính lại thứ hạng. Nếu chưa có API key hoặc Gemini lỗi/quá thời gian, dùng parser và lời giải thích từ điểm DSS tại máy chủ. Cần kiểm chứng thêm trên Gemini thật với key/quota hợp lệ; kiểm thử tự động mô phỏng giao thức và lỗi API, không đo chất lượng ngôn ngữ của dịch vụ thật.

## Lưu trữ và hành vi

`AdvisorSession` lưu ID UUID ngẫu nhiên, chủ sở hữu, nhu cầu hợp nhất, chế độ trang sức/kim cương và tối đa 24 lượt gần nhất. Phiên hết hạn sau 30 ngày không hoạt động. Phiên đăng nhập chỉ được dùng bởi đúng người dùng; khách dùng mã phiên như mã truy cập trong tab. Trình duyệt dùng sessionStorage riêng theo tài khoản và đồng bộ hai giao diện qua sự kiện trong tab.

Hành vi được ghi từ các luồng thực tế: VIEW ở chi tiết, CLICK khi mở liên kết sản phẩm, SEARCH sau khi dừng nhập 600 ms, WISHLIST khi thêm yêu thích, ADD_CART khi thêm giỏ thành công. PURCHASE chỉ do server ghi sau khi đơn hoàn tất và đã thanh toán, không nhận từ client. Khóa sự kiện chống trùng; purchase dùng khóa đơn+sản phẩm. Mua ngay không tạo ADD_CART, nhưng vẫn có PURCHASE khi hoàn tất đơn.

Hồ sơ chỉ cá nhân hóa người đã đăng nhập, tổng hợp danh mục/chất liệu/phong cách và khoảng giá. Trọng số hành vi: VIEW/SEARCH=1, CLICK=2, WISHLIST=3, ADD_CART=5, PURCHASE=10. SEARCH trích xuất trực tiếp từ truy vấn kể cả khi không gắn sản phẩm. Các lượt khách chưa đăng nhập không tự nhập vào hồ sơ tài khoản sau đăng nhập.

## API và kiểm thử

- `POST /api/assistant` (hoặc `/api/advisor` có đăng nhập): `{ message, conversationId?, weights? }`. `weights: null` khôi phục tự động. Trả `conversationId`, `intent`, `missingCriteria`, `optionalCriteria`, `answer`, `products`, `diamonds`.
- `GET /api/customers?search=&page=`, `GET /api/customers/:id`, `PATCH /api/customers/:id` (name/phone): quyền admin/manager.
- `POST /api/diamonds/rank`: `{ budgetMax, targetCarat, weights, limit }`; `GET /api/diamonds/:id`: chi tiết kim cương.
- `POST /api/behaviors`: VIEW/CLICK/SEARCH/WISHLIST/ADD_CART, `eventId` UUID tùy chọn; PURCHASE không được phép gửi từ client.

Chạy `npm run build`, `npm run test:decision-support`, `npm test`. Bộ test mới dùng MongoDB tạm, kiểm thử API, phân quyền, phiên nhiều lượt, 4Cs, thay trọng số, hành vi, Gemini mô phỏng và Chrome desktop/mobile. Không đọc `.env` hay ghi vào Atlas. `test_cases.csv` cần dữ liệu truy vấn/ground truth thật trước khi công bố độ chính xác, Precision/Recall/Hit Rate.
