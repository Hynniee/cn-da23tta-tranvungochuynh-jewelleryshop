import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../server/src/app.js";
import { jwtSecret } from "../server/src/config.js";
import {
  productForm,
  productChanges,
} from "../client/src/lib/product-editor.js";

test("editing only stock preserves imported catalog fields and all images", () => {
  const initial = productForm({
    name: "Imported pendant",
    slug: "legacy-id",
    category: "Mặt dây chuyền",
    material: "Vàng 14K",
    price: 1000000,
    stock: 0,
    images: ["/a.jpg", "/b.jpg"],
    stone: "Đá CZ",
  });
  assert.deepEqual(productChanges({ ...initial, stock: "7" }, initial), {
    stock: 7,
  });
  assert.deepEqual(productChanges(initial, initial), {});
  for (const stock of ["", "-1", "1.5", "NaN"])
    assert.throws(() => productChanges({ ...initial, stock }, initial));
});

test(
  "stock update works on legacy MongoDB documents and validates stock and permissions",
  { timeout: 60000 },
  async () => {
    const mongo = await MongoMemoryServer.create();
    let server;
    try {
      await mongoose.connect(mongo.getUri());
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}/api`;
      const actor = new mongoose.Types.ObjectId().toString();
      const admin = jwt.sign({ id: actor, role: "admin" }, jwtSecret),
        customer = jwt.sign({ id: actor, role: "customer" }, jwtSecret);
      const original = {
        name: "Imported pendant",
        category: "Mặt dây chuyền",
        metals: ["Vàng 14K"],
        gemstone: "Đá CZ",
        price: 1000000,
        stock: 0,
        images: ["/a.jpg", "/b.jpg"],
        sku: "PRESERVE-SKU",
      };
      const collection = mongoose.connection.db!.collection("products");
      const { insertedId } = await collection.insertOne({ ...original });
      const send = async (body: unknown, token = admin) =>
        fetch(`${base}/products/${insertedId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      const catalog = await (await fetch(`${base}/products`)).json();
      const initial = productForm(catalog[0]);
      let response = await send(
        productChanges({ ...initial, stock: "7" }, initial),
      );
      assert.equal(response.status, 200);
      const updated = await response.json();
      assert.equal(updated.stock, 7);
      assert.equal(updated.material, "Vàng 14K");
      const raw = await collection.findOne({ _id: insertedId });
      assert.equal(raw!.stock, 7);
      assert.deepEqual(raw!.images, original.images);
      assert.equal(raw!.slug, undefined);
      assert.equal(raw!.material, undefined);
      assert.equal(raw!.sku, original.sku);
      for (const stock of [-1, 1.5]) {
        response = await send({ stock });
        assert.equal(response.status, 400);
        await response.json();
      }
      assert.equal((await collection.findOne({ _id: insertedId }))!.stock, 7);
      response = await send({ stock: 2 }, customer);
      assert.equal(response.status, 403);
      await response.json();
      response = await send({
        category: "Nhẫn cưới",
        sizes: ["12", "14"],
        sizeStocks: [
          { size: "12", stock: 4 },
          { size: "14", stock: 3 },
        ],
      });
      assert.equal(response.status, 200);
      await response.json();
      response = await send({
        sizeStocks: [
          { size: "12", stock: 0 },
          { size: "14", stock: 0 },
        ],
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).stock, 0);
    } finally {
      if (server) {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
