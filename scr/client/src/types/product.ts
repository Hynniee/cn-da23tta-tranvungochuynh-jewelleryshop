export type Product = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  material: string;
  stone?: string;
  collection?: string;
  style?: string;
  occasion?: string[];
  price: number;
  salePrice?: number;
  images: string[];
  stock: number;
  featured?: boolean;
  rating?: number;
};
