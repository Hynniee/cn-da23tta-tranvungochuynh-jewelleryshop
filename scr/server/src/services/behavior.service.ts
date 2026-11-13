import Behavior from "../models/Behavior.js";
import { rebuildPreference } from "./preference.service.js";
export async function recordPurchase(order: any) {
  if (
    !order.user ||
    order.status !== "completed" ||
    order.paymentStatus !== "PAID"
  )
    return;
  for (const product of new Set(
    order.items.map((item: any) => String(item.product)),
  )) {
    const eventKey = `purchase:${order._id}:${product}`;
    await Behavior.updateOne(
      { eventKey },
      {
        $setOnInsert: {
          eventKey,
          user: order.user,
          product,
          type: "PURCHASE",
          metadata: { orderId: String(order._id) },
        },
      },
      { upsert: true, runValidators: true },
    );
  }
  await rebuildPreference(String(order.user));
}
