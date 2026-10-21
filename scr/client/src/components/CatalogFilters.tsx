import { SlidersHorizontal } from "lucide-react";
import { MAX_BUDGET } from "../lib/catalogFilters";

type Props = {
  categories: string[];
  materials: string[];
  stones: string[];
  params: URLSearchParams;
  maxPrice: number;
  change: (key: string, value: string) => void;
  toggle: (key: string, value: string) => void;
  reset: () => void;
};
export default function CatalogFilters({
  categories,
  materials,
  stones,
  params,
  maxPrice,
  change,
  toggle,
  reset,
}: Props) {
  return (
    <>
      <div className="filter-head">
        <b>
          <SlidersHorizontal size={15} /> BỘ LỌC
        </b>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <Filter
        title="DANH MỤC"
        values={categories.map((value) => ({ value, label: value }))}
        selected={params.getAll("category")}
        onToggle={(value) =>
          change("category", params.get("category") === value ? "" : value)
        }
      />
      <Filter
        title="CHẤT LIỆU KIM LOẠI"
        values={materials.map((value) => ({ value, label: value }))}
        selected={params.getAll("material")}
        onToggle={(value) => toggle("material", value)}
      />
      <Filter
        title="LOẠI ĐÁ / ĐIỂM NHẤN"
        values={stones.map((value) => ({ value, label: value }))}
        selected={params.getAll("stone")}
        onToggle={(value) =>
          change("stone", params.get("stone") === value ? "" : value)
        }
      />
      <div className="filter-block">
        <b>
          <label htmlFor="budget-max">NGÂN SÁCH TỐI ĐA</label>
        </b>
        <input
          id="budget-max"
          aria-label="Ngân sách tối đa"
          type="range"
          min="0"
          max={MAX_BUDGET}
          step="100000"
          value={maxPrice}
          onChange={(e) => change("maxPrice", e.target.value)}
        />
        <p>{maxPrice.toLocaleString("vi-VN")}₫</p>
      </div>
    </>
  );
}
function Filter({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="filter-block">
      <b>{title}</b>
      {values.map(({ value, label }) => (
        <label key={value}>
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => onToggle(value)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}
