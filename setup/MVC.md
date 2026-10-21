# Kiến trúc MVC

MIRA dùng MVC với Express cung cấp API JSON và React hiển thị giao diện.

```text
React View → HTTP request → Route + Middleware → Controller
                                                   ↓
                                              Model / Service
                                                   ↓
React View ← JSON response ←────────────────────────┘
```

## Backend

- `scr/server/src/models/`: schema Mongoose, ràng buộc và truy cập dữ liệu.
- `scr/server/src/controllers/`: nhận request, kiểm tra đầu vào, gọi Model/Service và trả HTTP response. Có controller cho cả 12 nhóm API.
- `scr/server/src/routes/`: ánh xạ phương thức, URL và middleware tới controller; giữ thứ tự middleware xác thực, phân quyền và kiểm tra database.
- `scr/server/src/services/`: nghiệp vụ dùng chung như gợi ý, DSS kim cương, ML, Gemini và audit.
- `scr/server/src/middleware/`: xác thực, phân quyền và yêu cầu MongoDB.
- `scr/server/src/app.ts`: cấu hình Express, đăng ký route và xử lý lỗi; export ứng dụng mà không mở cổng hay kết nối database.
- `scr/server/src/index.ts`: nạp môi trường, mở cổng và kết nối MongoDB.

Ví dụ: `GET /api/products` → `routes/products.ts` → `controllers/products.controller.ts:listProducts` → `models/Product.ts` hoặc dữ liệu demo → JSON → React.

## Frontend

Các trang trong `scr/client/src/pages/` và component trong `components/` là lớp View của ứng dụng React. Không cần thêm template HTML phía Express vì React đảm nhiệm hiển thị.

Trang giỏ hàng đã tách ba trách nhiệm:

- **Model**: `models/cart.model.ts` tính tiền, quy tắc số lượng và tồn kho dùng chung giữa các biến thể; `store/cart.ts` lưu localStorage và đồng bộ danh mục.
- **Controller**: `controllers/useCartController.ts` quản lý state, tải dữ liệu, cập nhật Model và cung cấp hành động cho View. Controller được viết dưới dạng React hook để tuân thủ vòng đời React.
- **View**: `pages/Cart.tsx` hiển thị JSX và chuyển sự kiện người dùng tới Controller.

Các trang React khác vẫn giữ cách tổ chức hiện tại và chưa tách hook controller riêng. Khi mở rộng, đưa phép tính thuần vào Model, tác vụ tải dữ liệu/state vào hook Controller và giữ JSX trong View.

## Thêm chức năng

1. Định nghĩa hoặc mở rộng Model và Service khi có nghiệp vụ dùng chung.
2. Thêm hàm có tên trong controller tương ứng, dùng `RequestHandler` hoặc kiểu request xác thực.
3. Đăng ký hàm trong route cùng middleware cần thiết. Không viết truy vấn database trong route.
4. Tạo View React gọi API; tách controller hook khi trang cần quản lý state và tác vụ.
5. Chạy `npm run build` và `npm test` để kiểm tra API demo, MongoDB tạm và luồng trình duyệt. Chạy `npm run test:cart` để kiểm tra riêng quy tắc số lượng, tồn kho giữa các biến thể và phí vận chuyển.

Việc tách lớp giữ nguyên URL API, định dạng phản hồi, schema dữ liệu và đường dẫn trang hiện có.
