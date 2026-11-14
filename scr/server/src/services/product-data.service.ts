import mongoose from "mongoose";
import { productSizes } from "./product-sizes.js";

// Adapt existing catalog documents without rewriting the database.
export function catalogProduct(product: any) {
  return {
    ...product,
    slug: product.slug || String(product._id),
    material:
      product.material ||
      (Array.isArray(product.metals) ? product.metals.join(" / ") : ""),
    stone: product.stone || product.gemstone || "Không đính đá",
    images: product.images?.length
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [],
    sizes: productSizes(product),
  };
}

export function productLookup(slug: string) {
  return mongoose.isValidObjectId(slug)
    ? { $or: [{ _id: slug }, { slug }] }
    : { slug };
}
