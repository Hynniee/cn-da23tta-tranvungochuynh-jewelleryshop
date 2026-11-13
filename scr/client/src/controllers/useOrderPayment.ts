import { useEffect, useState } from "react";
import type { CustomerOrder } from "../components/OrderDetailsDialog";
import { request } from "../lib/api";
import { notify } from "../lib/notifications";
export type PaymentUpdate = { status: string; paymentStatus: string };

export default function useOrderPayment(
  order: CustomerOrder | null,
  onUpdate: (id: string, update: PaymentUpdate) => void,
) {
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const waiting =
    order?.paymentMethod === "BANK_QR" &&
    order.status === "pending_payment" &&
    ["PENDING", "UNPAID", undefined].includes(order.paymentStatus);
  const id = order?._id;
  useEffect(() => {
    setError("");
    if (!waiting || !id) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function syncPayment() {
      try {
        const result: PaymentUpdate = await request(
          `/payments/order/${encodeURIComponent(id!)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setError("");
        onUpdate(id!, result);
        if (result.paymentStatus === "PAID")
          notify("Đã xác nhận thanh toán đơn hàng.");
        else if (
          result.status === "pending_payment" &&
          ["PENDING", "UNPAID"].includes(result.paymentStatus)
        )
          timer = setTimeout(() => void syncPayment(), 5000);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Chưa cập nhật được trạng thái thanh toán.",
          );
      }
    }
    void syncPayment();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, waiting, revision, onUpdate]);
  return { waiting, error, retry: () => setRevision((v) => v + 1) };
}
