import "dotenv/config";
import mongoose from "mongoose";
import dns from "node:dns";
import app from "./app.js";

const port = Number(process.env.PORT || 5000);
const uri = process.env.MONGO_URI || "";
const dnsServers = process.env.MONGO_DNS_SERVERS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers?.length) dns.promises.setServers(dnsServers);
const hasRealMongo =
  uri.startsWith("mongodb") &&
  !uri.includes("CLUSTER.mongodb.net") &&
  !uri.includes("<");
const server = app.listen(port, "0.0.0.0");
server.on("listening", () => {
  console.log(`MIRA API :${port}`);
  if (!hasRealMongo)
    console.error(
      "Chưa cấu hình MONGO_URI hợp lệ. Không có dữ liệu mẫu thay thế.",
    );
});
server.on("error", (error) => {
  console.error("Không thể khởi động API:", error.message);
  process.exitCode = 1;
});
async function connectDatabase() {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch {
    console.error("Chưa kết nối được MongoDB. Sẽ thử lại sau 5 giây.");
    const retry = setTimeout(() => {
      if (server.listening) void connectDatabase();
    }, 5000);
    retry.unref();
  }
}
if (hasRealMongo) void connectDatabase();
