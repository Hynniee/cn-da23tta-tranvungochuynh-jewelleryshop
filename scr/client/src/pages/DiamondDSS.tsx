import { FormEvent, useState } from "react";
import { request } from "../lib/api";
export default function DiamondDSS() {
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
            weights: { carat: 0.4, cut: 0.3, color: 0.2, clarity: 0.1 },
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
        <p>Weighted Scoring: Carat 40% · Cut 30% · Color 20% · Clarity 10%.</p>
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
        <button disabled={busy}>
          {busy ? "ĐANG XẾP HẠNG..." : "XẾP HẠNG"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {done && !rows.length && <p>Không có kim cương trong ngân sách này.</p>}
      <div className="diamond-table">
        {rows.map((d: any) => (
          <article key={d._id}>
            <b>{d.code}</b>
            <span>{d.carat} ct</span>
            <span>Cut: {d.cut}</span>
            <span>Color: {d.color}</span>
            <span>Clarity: {d.clarity}</span>
            <span>{Number(d.price).toLocaleString("vi-VN")}₫</span>
            <strong>{d.score}%</strong>
          </article>
        ))}
      </div>
    </main>
  );
}
