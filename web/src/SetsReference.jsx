import { useEffect, useState } from "react";

function SetCard({ manifest, franchiseNames }) {
  const [members, setMembers] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");

  function load() {
    fetch(`/set-manifests/${manifest.id}/members`)
      .then((r) => r.json())
      .then(setMembers);
  }

  useEffect(load, [manifest.id]);

  function addMember() {
    if (!name.trim()) return;
    fetch(`/set-manifests/${manifest.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }).then(() => {
      setName("");
      setShowAdd(false);
      load();
    });
  }

  return (
    <div className="ref-row">
      <div className="tile-name">{manifest.name}</div>
      <div className="tile-spec">
        {franchiseNames[manifest.franchise_id] ?? "any franchise"} · editorial manifest ·{" "}
        {manifest.is_active ? "active" : "closed"}
      </div>
      {members === null ? (
        <div className="wish-hit quiet">Loading members…</div>
      ) : members.length === 0 ? (
        <div className="wish-hit quiet">No members listed yet</div>
      ) : (
        <ul className="member-list">
          {members.map((m) => <li key={m.id}>{m.name}</li>)}
        </ul>
      )}
      {showAdd ? (
        <div className="inline-add">
          <input
            className="finput"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Member name"
            onKeyDown={(e) => e.key === "Enter" && addMember()}
          />
          <button className="back-btn" onClick={addMember}>Add</button>
          <button className="back-btn" onClick={() => setShowAdd(false)}>Cancel</button>
        </div>
      ) : (
        <button className="back-btn ref-add-btn" onClick={() => setShowAdd(true)}>+ list a member</button>
      )}
    </div>
  );
}

function ReferenceRow({ entry, franchiseNames, typeNames }) {
  return (
    <div className="ref-line">
      <span className="t">
        {entry.description}
        <span className="tile-spec" style={{ display: "block", marginTop: 3 }}>
          {[franchiseNames[entry.franchise_id], typeNames[entry.item_type_id]].filter(Boolean).join(" · ") || "general"}
        </span>
      </span>
      <span className="dc-refstatus">{entry.status.replaceAll("_", " ").toUpperCase()}</span>
    </div>
  );
}

export default function SetsReference({ franchises, itemTypes, franchiseNames, typeNames, ownerId }) {
  const [manifests, setManifests] = useState(null);
  const [references, setReferences] = useState(null);
  const [showNewSet, setShowNewSet] = useState(false);
  const [setName, setSetName] = useState("");
  const [setFranchiseId, setSetFranchiseId] = useState("");
  const [showNewRef, setShowNewRef] = useState(false);
  const [refDescription, setRefDescription] = useState("");
  const [refFranchiseId, setRefFranchiseId] = useState("");
  const [refTypeId, setRefTypeId] = useState("");

  function loadManifests() {
    fetch("/set-manifests").then((r) => r.json()).then(setManifests);
  }
  function loadReferences() {
    fetch("/hallmark-references").then((r) => r.json()).then(setReferences);
  }

  useEffect(() => {
    loadManifests();
    loadReferences();
  }, []);

  function createSet() {
    if (!setName.trim() || !setFranchiseId) return;
    fetch("/set-manifests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: setName.trim(), franchise_id: Number(setFranchiseId) }),
    }).then(() => {
      setSetName("");
      setSetFranchiseId("");
      setShowNewSet(false);
      loadManifests();
    });
  }

  function createReference() {
    if (!refDescription.trim()) return;
    fetch("/hallmark-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitted_by_user_id: ownerId,
        description: refDescription.trim(),
        franchise_id: refFranchiseId ? Number(refFranchiseId) : null,
        item_type_id: refTypeId ? Number(refTypeId) : null,
      }),
    }).then(() => {
      setRefDescription("");
      setRefFranchiseId("");
      setRefTypeId("");
      setShowNewRef(false);
      loadReferences();
    });
  }

  return (
    <div className="detail-wrap">
      <section className="intro-note">
        Editorial series definitions and the crowdsourced authenticity reference — both read-mostly
        for now. There's no way yet to mark which of your items fill a set's members, so this lists
        what exists without claiming to know what you own. Reference entries stay PENDING until the
        trust &amp; council review process exists.
      </section>

      <h3 className="section-head">Set manifests</h3>
      {manifests === null ? (
        <div className="wish-hit quiet">Loading…</div>
      ) : (
        <div className="ref-stack">
          {manifests.map((m) => (
            <SetCard key={m.id} manifest={m} franchiseNames={franchiseNames} />
          ))}
        </div>
      )}
      {showNewSet ? (
        <div className="ref-row">
          <div className="form-grid">
            <input className="finput" value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="Set name" />
            <select className="finput" value={setFranchiseId} onChange={(e) => setSetFranchiseId(e.target.value)}>
              <option value="">Franchise</option>
              {franchises.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <button className="add-btn" style={{ marginTop: 10 }} disabled={!setName.trim() || !setFranchiseId} onClick={createSet}>
            Create set
          </button>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setShowNewSet(true)}>+ New set</button>
      )}

      <h3 className="section-head">Hallmark reference</h3>
      {references === null ? (
        <div className="wish-hit quiet">Loading…</div>
      ) : references.length === 0 ? (
        <div className="wish-hit quiet">No entries yet</div>
      ) : (
        <div className="ref-row">
          {references.map((r) => (
            <ReferenceRow key={r.id} entry={r} franchiseNames={franchiseNames} typeNames={typeNames} />
          ))}
        </div>
      )}
      {showNewRef ? (
        <div className="ref-row">
          <div className="form-grid">
            <textarea
              className="finput"
              style={{ gridColumn: "1 / -1", minHeight: 70, resize: "vertical" }}
              value={refDescription}
              onChange={(e) => setRefDescription(e.target.value)}
              placeholder="Backstamp text, pin-back hardware, plating notes…"
            />
            <select className="finput" value={refFranchiseId} onChange={(e) => setRefFranchiseId(e.target.value)}>
              <option value="">Franchise (optional)</option>
              {franchises.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select className="finput" value={refTypeId} onChange={(e) => setRefTypeId(e.target.value)}>
              <option value="">Type (optional)</option>
              {itemTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button className="add-btn" style={{ marginTop: 10 }} disabled={!refDescription.trim()} onClick={createReference}>
            Submit reference
          </button>
        </div>
      ) : (
        <button className="add-btn" onClick={() => setShowNewRef(true)}>+ Submit reference</button>
      )}
    </div>
  );
}
