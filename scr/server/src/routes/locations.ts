import { Router } from "express";
import { provinces } from "../services/shipping-address.service.js";
const r = Router();
r.get("/provinces", (_req, res) =>
  res
    .set("Cache-Control", "public, max-age=86400")
    .json(provinces.map(({ code, name }) => ({ code, name }))),
);
r.get("/provinces/:code/wards", (req, res) => {
  const province = provinces.find((p) => p.code === req.params.code);
  if (!province)
    return res.status(404).json({ message: "Không tìm thấy tỉnh/thành." });
  res.set("Cache-Control", "public, max-age=86400").json(province.wards);
});
export default r;
