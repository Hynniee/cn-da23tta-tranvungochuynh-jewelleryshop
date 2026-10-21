import { useEffect, useState } from "react";
import { request } from "../lib/api";
import { getCart, saveCart, reconcileCart, cartHasStock } from "../store/cart";
import {
  calculateCartTotals,
  canIncreaseQuantity,
  changeQuantity,
} from "../models/cart.model";

export function useCartController() {
  const [cart, setCart] = useState(getCart);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    request("/products")
      .then((products) => {
        if (active) setCart(reconcileCart(products));
      })
      .catch(() => {
        if (active)
          setNotice(
            "Chưa kiểm tra được giá và tồn kho. Vui lòng thử lại trước khi thanh toán.",
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateQuantity = (index: number, quantity: number) => {
    const next = changeQuantity(cart, index, quantity);
    if (next === cart) return;
    saveCart(next);
    setCart(next);
  };

  return {
    cart,
    checking,
    notice,
    inStock: cartHasStock(cart),
    ...calculateCartTotals(cart),
    updateQuantity,
    canIncrease: (index: number) => canIncreaseQuantity(cart, index),
  };
}
