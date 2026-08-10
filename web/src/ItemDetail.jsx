import { useEffect, useState } from "react";

function catalogNumber(id) {
  return `NO. ${String(id).padStart(4, "0")}`;
}

function money(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function photoUrl(filePath) {
  return `/photos/${filePath.split("/").pop()}`;
}

function dateOnly(isoString) {
  return isoString ? isoString.slice(0, 10) : "";
}

const PHOTO_LABELS = { item: "ITEM", packaging: "BOX", coa: "COA", condition: "COND", other: "MISC" };

const REDEMPTION_OPTIONS = [
  ["not_applicable", "Not applicable"],
  ["unredeemed", "Unredeemed"],
  ["redeemed", "Redeemed"],
  ["redeemed_elsewhere", "Redeemed elsewhere"],
  ["orphaned", "Orphaned"],
];

export default function ItemDetail({
  itemId,
  franchises,
  itemTypes,
  rarities,
  franchiseNames,
  typeNames,
  raritiesById,
  onBack,
  onDeleted,
}) {
  const [item, setItem] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [activePhoto, setActivePhoto] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);
  const [pinCondition, setPinCondition] = useState(null);
  const [anchors, setAnchors] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);

  function load() {
    const optional = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([
      fetch(`/items/${itemId}`).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
      optional(`/items/${itemId}/photos`),
      optional(`/items/${itemId}/value-history`),
      optional(`/items/${itemId}/pin-condition`),
      optional(`/items/${itemId}/provenance-anchors`),
      optional(`/items/${itemId}/guest-signatures`),
      optional(`/items/${itemId}/tags`),
    ])
      .then(([itemRow, photoRows, valueRows, pin, anchorRows, sigRows, tagRows]) => {
        setItem(itemRow);
        const photoList = photoRows ?? [];
        setPhotos(photoList);
        setActivePhoto((prev) =>
          photoList.find((p) => p.id === prev?.id) ?? photoList.find((p) => p.photo_type === "item") ?? photoList[0] ?? null
        );
        setValueHistory(valueRows ?? []);
        setPinCondition(pin);
        setAnchors(anchorRows ?? []);
        setSignatures(sigRows ?? []);
        setTags(tagRows ?? []);
      })
      .catch(() => setError("This item couldn't be loaded."));
  }

  useEffect(load, [itemId]);

  function startEdit() {
    setDraft({
      name: item.name,
      franchise_id: item.franchise_id ?? "",
      item_type_id: item.item_type_id ?? "",
      rarity_id: item.rarity_id ?? "",
      purchase_price: item.purchase_price ?? "",
      purchase_date: item.purchase_date ?? "",
      redemption_status: item.redemption_status,
      trade_stock: item.trade_stock,
      edition_number: item.edition_number ?? "",
      edition_total: item.edition_total ?? "",
    });
    setEditing(true);
  }

  function saveEdit() {
    setSaving(true);
    fetch(`/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        franchise_id: draft.franchise_id ? Number(draft.franchise_id) : null,
        item_type_id: draft.item_type_id ? Number(draft.item_type_id) : null,
        rarity_id: draft.rarity_id ? Number(draft.rarity_id) : null,
        purchase_price: draft.purchase_price === "" ? null : draft.purchase_price,
        purchase_date: draft.purchase_date || null,
        redemption_status: draft.redemption_status,
        trade_stock: draft.trade_stock,
        edition_number: draft.edition_number === "" ? null : Number(draft.edition_number),
        edition_total: draft.edition_total === "" ? null : Number(draft.edition_total),
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((updated) => {
        setItem(updated);
        setEditing(false);
        setSaving(false);
      })
      .catch(() => setSaving(false));
  }

  function deleteItem() {
    if (!window.confirm(`Delete "${item.name}" from the collection? This can't be undone.`)) return;
    fetch(`/items/${itemId}`, { method: "DELETE" }).then((r) => {
      if (r.ok) onDeleted();
    });
  }

  function addTag() {
    const name = tagDraft.trim();
    if (!name) return;
    fetch(`/items/${itemId}/tags/${encodeURIComponent(name)}`, { method: "POST" })
      .then((r) => r.json())
      .then((updated) => {
        setTags(updated);
        setTagDraft("");
      });
  }

  function removeTag(name) {
    fetch(`/items/${itemId}/tags/${encodeURIComponent(name)}`, { method: "DELETE" })
      .then((r) => r.json())
      .then(setTags);
  }

  function removePhoto(photoId) {
    if (!window.confirm("Remove this photo? This can't be undone.")) return;
    fetch(`/items/${itemId}/photos/${photoId}`, { method: "DELETE" }).then((r) => {
      if (r.ok) load();
    });
  }

  if (error) {
    return (
      <div className="state error">
        <div className="state-title">Not in the case</div>
        <p className="state-sub">{error}</p>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="state">
        <div className="state-title">Pulling the card…</div>
      </div>
    );
  }

  const specParts = [
    typeNames[item.item_type_id],
    franchiseNames[item.franchise_id],
    raritiesById[item.rarity_id],
    item.exclusive_channel?.replaceAll("_", " "),
  ]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  const values = valueHistory.map((v) => Number(v.value));
  const maxValue = values.length ? Math.max(...values) : 0;
  const latest = values.length ? money(values[values.length - 1]) : null;
  const purchase = money(item.purchase_price);
  const witnessed = signatures.some((s) => s.witnessed_by_user_id != null);
  const hasCoaPhoto = photos.some((p) => p.photo_type === "coa");

  return (
    <div className="detail-wrap">
      <div className="back-row">
        <button className="back-btn" onClick={onBack}>← Catalog</button>
        <div style={{ display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <button className="back-btn" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              <button className="add-btn" onClick={saveEdit} disabled={saving || !draft.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button className="back-btn delete-btn" onClick={deleteItem}>Delete item</button>
              <button className="add-btn" onClick={startEdit}>Edit item</button>
            </>
          )}
        </div>
      </div>
      <div className="detail">
        <div>
          <div
            className={`photo-stage ${activePhoto ? "" : "placeholder"}`}
            style={activePhoto ? { backgroundImage: `url(${photoUrl(activePhoto.file_path)})` } : undefined}
          />
          {photos.length > 0 && (
            <div className="thumbrow">
              {photos.map((p) => (
                <button
                  key={p.id}
                  className={`thumb ${activePhoto?.id === p.id ? "on" : ""}`}
                  style={{ backgroundImage: `url(${photoUrl(p.file_path)})` }}
                  onClick={() => setActivePhoto(p)}
                  title={p.photo_type}
                >
                  <span>{PHOTO_LABELS[p.photo_type] ?? "—"}</span>
                  <span
                    className="thumb-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(p.id);
                    }}
                    title="Remove photo"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="acc-card">
          <div className="acc-no">
            {catalogNumber(item.id)} · ACCESSIONED {dateOnly(item.created_at)}
          </div>
          {editing ? (
            <div className="acc-sec edit-form">
              <input
                className="finput"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Name"
              />
              <div className="edit-row">
                <select
                  className="finput"
                  value={draft.franchise_id}
                  onChange={(e) => setDraft({ ...draft, franchise_id: e.target.value })}
                >
                  <option value="">— Franchise —</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <select
                  className="finput"
                  value={draft.item_type_id}
                  onChange={(e) => setDraft({ ...draft, item_type_id: e.target.value })}
                >
                  <option value="">— Type —</option>
                  {itemTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select
                  className="finput"
                  value={draft.rarity_id}
                  onChange={(e) => setDraft({ ...draft, rarity_id: e.target.value })}
                >
                  <option value="">— Rarity —</option>
                  {rarities.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="edit-row">
                <input
                  className="finput"
                  type="number"
                  step="0.01"
                  value={draft.purchase_price}
                  onChange={(e) => setDraft({ ...draft, purchase_price: e.target.value })}
                  placeholder="Purchase price"
                />
                <input
                  className="finput"
                  type="date"
                  value={draft.purchase_date}
                  onChange={(e) => setDraft({ ...draft, purchase_date: e.target.value })}
                />
              </div>
              <div className="edit-row">
                <select
                  className="finput"
                  value={draft.redemption_status}
                  onChange={(e) => setDraft({ ...draft, redemption_status: e.target.value })}
                >
                  {REDEMPTION_OPTIONS.map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                <label className="edit-check">
                  <input
                    type="checkbox"
                    checked={draft.trade_stock}
                    onChange={(e) => setDraft({ ...draft, trade_stock: e.target.checked })}
                  />
                  Trade stock
                </label>
              </div>
              <div className="edit-row">
                <input
                  className="finput"
                  type="number"
                  value={draft.edition_number}
                  onChange={(e) => setDraft({ ...draft, edition_number: e.target.value })}
                  placeholder="Edition #"
                />
                <input
                  className="finput"
                  type="number"
                  value={draft.edition_total}
                  onChange={(e) => setDraft({ ...draft, edition_total: e.target.value })}
                  placeholder="Edition total"
                />
              </div>
            </div>
          ) : (
            <>
              <h2 className="acc-name">{item.name}</h2>
              <div className="acc-sub">{specParts || "UNCATALOGED"}</div>

              <div className="acc-sec">
                <div className="acc-label">STATUS</div>
                {item.redemption_status !== "not_applicable" && (
                  <div className="acc-line">
                    <span>Redemption code</span>
                    <span className="v">{item.redemption_status.replaceAll("_", " ").toUpperCase()}</span>
                  </div>
                )}
                <div className="acc-line">
                  <span>Trade stock</span>
                  <span className="v">{item.trade_stock ? "YES — SHOWN IN EXCHANGES" : "NO — KEEP"}</span>
                </div>
              </div>
            </>
          )}

          <div className="acc-sec">
            <div className="acc-label">TAGS</div>
            <div className="tag-row">
              {tags.map((t) => (
                <span className="tag-chip" key={t}>
                  {t}
                  <span className="tag-remove" onClick={() => removeTag(t)}>×</span>
                </span>
              ))}
              <input
                className="tag-input"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="+ add tag"
              />
            </div>
          </div>

          {(item.edition_number != null || hasCoaPhoto) && (
            <div className="acc-sec">
              <div className="acc-label">EDITION</div>
              {item.edition_number != null && item.edition_total != null && (
                <div className="acc-line">
                  <span>Numbered</span>
                  <span className="v">
                    {item.edition_number} / {item.edition_total}
                  </span>
                </div>
              )}
              <div className="acc-line">
                <span>COA photo</span>
                <span className="v">{hasCoaPhoto ? "ON FILE ✓" : "NONE"}</span>
              </div>
            </div>
          )}

          {pinCondition && (
            <div className="acc-sec">
              <div className="acc-label">CONDITION — PIN</div>
              <div className="acc-line">
                <span>Moon gap</span>
                <span className="v">{pinCondition.moon_gap.toUpperCase()}</span>
              </div>
              <div className="acc-line">
                <span>Pin back</span>
                <span className="v">{pinCondition.pin_back_original ? "ORIGINAL" : "REPLACED"}</span>
              </div>
              <div className="acc-line">
                <span>Posts / chips</span>
                <span className="v">
                  {pinCondition.post_straightness.toUpperCase()} · {pinCondition.enamel_chip_count}
                </span>
              </div>
            </div>
          )}

          <div className="acc-sec">
            <div className="acc-label">PROVENANCE</div>
            {anchors.length === 0 && signatures.length === 0 && (
              <div className="acc-line">
                <span>No proof attached yet</span>
              </div>
            )}
            {anchors.map((a) => (
              <div className="acc-line" key={a.id}>
                <span>{a.proof_type.replaceAll("_", " ")} anchored</span>
                <span className="v">{a.app_timestamp.replace("T", " ").slice(0, 16)} UTC</span>
              </div>
            ))}
            {signatures.map((s) => (
              <div className="acc-line" key={s.id}>
                <span>
                  Signed — {s.guest_name}, {s.convention_name}
                </span>
                <span className="v">{s.convention_date}</span>
              </div>
            ))}
            {(anchors.length > 0 || signatures.length > 0) && (
              <div className="stamp-row">
                {anchors.length > 0 && <span className="stamp">PROVENANCE ANCHORED</span>}
                {signatures.length > 0 && (
                  <span className="stamp">{witnessed ? "SIGNED · WITNESSED" : "SIGNED"}</span>
                )}
              </div>
            )}
          </div>

          <div className="acc-sec">
            <div className="acc-label">
              VALUE{purchase ? ` — ${purchase}` : ""}
              {latest && latest !== purchase ? ` → ${latest}` : ""}
            </div>
            {values.length > 0 ? (
              <div className="spark">
                {values.map((v, i) => (
                  <div
                    key={i}
                    className="spark-bar"
                    style={{ height: `${Math.max(12, (v / maxValue) * 100)}%` }}
                    title={money(v)}
                  />
                ))}
              </div>
            ) : (
              <div className="acc-line">
                <span>No value logged yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
