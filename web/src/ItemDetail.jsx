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

export default function ItemDetail({ itemId, franchiseNames, typeNames, raritiesById, onBack }) {
  const [item, setItem] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [activePhoto, setActivePhoto] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);
  const [pinCondition, setPinCondition] = useState(null);
  const [anchors, setAnchors] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
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
    ])
      .then(([itemRow, photoRows, valueRows, pin, anchorRows, sigRows]) => {
        setItem(itemRow);
        const photoList = photoRows ?? [];
        setPhotos(photoList);
        setActivePhoto(photoList.find((p) => p.photo_type === "item") ?? photoList[0] ?? null);
        setValueHistory(valueRows ?? []);
        setPinCondition(pin);
        setAnchors(anchorRows ?? []);
        setSignatures(sigRows ?? []);
      })
      .catch(() => setError("This item couldn't be loaded."));
  }, [itemId]);

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
        <button className="back-btn" onClick={onBack}>← Collection</button>
        <button className="add-btn" disabled title="Editing is a later increment">Edit item</button>
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
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="acc-card">
          <div className="acc-no">
            {catalogNumber(item.id)} · ACCESSIONED {dateOnly(item.created_at)}
          </div>
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
