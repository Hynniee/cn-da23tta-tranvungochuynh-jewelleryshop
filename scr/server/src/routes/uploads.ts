import express, { Router } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { auth, admin } from "../middleware/auth.js";

export const productUploadDirectory =
  process.env.PRODUCT_UPLOAD_DIR ||
  fileURLToPath(new URL("../../uploads/products/", import.meta.url));
const router = Router();
router.post(
  "/products",
  auth,
  admin,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "5mb",
  }),
  async (req, res) => {
    const buffer = req.body;
    if (!Buffer.isBuffer(buffer) || !buffer.length) {
      return res.status(400).json({
        message: "Vui lòng chọn ảnh JPG, PNG hoặc WebP (tối đa 5 MB)",
      });
    }
    const mime = req.get("Content-Type")?.split(";")[0].trim();
    const valid =
      mime === "image/jpeg"
        ? buffer.length >= 3 &&
          buffer[0] === 0xff &&
          buffer[1] === 0xd8 &&
          buffer[2] === 0xff
        : mime === "image/png"
          ? buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : mime === "image/webp" &&
            buffer.length >= 12 &&
            buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
    if (!valid)
      return res
        .status(400)
        .json({ message: "Nội dung tệp không đúng định dạng ảnh đã chọn" });
    const extension =
      mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(productUploadDirectory, { recursive: true });
    await writeFile(path.join(productUploadDirectory, filename), buffer, {
      flag: "wx",
    });
    res.status(201).json({ url: `/api/uploads/products/${filename}` });
  },
);
export default router;
