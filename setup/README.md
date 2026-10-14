# Cài đặt MIRA Jewelry
Yêu cầu: Docker Desktop có Docker Compose hoặc Node.js 20+.

## Chạy demo không cần MongoDB
Từ thư mục gốc:
```bash
docker compose -f docker/docker-compose.yml up --build -d
```
Frontend: http://localhost:8080
Backend: http://localhost:5000/api/products

## Chạy local
```bash
cd scr/server
npm install
npm run dev
```
Terminal khác:
```bash
cd scr/client
npm install
npm run dev
```

## Kết nối MongoDB/Gemini
Copy `scr/server/.env.example` thành `scr/server/.env`, điền MONGO_URI, JWT_SECRET, GEMINI_API_KEY (nếu có).
Không commit .env lên GitHub. Không cần MongoDB để xem danh mục demo.
