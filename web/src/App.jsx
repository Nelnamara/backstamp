import { useEffect, useMemo, useState } from "react";

import AddItem from "./AddItem.jsx";
import Connect from "./Connect.jsx";
import Dashboard from "./Dashboard.jsx";
import ItemDetail from "./ItemDetail.jsx";
import Login from "./Login.jsx";
import SetsReference from "./SetsReference.jsx";
import Wishlist from "./Wishlist.jsx";

const PILLARS = ["Curate", "Acquire", "Connect"];

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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [rarities, setRarities] = useState([]);
  const [openItemId, setOpenItemId] = useState(null);
  const [adding, setAdding] = useState(false);
  // "dashboard" is the landing screen (a window shade over the three
  // pillars, not a pillar itself) — "curate" | "curate-sets" | "acquire"
  // are the pillars themselves. Connect has no view yet — parked in nav.
  const [view, setView] = useState("dashboard");

  // me: undefined = still checking session, null = not logged in, object = real
  // logged-in user. Replaces the old "type a username" stopgap entirely —
  // that only ever existed because there was no real auth yet.
  const [me, setMe] = useState(undefined);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function reloadItems() {
    fetch("/items?limit=500")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError("Couldn't reach the Backstamp server — is it running on port 8000?"));
  }

  // On load: if the URL carries a magic-link token (from the emailed
  // link), complete the login before anything else renders. Otherwise
  // just check for an existing session cookie.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      fetch("/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((user) => {
          window.history.replaceState({}, "", window.location.pathname);
          setMe(user);
        })
        .catch(() => {
          window.history.replaceState({}, "", window.location.pathname);
          setMe(null);
        });
    } else {
      fetch("/auth/me")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setMe)
        .catch(() => setMe(null));
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    Promise.all([
      fetch("/items?limit=500").then((r) => r.json()),
      fetch("/franchises").then((r) => r.json()),
      fetch("/item-types").then((r) => r.json()),
      fetch("/rarities").then((r) => r.json()),
    ])
      .then(([itemRows, franchiseRows, typeRows, rarityRows]) => {
        setItems(itemRows);
        setFranchises(franchiseRows);
        setItemTypes(typeRows);
        setRarities(rarityRows);
      })
      .catch(() => setError("Couldn't reach the Backstamp server — is it running on port 8000?"));
  }, [me]);

  function logout() {
    fetch("/auth/logout", { method: "POST" }).then(() => {
      setMe(null);
      setItems(null);
      setView("dashboard");
    });
  }

  function createInvite() {
    fetch("/auth/invites", { method: "POST" })
      .then((r) => r.json())
      .then((inv) => setInviteMsg(inv.code));
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
    const term = search.trim().toLowerCase();
    return items
      .filter((i) => (franchiseFilter == null ? true : i.franchise_id === franchiseFilter))
      .filter((i) => (tradeOnly ? i.trade_stock : true))
      .filter((i) => (term ? i.name.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        if (sortBy === "oldest") return a.id - b.id;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "value") return (Number(b.purchase_price) || 0) - (Number(a.purchase_price) || 0);
        return b.id - a.id;
      });
  }, [items, franchiseFilter, tradeOnly, search, sortBy]);

  const tradeCount = useMemo(() => (items ?? []).filter((i) => i.trade_stock).length, [items]);

  if (openItemId != null) {
    return (
      <ItemDetail
        itemId={openItemId}
        franchises={franchises}
        itemTypes={itemTypes}
        rarities={rarities}
        franchiseNames={franchiseNames}
        typeNames={typeNames}
        raritiesById={raritiesById}
        onBack={() => setOpenItemId(null)}
        onDeleted={() => {
          setOpenItemId(null);
          reloadItems();
        }}
      />
    );
  }

  if (adding && me) {
    return (
      <AddItem
        franchises={franchises}
        itemTypes={itemTypes}
        rarities={rarities}
        ownerId={me.id}
        onCancel={() => setAdding(false)}
        onSaved={(newItemId) => {
          setAdding(false);
          reloadItems();
          setOpenItemId(newItemId);
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="state error">
        <div className="state-title">The case is dark</div>
        <p className="state-sub">{error}</p>
      </div>
    );
  }

  if (me === undefined) {
    return (
      <div className="state">
        <div className="state-title">Unlocking the case…</div>
      </div>
    );
  }

  if (me === null) {
    return <Login />;
  }

  if (items === null) {
    return (
      <div className="state">
        <div className="state-title">Unlocking the case…</div>
      </div>
    );
  }

  const inCurate = view === "curate" || view === "curate-sets";

  let content;
  if (view === "connect") {
    content = <Connect me={me} />;
  } else if (view === "acquire") {
    content = (
      <Wishlist
        ownerId={me.id}
        franchises={franchises}
        itemTypes={itemTypes}
        franchiseNames={franchiseNames}
        typeNames={typeNames}
      />
    );
  } else if (view === "curate-sets") {
    content = (
      <SetsReference
        ownerId={me.id}
        franchises={franchises}
        itemTypes={itemTypes}
        franchiseNames={franchiseNames}
        typeNames={typeNames}
      />
    );
  } else if (view === "curate") {
    content = (
      <>
        <div className="chips">
          <input
            className="search-input"
            type="search"
            placeholder="Search the collection…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">SORT: NEWEST</option>
            <option value="oldest">SORT: OLDEST</option>
            <option value="name">SORT: NAME A–Z</option>
            <option value="value">SORT: VALUE HIGH–LOW</option>
          </select>
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
    );
  } else {
    content = (
      <Dashboard
        ownerId={me.id}
        franchiseNames={franchiseNames}
        onEnterCurate={() => setView("curate")}
        onEnterAcquire={() => setView("acquire")}
        onEnterConnect={() => setView("connect")}
      />
    );
  }

  const TABS = [
    { key: "dashboard", label: "Home", glyph: "◆", active: view === "dashboard" },
    { key: "curate", label: "Curate", glyph: "◈", active: inCurate },
    { key: "acquire", label: "Acquire", glyph: "◎", active: view === "acquire" },
    { key: "connect", label: "Connect", glyph: "◇", active: view === "connect" },
  ];

  return (
    <div className="phone-shell">
      <header className="topbar">
        <span className="wordmark" role="button" tabIndex={0} onClick={() => setView("dashboard")}>
          BACKSTAMP
        </span>
        <button className="menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu">
          ⋯
        </button>
        {menuOpen && (
          <div className="account-menu">
            <div className="account-menu-who">{me.username}</div>
            <button onClick={() => { createInvite(); setMenuOpen(false); }}>+ Create invite</button>
            <button onClick={() => { logout(); setMenuOpen(false); }}>Log out</button>
          </div>
        )}
      </header>

      {inviteMsg && (
        <div className="invite-banner">
          Invite code: <strong>{inviteMsg}</strong> — give this to whoever you're inviting.
          <button className="tag-remove" onClick={() => setInviteMsg(null)} style={{ marginLeft: 10 }}>×</button>
        </div>
      )}

      {inCurate && (
        <div className="subnav">
          <button
            className={`subnav-link ${view === "curate" ? "active" : ""}`}
            onClick={() => setView("curate")}
          >
            Catalog
          </button>
          <button
            className={`subnav-link ${view === "curate-sets" ? "active" : ""}`}
            onClick={() => setView("curate-sets")}
          >
            Sets & Reference
          </button>
        </div>
      )}

      <main className="phone-body">{content}</main>

      {inCurate && (
        <button className="fab" onClick={() => setAdding(true)} aria-label="Add to collection">
          +
        </button>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${t.active ? "active" : ""}`}
            onClick={() => setView(t.key)}
          >
            <span className="tab-glyph">{t.glyph}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
