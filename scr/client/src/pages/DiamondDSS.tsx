import { FormEvent, useState } from "react";
import { request } from "../lib/api";
import DSSWeights from "../components/DSSWeights";
import ProductComparison from "../components/ProductComparison";
import { Link } from "react-router-dom";
export default function DiamondDSS() {
  const [weights, setWeights] = useState<Record<string, number>>({
    carat: 40,
    cut: 30,
    color: 20,
    clarity: 10,
  });
  const [limit, setLimit] = useState(5);
  const [budget, setBudget] = useState("170000000"),
    [carat, setCarat] = useState("1"),
    [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  async function run(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setRows(
        await request("/diamonds/rank", {
          method: "POST",
          body: JSON.stringify({
            budgetMax: +budget,
            targetCarat: +carat,
            weights,
            limit,
          }),
        }),
      );
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xếp hạng");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="smart-page">
      <header>
        <span>DIAMOND DECISION SUPPORT</span>
        <h1>Chọn kim cương theo 4Cs</h1>
        <p>
          Điều chỉnh mức ưu tiên 4Cs và so sánh các lựa chọn trong ngân sách của
          bạn.
        </p>
      </header>
      <form className="dss-form" onSubmit={run}>
        <label>
          Ngân sách tối đa
          <input
            type="number"
            min="1"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <label>
          Carat mong muốn
          <input
            type="number"
            min="0.1"
            required
            step="0.1"
            value={carat}
            onChange={(e) => setCarat(e.target.value)}
          />
        </label>
        <label>
          Số lựa chọn Top-K
          <select
            aria-label="Số lựa chọn Top-K"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            {[3, 5, 10].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <DSSWeights weights={weights} onChange={setWeights} />
        <button
          disabled={busy || !Object.values(weights).some((value) => value > 0)}
        >
          {busy ? "ĐANG XẾP HẠNG..." : "XẾP HẠNG"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {done && !rows.length && <p>Không có kim cương trong ngân sách này.</p>}
      <div className="diamond-table">
        {rows.map((d: any) => (
          <article key={d._id}>
            <Link to={`/diamond/${d._id}`}>
              <b>{d.code}</b>
            </Link>
            <span>{d.carat} ct</span>
            <span>Cut: {d.cut}</span>
            <span>Color: {d.color}</span>
            <span>Clarity: {d.clarity}</span>
            <span>{Number(d.price).toLocaleString("vi-VN")}₫</span>
            <strong>{d.score}%</strong>
            <Link to={`/diamond/${d._id}`}>Xem chi tiết →</Link>
          </article>
        ))}
      </div>
      <ProductComparison products={rows} diamond />
    </main>
  );
}
