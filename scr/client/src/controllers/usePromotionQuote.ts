import { useEffect, useState } from "react";
import { request } from "../lib/api";
import type { CartItem } from "../store/cart";
export type PromotionQuote = {
  subtotal: number;
  shippingFee: number;
  total: number;
  discountTotal: number;
  voucher: { code: string; name: string; discount: number } | null;
  items: {
    product: string;
    size: string;
    price: number;
    quantity: number;
    promotion?: { name: string; type: string };
  }[];
};
const readCode = () => {
  try {
    return sessionStorage.getItem("mira_voucher") || "";
  } catch {
    return "";
  }
};
export default function usePromotionQuote(cart: CartItem[], enabled = true) {
  const [code, setCode] = useState(readCode);
  const [appliedCode, setAppliedCode] = useState(readCode);
  const [quote, setQuote] = useState<PromotionQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const items = JSON.stringify(
    cart.map((item) => ({
      product: item._id,
      quantity: item.quantity,
      size: item.size,
      engraving: item.engraving,
    })),
  );
  useEffect(() => {
    if (!enabled || !cart.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setQuote(null);
    request("/promotions/quote", {
      method: "POST",
      body: JSON.stringify({
        items: JSON.parse(items),
        voucherCode: appliedCode,
      }),
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setQuote(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Không tính được ưu đãi.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [items, appliedCode, revision, enabled]);
  function apply(next = code) {
    const value = next.trim().toUpperCase();
    setCode(value);
    setAppliedCode(value);
    setRevision((v) => v + 1);
    try {
      if (value) sessionStorage.setItem("mira_voucher", value);
      else sessionStorage.removeItem("mira_voucher");
    } catch {
      /* Optional session persistence. */
    }
  }
  return {
    code,
    setCode,
    quote,
    loading,
    error,
    apply,
    remove: () => apply(""),
    refresh: () => setRevision((value) => value + 1),
  };
}
