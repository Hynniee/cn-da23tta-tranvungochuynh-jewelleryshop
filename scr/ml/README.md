# Machine Learning cho MIRA Jewelry

Mô hình **Logistic Regression tự huấn luyện bằng Python chuẩn** (không cần thư viện ngoài). Đầu vào: 5 đặc trưng trong khoảng 0–1 và nhãn `label` (1 = có tương tác tích cực; 0 = không tương tác). Dữ liệu phải có **cả mẫu dương và âm**, ưu tiên log thực tế và cách lấy mẫu âm có giải thích.

## Huấn luyện

Tạo `scr/ml/interactions.csv` với header:

```csv
categoryMatch,materialMatch,styleMatch,priceFit,rating,label
```

Từ `scr/ml` chạy:

```bash
python train.py --data interactions.csv
```

Kết quả `scr/server/src/ml/model.json` được Express đọc để suy luận. Chưa có mô hình thì hệ thống **chỉ dùng DSS**, không giả vờ có ML.

## API

- `GET /api/recommendations/ml-status`: trạng thái mô hình
- `GET /api/recommendations/demo?category=Nhẫn&budgetMax=30000000&limit=3`: xem Top 3 demo (không cần MongoDB)
- `GET /api/recommendations`: cá nhân hóa người đăng nhập, cần MongoDB để lưu lịch sử

Điểm kết hợp = 0.6 × DSS + 0.4 × ML (khi có model). Hệ số là mặc định, chưa được tối ưu thực nghiệm. Dữ liệu thật cần chia theo thời gian hoặc người dùng để tránh rò rỉ và đánh giá Precision@K/Recall@K so với baseline DSS.

## Bộ dữ liệu demo đã huấn luyện

- `generate_demo.py`: tạo lại 1.000 dòng **mô phỏng**, seed cố định.
- `interactions_demo.csv`: dữ liệu đầu vào demo, không phải log khách hàng thật.
- `../server/src/ml/model.json`: mô hình đã huấn luyện trên 800 mẫu demo.
- `evaluate_demo.py`: đánh giá 200 mẫu kiểm tra và ghi `demo_metrics.json`.

Chạy lại từ thư mục `scr/ml`:

```bash
python generate_demo.py
python train.py --data interactions_demo.csv
python evaluate_demo.py
```

Không cần cài thư viện Python ngoài. Kết quả demo chỉ xác nhận pipeline hoạt động; chưa chứng minh ML tốt hơn DSS trên dữ liệu thực. Để đánh giá Precision@3, cần log người dùng–sản phẩm, nhóm đề xuất theo từng người dùng và nhãn tương tác thực tế.
