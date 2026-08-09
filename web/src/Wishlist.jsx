import { useEffect, useMemo, useState } from "react";

function money(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const CONDITION_LABELS = {
  any: "ANY CONDITION",
  loose_acceptable: "LOOSE ACCEPTABLE",
  sealed_mib: "SEALED/MIB",
};

function specChips(entry) {
  const chips = Object.entries(entry.variant_spec ?? {}).map(([k, v]) =>
    typeof v === "boolean" ? (v ? k.replaceAll("_", " ").toUpperCase() : null) : `${k.replaceAll("_", " ").toUpperCase()}: ${v}`
  );
  return chips.filter(Boolean);
}

function WishlistSlot({ entry, franchiseNames, typeNames, onDelete }) {
  const [hitCount, setHitCount] = useState(null);
  const [matchCount, setMatchCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/wishlist/${entry.id}/hits`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/wishlist/${entry.id}/matches`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([hits, matches]) => {
      if (cancelled) return;
      setHitCount(hits.length);
      setMatchCount(matches.length);
    });
    return () => {
      cancelled = true;
    };
  }, [entry.id]);

  const chips = specChips(entry);
  const price = money(entry.price_ceiling);

  return (
    <div className="wish-slot">
      <button className="pick-remove wish-remove" onClick={() => onDelete(entry.id)} title="Remove from wishlist">
        ✕
      </button>
      <div className="wish-sil" />
      <div className="tile-name">{entry.name}</div>
      <div className="tile-spec">
        {[typeNames[entry.item_type_id], franchiseNames[entry.franchise_id]].filter(Boolean).join(" · ") || "any type"}
      </div>
      <div className="wish-chips">
        {entry.priority && (
          <span className={`wish-chip ${entry.priority === "grail" ? "grail" : ""}`}>
            {entry.priority === "grail" ? "🔥 GRAIL" : "FILLER"}
          </span>
        )}
        {chips.map((c) => (
          <span className="wish-chip" key={c}>{c}</span>
        ))}
        {entry.condition_floor !== "any" && (
          <span className="wish-chip">{CONDITION_LABELS[entry.condition_floor]}</span>
        )}
        {entry.coa_required && <span className="wish-chip">COA REQUIRED</span>}
        {price && <span className="wish-chip">CEILING {price}</span>}
      </div>
      <div className={`wish-hit ${hitCount === 0 && matchCount === 0 ? "quiet" : ""}`}>
        {hitCount === null ? (
          "…"
        ) : hitCount > 0 ? (
          `● ${hitCount} watcher hit${hitCount === 1 ? "" : "s"}`
        ) : matchCount > 0 ? (
          `${matchCount} trade match${matchCount === 1 ? "" : "es"} in the network`
        ) : (
          "Watching — no hits yet"
        )}
      </div>
    </div>
  );
}

