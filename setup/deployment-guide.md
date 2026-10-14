# Sơ đồ triển khai
Browser → Nginx (web, port 8080) → React SPA
Browser → Express API (server, port 5000) → MongoDB Atlas (tùy chọn)
Express API → Google Gemini API (tùy chọn)

Chạy: `docker compose -f docker/docker-compose.yml up --build -d`.
Dừng: `docker compose -f docker/docker-compose.yml down`.
