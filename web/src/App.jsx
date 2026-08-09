import { useEffect, useMemo, useState } from "react";

import AddItem from "./AddItem.jsx";
import ItemDetail from "./ItemDetail.jsx";

const NAV = ["Collection", "Wishlist", "Sets", "Reference", "Dashboard"];

function catalogNumber(id) {
  return `NO. ${String(id).padStart(4, "0")}`;
}

function money(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/* Deterministic placeholder hues until an item has a photo — every item
   will require one, but items entered through /docs may not have photos yet. */
function placeholderVars(id) {
  const hue = (id * 137) % 360;
  return {
    "--ph-hi": `hsl(${hue}, 48%, 62%)`,
    "--ph-mid": `hsl(${hue}, 42%, 34%)`,
  };
}

function photoUrl(filePath) {
  const name = filePath.split("/").pop();
  return `/photos/${name}`;
}

function ItemTile({ item, franchiseName, typeName, onOpen }) {
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/items/${item.id}/photos`)
      .then((r) => (r.ok ? r.json() : []))
      .then((photos) => {
        if (cancelled || photos.length === 0) return;
        const primary = photos.find((p) => p.photo_type === "item") ?? photos[0];
        setPhoto(primary);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const specParts = [typeName, franchiseName, item.exclusive_channel?.replaceAll("_", " ")]
    .filter(Boolean)
    .join(" · ");
  const price = money(item.purchase_price);

  return (
    <article
      className="tile"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
    >
      <span className="tile-no">{catalogNumber(item.id)}</span>
      {price && <span className="tile-price">{price}</span>}
      {photo ? (
        <div className="tile-art" style={{ backgroundImage: `url(${photoUrl(photo.file_path)})` }} />
      ) : (
        <div className="tile-art placeholder" style={placeholderVars(item.id)} />
      )}
      <h3 className="tile-name">{item.name}</h3>
      <div className="tile-spec">{specParts || "uncataloged"}</div>
      <div className="tile-badges">
        {item.edition_number != null && item.edition_total != null && (
          <span className="badge-le">
            LE {item.edition_number}/{item.edition_total}
          </span>
        )}
        {item.redemption_status === "unredeemed" && <span className="badge-le">CODE ●</span>}
        {item.trade_stock && <span className="badge-trade">TRADE</span>}
      </div>
    </article>
  );
}

export default function App() {
  const [items, setItems] = useState(null);
  const [franchises, setFranchises] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [error, setError] = useState(null);
  const [franchiseFilter, setFranchiseFilter] = useState(null);
  const [tradeOnly, setTradeOnly] = useState(false);
  const [rarities, setRarities] = useState([]);
  const [openItemId, setOpenItemId] = useState(null);
  const [adding, setAdding] = useState(false);

  // No auth yet (see SCOPE.md — signup/login is separate, undesigned work).
  // Until then: use the one existing user if there is one, or ask for a
  // username to create the bare POST /users stopgap record. If somehow
  // more than one exists, this picks the first — real owner selection is
  // an auth-flow question, not something to half-build here.
  const [owner, setOwner] = useState(undefined); // undefined = loading, null = needs creating
  const [ownerDraft, setOwnerDraft] = useState("");

  function reloadItems() {
    fetch("/items?limit=500")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError("Couldn't reach the Backstamp server — is it running on port 8000?"));
  }

  useEffect(() => {
    Promise.all([
      fetch("/items?limit=500").then((r) => r.json()),
      fetch("/franchises").then((r) => r.json()),
      fetch("/item-types").then((r) => r.json()),
      fetch("/rarities").then((r) => r.json()),
      fetch("/users").then((r) => r.json()),
    ])
      .then(([itemRows, franchiseRows, typeRows, rarityRows, userRows]) => {
        setItems(itemRows);
        setFranchises(franchiseRows);
        setItemTypes(typeRows);
        setRarities(rarityRows);
        setOwner(userRows[0] ?? null);
      })
      .catch(() => setError("Couldn't reach the Backstamp server — is it running on port 8000?"));
  }, []);

  function createOwner() {
    if (!ownerDraft.trim()) return;
    fetch("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: ownerDraft.trim() }),
    })
      .then((r) => r.json())
      .then(setOwner);
  }

  const franchiseNames = useMemo(
    () => Object.fromEntries(franchises.map((f) => [f.id, f.name])),
    [franchises]
  );
  const typeNames = useMemo(
    () => Object.fromEntries(itemTypes.map((t) => [t.id, t.name])),
    [itemTypes]
  );
  const raritiesById = useMemo(
    () => Object.fromEntries(rarities.map((r) => [r.id, r.name])),
    [rarities]
  );

  const visible = useMemo(() => {
    if (!items) return [];
    return items
      .filter((i) => (franchiseFilter == null ? true : i.franchise_id === franchiseFilter))
      .filter((i) => (tradeOnly ? i.trade_stock : true))
      .sort((a, b) => b.id - a.id);
  }, [items, franchiseFilter, tradeOnly]);

  const tradeCount = useMemo(() => (items ?? []).filter((i) => i.trade_stock).length, [items]);

  if (openItemId != null) {
    return (
      <ItemDetail
        itemId={openItemId}
        franchiseNames={franchiseNames}
        typeNames={typeNames}
        raritiesById={raritiesById}
        onBack={() => setOpenItemId(null)}
      />
    );
  }

  if (adding && owner) {
    return (
      <AddItem
        franchises={franchises}
        itemTypes={itemTypes}
        rarities={rarities}
        ownerId={owner.id}
        onCancel={() => setAdding(false)}
        onSaved={(newItemId) => {
          setAdding(false);
          reloadItems();
          setOpenItemId(newItemId);
        }}
      />
    );
  }

  return (
    <>
      <header className="topbar">
        <span className="wordmark">BACKSTAMP</span>
        <nav className="nav">
          {NAV.map((label) => (
            <a
              key={label}
              href="#"
              onClick={(e) => e.preventDefault()}
              className={`nav-link ${label === "Collection" ? "active" : "disabled"}`}
              title={label === "Collection" ? undefined : "Coming soon"}
            >
              {label}
            </a>
          ))}
        </nav>
        <button
          className="add-btn"
          disabled={!owner}
          onClick={() => setAdding(true)}
          title={owner ? undefined : "Name a collector below first"}
        >
          + Add to collection
        </button>
      </header>

      {error ? (
        <div className="state error">
          <div className="state-title">The case is dark</div>
          <p className="state-sub">{error}</p>
        </div>
      ) : items === null || owner === undefined ? (
        <div className="state">
          <div className="state-title">Unlocking the case…</div>
        </div>
      ) : owner === null ? (
        <div className="owner-gate">
          <div className="state-title">Who's cataloging?</div>
          <p className="state-sub">
            There's no login yet — just a name for whose collection this is. One-time, right now.
          </p>
          <input
            value={ownerDraft}
            onChange={(e) => setOwnerDraft(e.target.value)}
            placeholder="Your username"
            onKeyDown={(e) => e.key === "Enter" && createOwner()}
          />
          <button className="add-btn" onClick={createOwner} disabled={!ownerDraft.trim()}>
            Start the collection
          </button>
        </div>
      ) : (
        <>
          <div className="chips">
            <button
              className={`chip ${franchiseFilter == null && !tradeOnly ? "active" : ""}`}
              onClick={() => {
                setFranchiseFilter(null);
                setTradeOnly(false);
              }}
            >
              All · {items.length}
            </button>
            {franchises.map((f) => {
              const count = items.filter((i) => i.franchise_id === f.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={f.id}
                  className={`chip ${franchiseFilter === f.id ? "active" : ""}`}
                  onClick={() => setFranchiseFilter(franchiseFilter === f.id ? null : f.id)}
                >
                  {f.name} · {count}
                </button>
              );
            })}
            {tradeCount > 0 && (
              <button
                className={`chip ${tradeOnly ? "active" : ""}`}
                onClick={() => setTradeOnly(!tradeOnly)}
              >
                Trade Stock · {tradeCount}
              </button>
            )}
            <span className="sort-note">SORT: NEWEST</span>
          </div>

          {visible.length === 0 ? (
            <div className="state">
              <div className="state-title">The case is empty</div>
              <p className="state-sub">
                {items.length === 0
                  ? "Nothing catalogued yet — “+ Add to collection” above is where that starts."
                  : "No items match this filter."}
              </p>
            </div>
          ) : (
            <div className="grid">
              {visible.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  franchiseName={franchiseNames[item.franchise_id]}
                  typeName={typeNames[item.item_type_id]}
                  onOpen={() => setOpenItemId(item.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