export default function Wishlist({ ownerId, franchises, itemTypes, franchiseNames, typeNames, onBack }) {
  const [entries, setEntries] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [conditionFloor, setConditionFloor] = useState("any");
  const [coaRequired, setCoaRequired] = useState(false);
  const [priceCeiling, setPriceCeiling] = useState("");
  const [priority, setPriority] = useState("");
  const [specRows, setSpecRows] = useState([{ key: "", value: "" }]);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/wishlist?user_id=${ownerId}`)
      .then((r) => r.json())
      .then(setEntries);
  }

  useEffect(load, [ownerId]);

  const activeChips = useMemo(() => specRows.filter((r) => r.key.trim()), [specRows]);

  function resetForm() {
    setName("");
    setFranchiseId("");
    setItemTypeId("");
    setConditionFloor("any");
    setCoaRequired(false);
    setPriceCeiling("");
    setPriority("");
    setSpecRows([{ key: "", value: "" }]);
  }

  function handleCreate() {
    setSaving(true);
    const variant_spec = Object.fromEntries(activeChips.map((r) => [r.key.trim(), r.value.trim() || true]));
    fetch("/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: ownerId,
        name,
        franchise_id: franchiseId ? Number(franchiseId) : null,
        item_type_id: itemTypeId ? Number(itemTypeId) : null,
        variant_spec,
        condition_floor: conditionFloor,
        coa_required: coaRequired,
        price_ceiling: priceCeiling || null,
        priority: priority || null,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(() => {
        resetForm();
        setShowForm(false);
        setSaving(false);
        load();
      })
      .catch(() => setSaving(false));
  }

  function handleDelete(id) {
    fetch(`/wishlist/${id}`, { method: "DELETE" }).then(load);
  }

  return (
    <div className="detail-wrap">
      <div className="back-row">
        <button className="back-btn" onClick={onBack}>← Collection</button>
        <button className="add-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Reserve a slot"}
        </button>
      </div>

      {showForm && (
        <div className="acc-card" style={{ marginBottom: 20, maxWidth: 640 }}>
          <div className="form-grid">
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="flabel" style={{ color: "#6b6152" }}>What are you looking for?</span>
              <input className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Murloc GITD Chase" />
            </label>
            <label className="field">
              <span className="flabel" style={{ color: "#6b6152" }}>Franchise</span>
              <select className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                value={franchiseId} onChange={(e) => setFranchiseId(e.target.value)}>
                <option value="">Any</option>
                {franchises.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="flabel" style={{ color: "#6b6152" }}>Type</span>
              <select className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                value={itemTypeId} onChange={(e) => setItemTypeId(e.target.value)}>
                <option value="">Any</option>
                {itemTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="flabel" style={{ color: "#6b6152" }}>Condition floor</span>
              <select className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                value={conditionFloor} onChange={(e) => setConditionFloor(e.target.value)}>
                <option value="any">Any condition</option>
                <option value="loose_acceptable">Loose acceptable</option>
                <option value="sealed_mib">Sealed / MIB</option>
              </select>
            </label>
            <label className="field">
              <span className="flabel" style={{ color: "#6b6152" }}>Price ceiling</span>
              <input className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                type="number" min="0" step="0.01" value={priceCeiling} onChange={(e) => setPriceCeiling(e.target.value)} placeholder="No limit" />
            </label>
            <label className="field">
              <span className="flabel" style={{ color: "#6b6152" }}>Priority</span>
              <select className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">None</option>
                <option value="grail">🔥 Grail</option>
                <option value="filler">Filler</option>
              </select>
            </label>
            <label className="field checkbox-field" style={{ color: "#2a2620" }}>
              <input type="checkbox" checked={coaRequired} onChange={(e) => setCoaRequired(e.target.checked)} />
              <span>COA required</span>
            </label>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="flabel" style={{ color: "#6b6152" }}>
                Variant spec — anything specific about which version you want
              </span>
              {specRows.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <input className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                    placeholder="e.g. finish" value={row.key}
                    onChange={(e) => setSpecRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))} />
                  <input className="finput" style={{ background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" }}
                    placeholder="e.g. glow-in-the-dark" value={row.value}
                    onChange={(e) => setSpecRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))} />
                </div>
              ))}
              <button className="back-btn" type="button" onClick={() => setSpecRows((r) => [...r, { key: "", value: "" }])}>
                + another detail
              </button>
            </div>
          </div>
          <button className="add-btn" style={{ marginTop: 16 }} disabled={!name.trim() || saving} onClick={handleCreate}>
            {saving ? "Saving…" : "Reserve this slot"}
          </button>
        </div>
      )}

      {entries === null ? (
        <div className="state"><div className="state-title">Checking the wishlist…</div></div>
      ) : entries.length === 0 && !showForm ? (
        <div className="state">
          <div className="state-title">No reserved slots yet</div>
          <p className="state-sub">"+ Reserve a slot" above starts your wishlist.</p>
        </div>
      ) : (
        <div className="wish-grid">
          {entries.map((entry) => (
            <WishlistSlot
              key={entry.id}
              entry={entry}
              franchiseNames={franchiseNames}
              typeNames={typeNames}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
