import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT || 5000);
const uri = process.env.MONGO_URI || "";
const hasRealMongo =
  uri.startsWith("mongodb") &&
  !uri.includes("CLUSTER.mongodb.net") &&
  !uri.includes("<");
const server = app.listen(port, "0.0.0.0");
server.on("listening", () => {
  console.log(`MIRA API :${port}`);
  if (!hasRealMongo)
    console.log("DEMO MODE: danh mục trang sức có sẵn, chưa cần MongoDB");
});
server.on("error", (error) => {
  console.error("Không thể khởi động API:", error.message);
  process.exitCode = 1;
});
if (hasRealMongo)
  mongoose
    .connect(uri)
    .then(() => console.log("MongoDB Atlas connected"))
    .catch((e) =>
      console.error("MongoDB lỗi - tiếp tục DEMO MODE:", e.message),
    );
