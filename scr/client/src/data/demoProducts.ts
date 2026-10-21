import catalog from "../../../server/src/data/catalog.json";
export type CatalogProduct = (typeof catalog)[number] & {
  shape?: string;
  carat?: number;
  ringStyle?: string;
};
export type Product = CatalogProduct & {
  _id: string;
  images: string[];
  salePrice?: number;
};
export const demoProducts: Product[] = catalog.map((p, i) => ({
  ...p,
  _id: `demo-${i + 1}`,
  images: [p.image],
}));
