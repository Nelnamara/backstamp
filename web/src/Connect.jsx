import { useEffect, useMemo, useState } from "react";

const TIER_LABELS = {
  tier_1: "TIER 1 — Profile & contact",
  tier_2: "TIER 2 — + Wishlist",
  tier_3: "TIER 3 — + Full collection",
};

const POST_TYPES = ["showcase", "trade", "seeking"];

function fieldStyle() {
  return { background: "#fff", color: "#2a2620", border: "1px solid #c9bfa9" };
}

function ContactsTab({ me, users, usersById }) {
  const [contacts, setContacts] = useState(null);
  const [toUserId, setToUserId] = useState("");
  const [tier, setTier] = useState("tier_1");
  const [promoted, setPromoted] = useState(false);
  const [autoConnect, setAutoConnect] = useState(me.auto_connect_at_conventions);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/contacts?user_id=${me.id}`).then((r) => r.json()).then(setContacts);
  }
  useEffect(load, [me.id]);

  const otherUsers = users.filter((u) => u.id !== me.id);

  function grant() {
    if (!toUserId) return;
    setSaving(true);
    fetch("/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_user_id: me.id,
        to_user_id: Number(toUserId),
        tier,
        promoted,
      }),
    })
      .then((r) => r.json())
      .then(() => {
        setToUserId("");
        setTier("tier_1");
        setPromoted(false);
        setSaving(false);
        load();
      })
      .catch(() => setSaving(false));
  }

  function toggleAutoConnect(checked) {
    setAutoConnect(checked);
    fetch(`/users/${me.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_connect_at_conventions: checked }),
    });
  }

  return (
    <div>
      <div className="acc-card" style={{ marginBottom: 20, maxWidth: 640 }}>
        <label className="field checkbox-field" style={{ color: "#2a2620", marginBottom: 14 }}>
          <input type="checkbox" checked={autoConnect} onChange={(e) => toggleAutoConnect(e.target.checked)} />
          <span>Auto-connect with other auto-connect collectors at the same convention</span>
        </label>

        <div className="form-grid">
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="flabel" style={{ color: "#6b6152" }}>Connect with</span>
            <select className="finput" style={fieldStyle()} value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">Choose a collector…</option>
              {otherUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="flabel" style={{ color: "#6b6152" }}>Trust tier</span>
            <select className="finput" style={fieldStyle()} value={tier} onChange={(e) => setTier(e.target.value)}>
              {Object.entries(TIER_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field checkbox-field" style={{ color: "#2a2620" }}>
            <input type="checkbox" checked={promoted} onChange={(e) => setPromoted(e.target.checked)} />
            <span>Promote — keep this permanent instead of expiring</span>
          </label>
        </div>
        <button className="add-btn" style={{ marginTop: 16 }} disabled={!toUserId || saving} onClick={grant}>
          {saving ? "Saving…" : "Grant / update"}
        </button>
        <p className="state-sub" style={{ marginTop: 10, textAlign: "left" }}>
          Scanning phones to connect (optical transfer) isn't built yet — this is the manual
          stand-in for now.
        </p>
      </div>

      {contacts === null ? (
        <div className="state"><div className="state-title">Checking contacts…</div></div>
      ) : contacts.length === 0 ? (
        <div className="state">
          <div className="state-title">No contacts yet</div>
          <p className="state-sub">Grant someone a trust tier above to get started.</p>
        </div>
      ) : (
        <div className="wish-grid">
          {contacts.map((c) => {
            const isMine = c.from_user_id === me.id;
            const otherId = isMine ? c.to_user_id : c.from_user_id;
            const other = usersById[otherId];
            return (
              <div className="wish-slot" key={`${c.from_user_id}-${c.to_user_id}`}>
                <div className="tile-name">{other?.username ?? `user #${otherId}`}</div>
                <div className="tile-spec">{isMine ? "You granted them" : "They granted you"}</div>
                <div className="wish-chips">
                  <span className="wish-chip">{TIER_LABELS[c.tier]}</span>
                  {c.promoted ? (
                    <span className="wish-chip grail">PERMANENT</span>
                  ) : (
                    <span className="wish-chip">
                      {c.expires_at ? `Expires ${c.expires_at.slice(0, 10)}` : "No expiry set"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckInsTab({ me, usersById }) {
  const [checkins, setCheckins] = useState(null);
  const [conventionName, setConventionName] = useState("");
  const [conventionDate, setConventionDate] = useState("");
  const [method, setMethod] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [notifyTargets, setNotifyTargets] = useState(null);

  function load() {
    fetch(`/convention-checkins?user_id=${me.id}`).then((r) => r.json()).then(setCheckins);
  }
  useEffect(load, [me.id]);

  function checkIn() {
    if (!conventionName.trim() || !conventionDate) return;
    setSaving(true);
    fetch("/convention-checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: me.id,
        convention_name: conventionName.trim(),
        convention_date: conventionDate,
        method,
      }),
    })
      .then((r) => r.json())
      .then((checkin) => {
        setConventionName("");
        setConventionDate("");
        setSaving(false);
        load();
        return fetch(`/convention-checkins/${checkin.id}/notify-targets`).then((r) => r.json());
      })
      .then((ids) => setNotifyTargets(ids ?? []))
      .catch(() => setSaving(false));
  }

  return (
    <div>
      <div className="acc-card" style={{ marginBottom: 20, maxWidth: 640 }}>
        <div className="form-grid">
          <label className="field">
            <span className="flabel" style={{ color: "#6b6152" }}>Convention</span>
            <input className="finput" style={fieldStyle()} value={conventionName}
              onChange={(e) => setConventionName(e.target.value)} placeholder="e.g. BlizzCon" />
          </label>
          <label className="field">
            <span className="flabel" style={{ color: "#6b6152" }}>Date</span>
            <input className="finput" style={fieldStyle()} type="date" value={conventionDate}
              onChange={(e) => setConventionDate(e.target.value)} />
          </label>
          <label className="field checkbox-field" style={{ color: "#2a2620" }}>
            <input type="checkbox" checked={method === "geofence"}
              onChange={(e) => setMethod(e.target.checked ? "geofence" : "manual")} />
            <span>Detected automatically (geofence) rather than manual</span>
          </label>
        </div>
        <button className="add-btn" style={{ marginTop: 16 }}
          disabled={!conventionName.trim() || !conventionDate || saving} onClick={checkIn}>
          {saving ? "Checking in…" : "Check in"}
        </button>
        {notifyTargets && (
          <p className="state-sub" style={{ marginTop: 10, textAlign: "left" }}>
            {notifyTargets.length === 0
              ? "None of your contacts would be notified — no active contacts right now."
              : `Contacts notified: ${notifyTargets.map((id) => usersById[id]?.username ?? id).join(", ")}. Real push needs the native app — this is the in-app record for now.`}
          </p>
        )}
      </div>

      {checkins === null ? (
        <div className="state"><div className="state-title">Loading…</div></div>
      ) : checkins.length === 0 ? (
        <div className="state">
          <div className="state-title">No check-ins yet</div>
        </div>
      ) : (
        <div className="wish-grid">
          {checkins.map((c) => (
            <div className="wish-slot" key={c.id}>
              <div className="tile-name">{c.convention_name}</div>
              <div className="tile-spec">{c.convention_date} · {c.method.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityTab({ me, usersById, items }) {
  const [posts, setPosts] = useState(null);
  const [filter, setFilter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState("showcase");
  const [caption, setCaption] = useState("");
  const [itemIds, setItemIds] = useState([]);
  const [saving, setSaving] = useState(false);

  function load() {
    const url = filter ? `/community-posts?post_type=${filter}` : "/community-posts";
    fetch(url).then((r) => r.json()).then(setPosts);
  }
  useEffect(load, [filter]);

  function toggleItem(id) {
    setItemIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }

  function createPost() {
    if (!caption.trim()) return;
    setSaving(true);
    fetch("/community-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: me.id, post_type: postType, caption: caption.trim(), item_ids: itemIds }),
    })
      .then((r) => r.json())
      .then(() => {
        setCaption("");
        setItemIds([]);
        setShowForm(false);
        setSaving(false);
        load();
      })
      .catch(() => setSaving(false));
  }

  function deletePost(id) {
    fetch(`/community-posts/${id}`, { method: "DELETE" }).then(load);
  }

  return (
    <div>
      <div className="chips" style={{ padding: "0 0 14px" }}>
        <button className={`chip ${filter == null ? "active" : ""}`} onClick={() => setFilter(null)}>All</button>
        {POST_TYPES.map((t) => (
          <button key={t} className={`chip ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button className="add-btn" style={{ marginLeft: "auto" }} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ New post"}
        </button>
      </div>

      {showForm && (
        <div className="acc-card" style={{ marginBottom: 20, maxWidth: 640 }}>
          <div className="form-grid">
            <label className="field">
              <span className="flabel" style={{ color: "#6b6152" }}>Type</span>
              <select className="finput" style={fieldStyle()} value={postType} onChange={(e) => setPostType(e.target.value)}>
                {POST_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="flabel" style={{ color: "#6b6152" }}>Caption</span>
              <input className="finput" style={fieldStyle()} value={caption}
                onChange={(e) => setCaption(e.target.value)} placeholder="e.g. My BlizzCon 2019 Murloc set" />
            </label>
            {items.length > 0 && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="flabel" style={{ color: "#6b6152" }}>Include your items (optional)</span>
                <div className="wish-chips">
                  {items.map((it) => (
                    <button
                      type="button"
                      key={it.id}
                      className={`chip ${itemIds.includes(it.id) ? "active" : ""}`}
                      onClick={() => toggleItem(it.id)}
                    >
                      {it.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="add-btn" style={{ marginTop: 16 }} disabled={!caption.trim() || saving} onClick={createPost}>
            {saving ? "Posting…" : "Post"}
          </button>
        </div>
      )}

      {posts === null ? (
        <div className="state"><div className="state-title">Loading the community page…</div></div>
      ) : posts.length === 0 ? (
        <div className="state">
          <div className="state-title">Nothing posted yet</div>
        </div>
      ) : (
        <div className="wish-grid">
          {posts.map((p) => (
            <div className="wish-slot" key={p.id}>
              {p.user_id === me.id && (
                <button className="pick-remove wish-remove" onClick={() => deletePost(p.id)} title="Delete post">✕</button>
              )}
              <div className="wish-chips" style={{ marginBottom: 6 }}>
                <span className="wish-chip">{p.post_type.toUpperCase()}</span>
              </div>
              <div className="tile-name">{p.caption}</div>
              <div className="tile-spec">
                by {usersById[p.user_id]?.username ?? `user #${p.user_id}`}
                {p.item_ids.length > 0 ? ` · ${p.item_ids.length} item${p.item_ids.length === 1 ? "" : "s"} attached` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Connect({ me }) {
  const [tab, setTab] = useState("contacts");
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/users").then((r) => r.json()).then(setUsers);
    fetch(`/items?owner_id=${me.id}&limit=500`).then((r) => r.json()).then(setItems);
  }, [me.id]);

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  return (
    <div className="detail-wrap">
      <div className="subnav" style={{ padding: "0 0 14px", borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        <button className={`subnav-link ${tab === "contacts" ? "active" : ""}`} onClick={() => setTab("contacts")}>
          Contacts
        </button>
        <button className={`subnav-link ${tab === "checkins" ? "active" : ""}`} onClick={() => setTab("checkins")}>
          Check-ins
        </button>
        <button className={`subnav-link ${tab === "community" ? "active" : ""}`} onClick={() => setTab("community")}>
          Community
        </button>
      </div>

      {tab === "contacts" && <ContactsTab me={me} users={users} usersById={usersById} />}
      {tab === "checkins" && <CheckInsTab me={me} usersById={usersById} />}
      {tab === "community" && <CommunityTab me={me} usersById={usersById} items={items} />}
    </div>
  );
}
