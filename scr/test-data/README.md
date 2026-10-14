# Experimental evaluation
Không điền số liệu giả. Chạy các ca kiểm thử thật rồi nhập vào `test_cases.csv`.

- Intent Accuracy: Gemini/parser hiểu đúng ràng buộc người dùng.
- Precision@5: số item liên quan trong top 5 / 5.
- Recall@5: số item liên quan tìm được trong top 5 / tổng item liên quan theo ground truth.
- Hit Rate@5: top 5 có ít nhất một item phù hợp hay không.
- Response Time: ms đo thực tế.

So sánh ít nhất 3 phương pháp: Random, Popular và Personalized DSS. Có thể lưu mỗi phương pháp thành một CSV riêng và chạy `python evaluate.py file.csv`.
