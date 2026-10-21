import config from "../../../server/src/data/storeConfig.json";
export const categories = config.categories;
export const shippingFee = (subtotal: number) =>
  subtotal <= 0 || subtotal >= config.freeShippingFrom ? 0 : config.shippingFee;
export const freeShippingFrom = config.freeShippingFrom;
export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

export const orderLabels: Record<string, string> = config.orderLabels;
export const orderTransitions: Record<string, string[]> =
  config.orderTransitions;
