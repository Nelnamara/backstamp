import { useEffect, useMemo, useState } from "react";

function money(value, opts = {}) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.cents ? 2 : 0,
  });
}

export default function Dashboard({ ownerId, franchiseNames, onEnterCurate, onEnterAcquire, onEnterConnect }) {
  const [items, setItems] = useState(null);
  const [historyByItem, setHistoryByItem] = useState({});

  useEffect(() => {
    fetch(`/items?owner_id=${ownerId}&limit=500`)
      .then((r) => r.json())
      .then((itemRows) => {
        setItems(itemRows);
        Promise.all(
          itemRows.map((item) =>
            fetch(`/items/${item.id}/value-history`)
              .then((r) => (r.ok ? r.json() : []))
              .then((rows) => [item.id, rows])
          )
        ).then((pairs) => setHistoryByItem(Object.fromEntries(pairs)));
      });
  }, [ownerId]);

  const stats = useMemo(() => {
    if (!items) return null;

    let currentTotal = 0;
    let paidTotal = 0;
    const byFranchise = {};
    const allPoints = [];

    for (const item of items) {
      const history = historyByItem[item.id] ?? [];
      const latest = history.length ? Number(history[history.length - 1].value) : 0;
      currentTotal += latest;
      paidTotal += item.purchase_price ? Number(item.purchase_price) : 0;

      const key = item.franchise_id ?? "none";
      byFranchise[key] = (byFranchise[key] ?? 0) + latest;

      history.forEach((h) => allPoints.push({ value: Number(h.value), date: h.recorded_at }));
    }

    allPoints.sort((a, b) => (a.date < b.date ? -1 : 1));
    const tradeStockCount = items.filter((i) => i.trade_stock).length;

    return { currentTotal, paidTotal, byFranchise, allPoints, tradeStockCount };
  }, [items, historyByItem]);

  if (!stats) {
    return (
      <div className="detail-wrap">
        <div className="state"><div className="state-title">Adding it up…</div></div>
      </div>
    );
  }

  const delta = stats.currentTotal - stats.paidTotal;
  const maxPoint = Math.max(1, ...stats.allPoints.map((p) => p.value));
  const franchiseRows = Object.entries(stats.byFranchise)
    .map(([id, total]) => ({ name: id === "none" ? "Uncategorized" : franchiseNames[id] ?? "Uncategorized", total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="detail-wrap">
      <span className="dash-private">
        🔒 PRIVATE — VISIBLE ONLY TO YOU. NEVER SHARED, NEVER SHOWN AS A REASON TO SELL.
      </span>

      <div className="dash-total">{money(stats.currentTotal) ?? "$0"}</div>
      <div className="dash-sub">
        {items.length} item{items.length === 1 ? "" : "s"}
        {stats.paidTotal > 0 && (
          <>
            {" · "}
            {delta === 0 ? "even with" : delta > 0 ? `up ${money(Math.abs(delta))}` : `down ${money(Math.abs(delta))}`}{" "}
            from what you paid
          </>
        )}
      </div>

      {stats.allPoints.length > 0 && (
        <div className="dash-chart">
          {stats.allPoints.map((p, i) => (
            <div
              key={i}
              className="dash-dot"
              style={{ height: `${Math.max(8, (p.value / maxPoint) * 100)}%` }}
              title={`${p.date} — ${money(p.value, { cents: true })}`}
            />
          ))}
        </div>
      )}

      <div className="dash-stat-row">
        {franchiseRows.slice(0, 3).map((f) => (
          <div className="dash-stat" key={f.name}>
            <div className="k">{f.name.toUpperCase()}</div>
            <div className="v">{money(f.total) ?? "$0"}</div>
          </div>
        ))}
        <div className="dash-stat">
          <div className="k">TRADE STOCK</div>
          <div className="v">{stats.tradeStockCount} item{stats.tradeStockCount === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div className="pillar-drop">
        <button className="pillar-card" onClick={onEnterCurate}>
          <span className="pillar-card-label">Curate</span>
          <span className="pillar-card-sub">{items.length} item{items.length === 1 ? "" : "s"} catalogued</span>
        </button>
        <button className="pillar-card" onClick={onEnterAcquire}>
          <span className="pillar-card-label">Acquire</span>
          <span className="pillar-card-sub">Wishlist &amp; watchers</span>
        </button>
        <button className="pillar-card" onClick={onEnterConnect}>
          <span className="pillar-card-label">Connect</span>
          <span className="pillar-card-sub">Contacts, check-ins &amp; community</span>
        </button>
      </div>
    </div>
  );
}
