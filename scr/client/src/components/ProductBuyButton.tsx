import { ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { addCart } from "../store/cart";
import { notify } from "../lib/notifications";

type BuyProduct = {
  _id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  images?: string[];
  sizes?: string[];
  material?: string;
  stone?: string;
  stock: number;
  engravingAllowed?: boolean;
};

export default function ProductBuyButton({ product }: { product: BuyProduct }) {
  const navigate = useNavigate();
  if (product.stock <= 0)
    return (
      <button className="product-buy-button" disabled>
        Tạm hết hàng
      </button>
    );
  if ((product.sizes?.length || 0) > 1 || product.engravingAllowed)
    return (
      <Link
        className="product-buy-button"
        to={`/product/${product.slug}#purchase`}
        aria-label={`Mua ngay ${product.name}`}
      >
        Mua ngay <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    );
  function buy() {
    if (
      !addCart({
        _id: product._id,
        slug: product.slug,
        name: product.name,
        price: product.salePrice ?? product.price,
        image: product.images?.[0] || "/placeholder.svg",
        size: product.sizes?.[0] || "Tiêu chuẩn",
        quantity: 1,
        material: product.material,
        stone: product.stone,
        stock: product.stock,
      })
    ) {
      notify("Số lượng trong giỏ đã đạt tồn kho hiện tại.", "info");
      return;
    }
    notify("Đã thêm sản phẩm vào giỏ hàng.");
    navigate("/checkout");
  }
  return (
    <button
      className="product-buy-button"
      type="button"
      onClick={buy}
      aria-label={`Mua ngay ${product.name}`}
    >
      Mua ngay <ArrowUpRight size={16} aria-hidden="true" />
    </button>
  );
}
