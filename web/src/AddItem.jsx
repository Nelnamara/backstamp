import { useMemo, useState } from "react";

const STEPS = ["Photos", "Details", "Condition", "Provenance"];
const PHOTO_TYPES = ["item", "packaging", "coa", "condition", "other"];

function isPinType(typeName) {
  return (typeName ?? "").toLowerCase().includes("pin");
}

export default function AddItem({ franchises, itemTypes, rarities, ownerId, onSaved, onCancel }) {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]); // { file, previewUrl, photoType }
  const [name, setName] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");
  const [rarityId, setRarityId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [tradeStock, setTradeStock] = useState(false);
  const [redemptionStatus, setRedemptionStatus] = useState("not_applicable");

  const [moonGap, setMoonGap] = useState("none");
  const [pinBackOriginal, setPinBackOriginal] = useState(true);
  const [postStraightness, setPostStraightness] = useState("straight");
  const [enamelChipCount, setEnamelChipCount] = useState(0);
  const [setCondition, setSetCondition] = useState(false);

  const [proofType, setProofType] = useState("receipt");
  const [anchorPhotoIndex, setAnchorPhotoIndex] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const selectedTypeName = useMemo(
    () => itemTypes.find((t) => String(t.id) === String(itemTypeId))?.name,
    [itemTypes, itemTypeId]
  );
  const showConditionStep = isPinType(selectedTypeName);
  const visibleSteps = showConditionStep ? STEPS : STEPS.filter((s) => s !== "Condition");
  const currentLabel = visibleSteps[step];

  function addFiles(fileList) {
    const next = [...fileList].map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      photoType: photos.length === 0 ? "item" : "other",
    }));
    setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (anchorPhotoIndex === index) setAnchorPhotoIndex(null);
  }

  function goNext() {
    const idx = visibleSteps.indexOf(currentLabel);
    if (idx < visibleSteps.length - 1) setStep(STEPS.indexOf(visibleSteps[idx + 1]));
  }
  function goBack() {
    const idx = visibleSteps.indexOf(currentLabel);
    if (idx > 0) setStep(STEPS.indexOf(visibleSteps[idx - 1]));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const item = await fetch("/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          name,
          franchise_id: franchiseId ? Number(franchiseId) : null,
          item_type_id: itemTypeId ? Number(itemTypeId) : null,
          rarity_id: rarityId ? Number(rarityId) : null,
          purchase_price: purchasePrice || null,
          purchase_date: purchaseDate || null,
          trade_stock: tradeStock,
          redemption_status: redemptionStatus,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error("Couldn't save the item.");
        return r.json();
      });

      const uploadedPhotos = [];
      for (const p of photos) {
        const form = new FormData();
        form.append("file", p.file);
        form.append("photo_type", p.photoType);
        const uploaded = await fetch(`/items/${item.id}/photos`, { method: "POST", body: form }).then(
          (r) => {
            if (!r.ok) throw new Error("The item saved, but a photo upload failed.");
            return r.json();
          }
        );
        uploadedPhotos.push(uploaded);
      }

      if (showConditionStep && setCondition) {
        await fetch(`/items/${item.id}/pin-condition`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moon_gap: moonGap,
            pin_back_original: pinBackOriginal,
            post_straightness: postStraightness,
            enamel_chip_count: Number(enamelChipCount) || 0,
          }),
        });
      }

      if (anchorPhotoIndex !== null && uploadedPhotos[anchorPhotoIndex]) {
        await fetch(`/items/${item.id}/provenance-anchors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof_type: proofType,
            photo_id: uploadedPhotos[anchorPhotoIndex].id,
          }),
        });
      }

      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      onSaved(item.id);
    } catch (err) {
      setSaveError(err.message || "Something went wrong saving this item.");
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && photos.length > 0 && !saving;

  return (
    <div className="detail-wrap">
      <div className="back-row">
        <button className="back-btn" onClick={onCancel} disabled={saving}>
          ← Cancel
        </button>
        <button className="add-btn" onClick={handleSave} disabled={!canSave} title={
          photos.length === 0 ? "At least one photo is required" : name.trim() ? undefined : "Name is required"
        }>
          {saving ? "Saving…" : "Save · assigns a catalog number"}
        </button>
      </div>

      <div className="steps">
        {visibleSteps.map((s, i) => (
          <button
            key={s}
            type="button"
            className={`step-chip ${s === currentLabel ? "on" : ""}`}
            onClick={() => setStep(STEPS.indexOf(s))}
          >
            {i + 1} · {s.toUpperCase()}
          </button>
        ))}
      </div>

      {saveError && (
        <div className="state error" style={{ padding: "16px 0" }}>
          <p className="state-sub">{saveError}</p>
        </div>
      )}

      <div className="add-body">
        {currentLabel === "Photos" && (
          <>
            <label className="dropzone">
              <div className="big">Drop photos here, or tap to shoot</div>
              <div className="small">
                At least one photo is required — every item in the case is a real, photographed
                object. GPS &amp; camera metadata are stripped automatically before anything is
                stored.
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                capture="environment"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
            {photos.length > 0 && (
              <div className="photo-picks">
                {photos.map((p, i) => (
                  <div className="photo-pick" key={p.previewUrl}>
                    <div className="pick-thumb" style={{ backgroundImage: `url(${p.previewUrl})` }} />
                    <select
                      value={p.photoType}
                      onChange={(e) =>
                        setPhotos((prev) =>
                          prev.map((row, idx) => (idx === i ? { ...row, photoType: e.target.value } : row))
                        )
                      }
                    >
                      {PHOTO_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button className="pick-remove" onClick={() => removePhoto(i)} title="Remove">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {currentLabel === "Details" && (
          <div className="form-grid">
            <label className="field">
              <span className="flabel">Name</span>
              <input className="finput" value={name} onChange={(e) => setName(e.target.value)} placeholder="What is it?" />
            </label>
            <label className="field">
              <span className="flabel">Franchise</span>
              <select className="finput" value={franchiseId} onChange={(e) => setFranchiseId(e.target.value)}>
                <option value="">—</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="flabel">Type</span>
              <select className="finput" value={itemTypeId} onChange={(e) => setItemTypeId(e.target.value)}>
                <option value="">—</option>
                {itemTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="flabel">Rarity</span>
              <select className="finput" value={rarityId} onChange={(e) => setRarityId(e.target.value)}>
                <option value="">—</option>
                {rarities.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="flabel">Purchase price</span>
              <input className="finput" type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="$" />
            </label>
            <label className="field">
              <span className="flabel">Purchase date</span>
              <input className="finput" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </label>
            <label className="field">
              <span className="flabel">Redemption code</span>
              <select className="finput" value={redemptionStatus} onChange={(e) => setRedemptionStatus(e.target.value)}>
                <option value="not_applicable">Not applicable</option>
                <option value="unredeemed">Unredeemed</option>
                <option value="redeemed">Redeemed</option>
                <option value="redeemed_elsewhere">Redeemed elsewhere</option>
                <option value="orphaned">Orphaned</option>
              </select>
            </label>
            <label className="field checkbox-field">
              <input type="checkbox" checked={tradeStock} onChange={(e) => setTradeStock(e.target.checked)} />
              <span>Trade stock — show in exchanges</span>
            </label>
          </div>
        )}

        {currentLabel === "Condition" && (
          <div className="form-grid">
            <label className="field checkbox-field">
              <input type="checkbox" checked={setCondition} onChange={(e) => setSetCondition(e.target.checked)} />
              <span>Record pin condition now (you can add this later instead)</span>
            </label>
            {setCondition && (
              <>
                <label className="field">
                  <span className="flabel">Moon gap</span>
                  <select className="finput" value={moonGap} onChange={(e) => setMoonGap(e.target.value)}>
                    <option value="none">None</option>
                    <option value="slight">Slight</option>
                    <option value="moderate">Moderate</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
                <label className="field">
                  <span className="flabel">Post straightness</span>
                  <select className="finput" value={postStraightness} onChange={(e) => setPostStraightness(e.target.value)}>
                    <option value="straight">Straight</option>
                    <option value="bent">Bent</option>
                    <option value="replaced">Replaced</option>
                  </select>
                </label>
                <label className="field checkbox-field">
                  <input type="checkbox" checked={pinBackOriginal} onChange={(e) => setPinBackOriginal(e.target.checked)} />
                  <span>Pin back / clutch is original</span>
                </label>
                <label className="field">
                  <span className="flabel">Enamel chip count</span>
                  <input className="finput" type="number" min="0" value={enamelChipCount} onChange={(e) => setEnamelChipCount(e.target.value)} />
                </label>
              </>
            )}
          </div>
        )}

        {currentLabel === "Provenance" && (
          <div className="form-grid">
            <p className="state-sub" style={{ textAlign: "left", margin: "0 0 12px" }}>
              Optional — anchor a proof photo now, timestamped the moment you save. This can't be
              edited or backdated later, by design.
            </p>
            {photos.length === 0 ? (
              <p className="state-sub" style={{ textAlign: "left" }}>Add a photo first to anchor provenance to it.</p>
            ) : (
              <>
                <label className="field">
                  <span className="flabel">Proof type</span>
                  <select className="finput" value={proofType} onChange={(e) => setProofType(e.target.value)}>
                    <option value="receipt">Receipt</option>
                    <option value="order_confirmation">Order confirmation</option>
                    <option value="badge_photo">Badge photo</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="field">
                  <span className="flabel">Anchor which photo?</span>
                  <select
                    className="finput"
                    value={anchorPhotoIndex ?? ""}
                    onChange={(e) => setAnchorPhotoIndex(e.target.value === "" ? null : Number(e.target.value))}
                  >
                    <option value="">Don't anchor provenance yet</option>
                    {photos.map((p, i) => (
                      <option key={p.previewUrl} value={i}>
                        Photo {i + 1} ({p.photoType})
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        )}
      </div>

      <div className="wizard-nav">
        <button className="back-btn" onClick={goBack} disabled={visibleSteps.indexOf(currentLabel) === 0}>
          Back
        </button>
        <button className="back-btn" onClick={goNext} disabled={visibleSteps.indexOf(currentLabel) === visibleSteps.length - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
