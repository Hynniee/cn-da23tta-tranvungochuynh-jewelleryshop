# Dữ liệu demo và tái lập kết quả

Mọi lệnh dưới đây chạy từ thư mục gốc repository. Dữ liệu được giữ tại nguồn để chương trình và bộ kiểm thử dùng cùng một phiên bản.

| Thành phần | Tập tin | Cách sử dụng |
| --- | --- | --- |
| 36 sản phẩm mẫu | [catalog.json](../../scr/server/src/data/catalog.json) | Client/server cùng đọc qua module dữ liệu demo |
| Cấu hình cửa hàng | [storeConfig.json](../../scr/server/src/data/storeConfig.json) | Phí vận chuyển, danh mục, trạng thái đơn |
| Kim cương demo | [demoDiamonds.ts](../../scr/server/src/data/demoDiamonds.ts) | API danh sách và DSS ở chế độ demo |
| Ảnh sản phẩm | [public/products](../../scr/client/public/products/) | Tài nguyên minh họa phục vụ demo |
| 1.000 tương tác mô phỏng | [interactions_demo.csv](../../scr/ml/interactions_demo.csv) | Pipeline ML; không phải dữ liệu khách hàng thật |
| Ca đánh giá thực nghiệm | [test_cases.csv](../../scr/test-data/test_cases.csv) | Hiện chỉ có header, cần ghi kết quả thực tế |
| Fixture API/UI | [test.mjs](../../scr/test-data/test.mjs) | Tự tạo database tạm, tài khoản và đơn hàng kiểm thử |

## Chạy thử cho Hội đồng

```bash
npm ci
npm run dev:full
```

Lệnh tự bổ sung catalog vào MongoDB local, in URL website/API vào terminal. Đăng ký tài khoản mới để thử mua hàng COD. Dữ liệu được giữ tại `.local-data/`; không có tài khoản khách hàng thật kèm repository. Để bổ sung catalog vào MongoDB đã cấu hình, dùng `npm run catalog:import`.

## Tái lập kiểm thử chức năng

```bash
npm run build
npm run test:cart
npm test
```

Kiểm thử giỏ hàng gồm 3 ca. Bộ API/MongoDB/trình duyệt đã chạy thành công 84 kiểm tra trong đợt kiểm chứng ngày 21/10/2026; xem [báo cáo](../../progress-report/validation-2026-10-21.md). Bộ kiểm thử tạo fixture trong MongoDB tạm và tự dọn khi kết thúc; không dùng database trong `.env`. Xem [điều kiện chạy](../README.md) về Chrome/Edge, cổng và tải MongoDB.

Kết quả mỗi lần chạy được ghi vào `scr/test-data/results/`, gồm `summary.json` và ảnh chụp giao diện. Thư mục này không đưa vào Git; lưu bản kết quả được sử dụng trong báo cáo cùng phiên bản mã nguồn khi nộp.

## Tái lập pipeline ML

Từ thư mục `scr/ml`:

```bash
python generate_demo.py
python train.py --data interactions_demo.csv
python evaluate_demo.py
```

Xem [hướng dẫn ML](../../scr/ml/README.md) để hiểu cách chia dữ liệu và ý nghĩa số đo. Các số đo trên dữ liệu mô phỏng chỉ kiểm tra pipeline, chưa thay thế đánh giá thực nghiệm của đồ án.

## Thành phần cài riêng

Node.js, Docker Desktop, Chrome/Edge và Python được cài theo [soft/README.md](../../soft/README.md). MongoDB binary cho chế độ local/test được tải lần đầu qua `mongodb-memory-server`; máy chạy cần Internet hoặc binary đã có trong cache. Gemini và MongoDB Atlas là dịch vụ tùy chọn cần tài khoản/cấu hình riêng, không đóng gói API key. Sơ đồ và các phương án triển khai nằm trong [deployment-guide.md](../deployment-guide.md).
