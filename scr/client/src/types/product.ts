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
  promotion?: { id: string; name: string; type: string; endsAt: string };
  images: string[];
  stock: number;
  featured?: boolean;
  rating?: number;
};
