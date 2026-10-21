# Phần mềm hỗ trợ

Không đóng gói bộ cài phần mềm bên thứ ba trong repository. Cài các công cụ phù hợp với phương án chạy:

| Công cụ | Mục đích | Nguồn cài đặt |
| --- | --- | --- |
| Node.js 20+ và npm | Chạy local, build, kiểm thử workspace | https://nodejs.org/ |
| Docker Desktop và Docker Compose | Chạy phương án Docker | https://www.docker.com/products/docker-desktop/ |
| Google Chrome hoặc Microsoft Edge | Bộ kiểm thử giao diện headless | https://www.google.com/chrome/ hoặc https://www.microsoft.com/edge |
| Python 3 | Chạy mã ML và đánh giá mô phỏng, dùng thư viện chuẩn | https://www.python.org/downloads/ |

MongoDB cho `dev:full` và test được công cụ tự tải và khởi động. MongoDB Atlas và Gemini cần tài khoản riêng khi dùng tính năng kết nối dịch vụ. Xem [hướng dẫn cài đặt](../setup/README.md).
