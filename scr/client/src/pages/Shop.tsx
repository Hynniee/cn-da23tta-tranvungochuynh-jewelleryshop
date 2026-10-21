import CatalogFilters from "../components/CatalogFilters";
import { MAX_BUDGET } from "../lib/catalogFilters";
import Image from "../components/Image";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, Search, SlidersHorizontal } from "lucide-react";
import { request } from "../lib/api";
import { demoProducts } from "../data/demoProducts";
import { categories, normalizeSearch } from "../lib/commerce";
import { getWishlist, toggleWishlist } from "../store/wishlist";

type Product = (typeof demoProducts)[number];
const PAGE_SIZE = 8;
const price = (p: Product) => Number(p.salePrice ?? p.price);

export default function Shop({
  allProducts = false,
}: {
  allProducts?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(
    () => window.matchMedia("(min-width: 761px)").matches,
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [wishlist, setWishlist] = useState(getWishlist);
  const category = params.get("category") || "";
  const selectedMaterials = params.getAll("material");
  const stone = params.get("stone") || "";
  const collection = params.get("collection") || "";
  const collectionLabels: Record<string, string> = {
    bac: "Trang Sức Bạc",
    vang: "Trang Sức Vàng",
    "ngoc-trai": "Trang Sức Ngọc Trai",
    "da-mau": "Trang Sức Đá Màu",
  };
  const materials = useMemo(
    () =>
      [...new Set(products.map((p) => p.material))].sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [products],
  );
  const stones = useMemo(
    () =>
      [...new Set(products.map((p) => p.stone || "Không đính đá"))].sort(
        (a, b) => a.localeCompare(b, "vi"),
      ),
    [products],
  );
  const search = params.get("search") || "";
  const sort = params.get("sort") || "featured";
  const readPrice = (key: string, fallback: number) => {
    const value = Number(params.get(key) ?? fallback);
    return Number.isFinite(value)
      ? Math.max(0, Math.min(MAX_BUDGET, value))
      : fallback;
  };
  const maxPrice = readPrice("maxPrice", MAX_BUDGET);
  const page = Math.max(1, Number(params.get("page")) || 1);

  useEffect(() => {
    let active = true;
    request("/products")
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch(() => {
        if (active) {
          setProducts(demoProducts);
          setNotice("API chưa sẵn sàng. Đang hiển thị bộ sưu tập demo.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const update = () => setWishlist(getWishlist());
    window.addEventListener("wishlistchange", update);
    return () => {
      active = false;
      window.removeEventListener("wishlistchange", update);
    };
  }, []);

  function change(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  }
  function toggle(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      const values = next.getAll(key);
      next.delete(key);
      (values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
      ).forEach((item) => next.append(key, item));
      next.delete("page");
      return next;
    });
  }
  const filtered = useMemo(() => {
    const result = products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!selectedMaterials.length || selectedMaterials.includes(p.material)) &&
        (!stone || (p.stone || "Không đính đá") === stone) &&
        (!collection ||
          (collection === "bac"
            ? p.material === "Bạc 925"
            : collection === "vang"
              ? p.material.startsWith("Vàng")
              : collection === "ngoc-trai"
                ? p.stone === "Ngọc trai"
                : collection === "da-mau"
                  ? !["Không đính đá", "Ngọc trai", "Kim cương"].includes(
                      p.stone || "Không đính đá",
                    )
                  : true)) &&
        price(p) <= maxPrice &&
        normalizeSearch(
          `${p.name} ${p.category} ${p.material} ${p.stone || ""} ${p.description || ""}`,
        ).includes(normalizeSearch(search)),
    );
    return result.sort((a, b) =>
      sort === "price-asc"
        ? price(a) - price(b)
        : sort === "price-desc"
          ? price(b) - price(a)
          : sort === "name"
            ? a.name.localeCompare(b.name, "vi")
            : Number(b.featured) - Number(a.featured) || price(a) - price(b),
    );
  }, [products, category, params.toString(), maxPrice, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.floor(page), pages);
  const shown = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <main className="shop-page">
      <div className="shop-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <b>{allProducts ? "Sản phẩm" : "Bộ sưu tập"}</b>
      </div>
      <section className="shop-intro">
        <span>{allProducts ? "ALL MIRA JEWELRY" : "THE MIRA COLLECTION"}</span>
        <h1>
          {allProducts
            ? "Tất Cả Sản Phẩm"
            : category ||
              collectionLabels[collection] ||
              "Bộ Sưu Tập Trang Sức MIRA"}
        </h1>
        <p>
          {allProducts
            ? "Khám phá toàn bộ nhẫn, dây chuyền, bông tai, vòng tay, lắc chân, charm và bộ trang sức MIRA."
            : "Chọn thiết kế theo danh mục, chất liệu và ngân sách của bạn."}
        </p>
        <div>
          <b>{filtered.length}</b>
          <small>TÁC PHẨM</small>
        </div>
      </section>
      {allProducts && (
        <nav className="product-categories" aria-label="Danh mục sản phẩm">
          <button
            className={!category ? "active" : ""}
            aria-pressed={!category}
            onClick={() => change("category", "")}
          >
            Tất cả sản phẩm
          </button>
          {categories.map((value) => (
            <button
              key={value}
              className={category === value ? "active" : ""}
              aria-pressed={category === value}
              onClick={() =>
                change("category", category === value ? "" : value)
              }
            >
              {value}
            </button>
          ))}
        </nav>
      )}
      <button
        className="mobile-filter-toggle"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((current) => !current)}
      >
        <SlidersHorizontal size={16} />
        {filtersOpen ? "Đóng bộ lọc" : "Lọc sản phẩm"}
      </button>
      <section className="catalog">
        <aside className={`filters ${filtersOpen ? "is-open" : ""}`}>
          <CatalogFilters
            categories={categories}
            stones={stones}
            materials={materials}
            params={params}
            maxPrice={maxPrice}
            change={change}
            toggle={toggle}
            reset={() => setParams({})}
          />
        </aside>
        <div className="catalog-main">
          <div className="catalog-search">
            <Search size={15} />
            <input
              id="catalog-search"
              aria-label="Tìm sản phẩm"
              value={search}
              onChange={(e) => change("search", e.target.value)}
              placeholder="Tìm tên trang sức, chất liệu..."
            />
          </div>
          {(category ||
            selectedMaterials.length > 0 ||
            maxPrice < MAX_BUDGET ||
            stone ||
            search ||
            collection) && (
            <div className="active-filters">
              <span>
                Đang lọc:{" "}
                {[
                  category,
                  ...selectedMaterials,
                  ...(maxPrice < MAX_BUDGET
                    ? [`Tối đa ${maxPrice.toLocaleString("vi-VN")}₫`]
                    : []),
                  stone,
                  search,
                  collectionLabels[collection],
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <button onClick={() => setParams({})}>Xóa bộ lọc</button>
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
          <div className="catalog-toolbar">
            <div>
              <b>{shown.length}</b> / {filtered.length} tác phẩm
            </div>
            <label>
              SẮP XẾP:{" "}
              <select
                aria-label="Sắp xếp"
                value={sort}
                onChange={(e) => change("sort", e.target.value)}
              >
                <option value="featured">Nổi bật</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="name">Tên A–Z</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p role="status">Đang tải bộ sưu tập...</p>
          ) : !shown.length ? (
            <section className="lux-empty">
              <h2>Không có sản phẩm phù hợp</h2>
              <button onClick={() => setParams({})}>Đặt lại bộ lọc</button>
            </section>
          ) : (
            <div className="shop-grid">
              {shown.map((p) => (
                <article className="shop-card" key={p._id}>
                  <div className="shop-photo">
                    <Link to={`/product/${p.slug}`}>
                      <Image
                        src={p.images?.[0] || "/placeholder.svg"}
                        alt={p.name}
                        loading="lazy"
                      />
                    </Link>
                    {p.featured && <span>MIRA SELECTION</span>}
                    <button
                      aria-label={`Yêu thích ${p.name}`}
                      aria-pressed={wishlist.includes(p._id)}
                      onClick={() => toggleWishlist(p._id)}
                    >
                      <Heart
                        size={17}
                        fill={
                          wishlist.includes(p._id) ? "currentColor" : "none"
                        }
                      />
                    </button>
                  </div>
                  <small>
                    {p.category} · {p.material} · {p.stone || "Không đính đá"}
                  </small>
                  <Link to={`/product/${p.slug}`}>
                    <h3>{p.name}</h3>
                  </Link>
                  <div className="card-bottom">
                    <strong>{price(p).toLocaleString("vi-VN")}₫</strong>
                    <Link to={`/product/${p.slug}`}>Xem chi tiết →</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Phân trang">
              <button
                disabled={currentPage === 1}
                onClick={() => change("page", String(currentPage - 1))}
              >
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  className={currentPage === i + 1 ? "active" : ""}
                  onClick={() => change("page", String(i + 1))}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === pages}
                onClick={() => change("page", String(currentPage + 1))}
              >
                ›
              </button>
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
