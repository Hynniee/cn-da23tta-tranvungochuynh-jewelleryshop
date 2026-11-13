import Payment from "../models/Payment.js";
// Keep the original bank mismatch for audit after an administrator verifies payment.
export async function unresolvedPaymentMismatches() {
  const [result] = await Payment.aggregate([
    { $match: { status: "MISMATCH" } },
    {
      $lookup: {
        from: "orders",
        localField: "order",
        foreignField: "_id",
        as: "linkedOrder",
      },
    },
    { $match: { "linkedOrder.paymentStatus": { $ne: "PAID" } } },
    { $count: "count" },
  ]);
  return Number(result?.count || 0);
}
