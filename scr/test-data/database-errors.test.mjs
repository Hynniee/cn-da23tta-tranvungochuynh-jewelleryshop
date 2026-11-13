import assert from "node:assert/strict";
import { once } from "node:events";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "isolated-database-error-test-32-characters";
const { default: app } = await import("../server/dist/app.js");
const { default: Product } = await import("../server/dist/models/Product.js");
const originalCreate = Product.create;
const originalDb = mongoose.connection.db;
const stateDescriptor = Object.getOwnPropertyDescriptor(
  mongoose.connection,
  "readyState",
);
Object.defineProperty(mongoose.connection, "readyState", {
  configurable: true,
  value: 1,
});
let primaryAccessible = true;
mongoose.connection.db = {
  admin: () => ({
    command: async () => {
      if (!primaryAccessible)
        throw Object.assign(new Error("simulated unreachable primary"), {
          name: "MongoServerSelectionError",
        });
      return { ok: 1 };
    },
  }),
};
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const token = jwt.sign(
  { id: "000000000000000000000001", role: "admin" },
  process.env.JWT_SECRET,
);
const post = (path) =>
  fetch(`http://127.0.0.1:${server.address().port}/api/products${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Failure fixture" }),
  });
try {
  // Inject failure after a successful primary check: connectivity can change
  // between preflight and insert. No real database is touched.
  for (const name of [
    "MongoServerSelectionError",
    "MongoNetworkError",
    "MongoOperationTimeoutError",
  ]) {
    Product.create = async () => {
      throw Object.assign(new Error("internal connection detail"), { name });
    };
    const response = await post("");
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.code, "DATABASE_UNAVAILABLE");
    assert.match(body.message, /MongoDB Atlas/);
    assert.ok(!JSON.stringify(body).includes("internal connection detail"));
  }
  let attemptedWrite = false;
  primaryAccessible = false;
  Product.create = async () => {
    attemptedWrite = true;
  };
  const response = await post("");
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "DATABASE_READ_ONLY");
  assert.equal(attemptedWrite, false);
  console.log(
    "PASS primary preflight prevents inserts and network failures during insert return useful 503 responses without internal details",
  );
} finally {
  Product.create = originalCreate;
  mongoose.connection.db = originalDb;
  if (stateDescriptor)
    Object.defineProperty(mongoose.connection, "readyState", stateDescriptor);
  else delete mongoose.connection.readyState;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
