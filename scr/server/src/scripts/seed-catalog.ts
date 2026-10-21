import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Diamond from "../models/Diamond.js";
import { demoProducts } from "../data/demoProducts.js";
import { demoDiamonds } from "../data/demoDiamonds.js";
if (!process.env.MONGO_URI)
  throw new Error("Cần MONGO_URI để bổ sung danh mục");
try {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await Product.bulkWrite(
    demoProducts.map((p) => ({
      updateOne: {
        filter: { slug: p.slug },
        update: { $setOnInsert: { ...p, images: [p.image] } },
        upsert: true,
      },
    })),
  );
  await Diamond.bulkWrite(
    demoDiamonds.map(({ _id, ...d }) => ({
      updateOne: {
        filter: { code: d.code },
        update: { $setOnInsert: d },
        upsert: true,
      },
    })),
  );
  console.log(
    `Danh mục sẵn sàng: ${demoProducts.length} mẫu; thêm ${result.upsertedCount} sản phẩm mới. Sản phẩm và đơn hàng hiện có được giữ lại.`,
  );
} finally {
  await mongoose.disconnect();
}
