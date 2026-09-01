import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, photoUrl, upload } from "../../api";
import { T } from "../../theme";

type Item = {
  id: number;
  name: string;
  franchise_id: number | null;
  item_type_id: number | null;
  rarity_id: number | null;
  purchase_price: string | null;
  purchase_date: string | null;
  redemption_status: string;
  exclusive_channel: string | null;
  trade_stock: boolean;
  edition_number: number | null;
  edition_total: number | null;
  created_at: string;
};
type Photo = { id: number; photo_type: string; file_path: string };
type ValueRow = { id: number; value: string; recorded_at: string };
type PinCondition = {
  moon_gap: string;
  pin_back_original: boolean;
  post_straightness: string;
  enamel_chip_count: number;
};
type Anchor = { id: number; proof_type: string; app_timestamp: string };
type Signature = { id: number; guest_name: string; convention_name: string; convention_date: string };
type Lookup = { id: number; name: string };

const PHOTO_TYPES = [
  { key: "item", label: "ITEM" },
  { key: "packaging", label: "BOX" },
  { key: "coa", label: "COA" },
  { key: "condition", label: "COND" },
];

function money(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function catalogNo(id: number) {
  return `NO. ${String(id).padStart(4, "0")}`;
}

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [active, setActive] = useState<Photo | null>(null);
  const [values, setValues] = useState<ValueRow[]>([]);
  const [pin, setPin] = useState<PinCondition | null>(null);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [sigs, setSigs] = useState<Signature[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [franchises, setFranchises] = useState<Lookup[]>([]);
  const [types, setTypes] = useState<Lookup[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [valueDraft, setValueDraft] = useState("");
  const [photoType, setPhotoType] = useState("item");
  const [busy, setBusy] = useState(false);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eFranchise, setEFranchise] = useState<number | null>(null);
  const [eTrade, setETrade] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const opt = <X,>(p: Promise<X>, fallback: X) => p.catch(() => fallback);
    try {
      const it = await api<Item>(`/items/${itemId}`);
      setItem(it);
      const [ph, vh, pc, an, sg, tg, fr, ty] = await Promise.all([
        opt(api<Photo[]>(`/items/${itemId}/photos`), []),
        opt(api<ValueRow[]>(`/items/${itemId}/value-history`), []),
        opt(api<PinCondition | null>(`/items/${itemId}/pin-condition`), null),
        opt(api<Anchor[]>(`/items/${itemId}/provenance-anchors`), []),
        opt(api<Signature[]>(`/items/${itemId}/guest-signatures`), []),
        opt(api<string[]>(`/items/${itemId}/tags`), []),
        opt(api<Lookup[]>(`/franchises`), []),
        opt(api<Lookup[]>(`/item-types`), []),
      ]);
      setPhotos(ph);
      setActive((prev) => ph.find((p) => p.id === prev?.id) ?? ph.find((p) => p.photo_type === "item") ?? ph[0] ?? null);
      setValues(vh);
      setPin(pc);
      setAnchors(an);
      setSigs(sg);
      setTags(tg);
      setFranchises(fr);
      setTypes(ty);
    } catch (e: any) {
      setError(e.message ?? "Couldn't load this item.");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function startEdit() {
    if (!item) return;
    setEName(item.name);
    setEPrice(item.purchase_price ?? "");
    setEFranchise(item.franchise_id);
    setETrade(item.trade_stock);
    setEditing(true);
  }

  async function saveEdit() {
    setBusy(true);
    try {
      const updated = await api<Item>(`/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: eName.trim(),
          franchise_id: eFranchise,
          purchase_price: ePrice.trim() ? ePrice.trim() : null,
          trade_stock: eTrade,
        }),
      });
      setItem(updated);
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete item?", `"${item?.name}" and its photos. This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/items/${itemId}`, { method: "DELETE" });
            router.replace("/curate");
          } catch (e: any) {
            Alert.alert("Couldn't delete", e.message);
          }
        },
      },
    ]);
  }

  async function addPhoto(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", fromCamera ? "Allow camera access." : "Allow photo access.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled) return;

    const asset = res.assets[0];
    setBusy(true);
    try {
      const mime = asset.mimeType && asset.mimeType !== "image/heic" ? asset.mimeType : "image/jpeg";
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: `photo-${Date.now()}.${ext}`, type: mime } as any);
      form.append("photo_type", photoType);
      await upload(`/items/${itemId}/photos`, form);
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmRemovePhoto(photo: Photo) {
    Alert.alert("Remove this photo?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/items/${itemId}/photos/${photo.id}`, { method: "DELETE" });
            await load();
          } catch (e: any) {
            Alert.alert("Couldn't remove", e.message);
          }
        },
      },
    ]);
  }

  async function addTag() {
    const name = tagDraft.trim();
    if (!name) return;
    try {
      const updated = await api<string[]>(`/items/${itemId}/tags/${encodeURIComponent(name)}`, {
        method: "POST",
      });
      setTags(updated);
      setTagDraft("");
    } catch (e: any) {
      Alert.alert("Couldn't add tag", e.message);
    }
  }

  async function removeTag(name: string) {
    try {
      const updated = await api<string[]>(`/items/${itemId}/tags/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      setTags(updated);
    } catch (e: any) {
      Alert.alert("Couldn't remove tag", e.message);
    }
  }

  async function logValue() {
    const v = valueDraft.trim();
    if (!v) return;
    setBusy(true);
    try {
      await api(`/items/${itemId}/value-history`, {
        method: "POST",
        body: JSON.stringify({ value: v }),
      });
      setValueDraft("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't log value", e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !item) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.brass} />
      </View>
    );
  }
  if (error || !item) {
    return (
      <View style={s.center}>
        <Text style={{ color: "#d98a7b", textAlign: "center" }}>{error ?? "Not found."}</Text>
      </View>
    );
  }

  const franchiseName = franchises.find((f) => f.id === item.franchise_id)?.name;
  const typeName = types.find((t) => t.id === item.item_type_id)?.name;
  const spec = [typeName, franchiseName, item.exclusive_channel?.replaceAll("_", " ")]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
  const latest = values.length ? Number(values[values.length - 1].value) : null;
  const paid = item.purchase_price ? Number(item.purchase_price) : null;
  const maxVal = values.length ? Math.max(...values.map((v) => Number(v.value))) : 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.case }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.brass} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- photo stage ---- */}
        {active ? (
          <Image source={{ uri: photoUrl(active.file_path) }} style={s.stage} resizeMode="contain" />
        ) : (
          <View style={[s.stage, s.stageEmpty]}>
            <Text style={{ color: T.faint }}>No photo</Text>
          </View>
        )}

        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {photos.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setActive(p)}
                onLongPress={() => confirmRemovePhoto(p)}
                style={[s.thumbWrap, active?.id === p.id && s.thumbOn]}
              >
                <Image source={{ uri: photoUrl(p.file_path) }} style={s.thumb} />
                <Text style={s.thumbLabel}>
                  {PHOTO_TYPES.find((t) => t.key === p.photo_type)?.label ?? "MISC"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {photos.length > 0 && <Text style={s.hint}>Long-press a thumbnail to remove it</Text>}

        {/* ---- add photo ---- */}
        <Text style={s.label}>ADD A PHOTO AS</Text>
        <View style={s.chips}>
          {PHOTO_TYPES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setPhotoType(t.key)}
              style={[s.chip, photoType === t.key && s.chipOn]}
            >
              <Text style={[s.chipText, photoType === t.key && s.chipTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.row}>
          <Pressable style={s.secondary} onPress={() => addPhoto(true)} disabled={busy}>
            <Text style={s.secondaryText}>📷 Camera</Text>
          </Pressable>
          <Pressable style={s.secondary} onPress={() => addPhoto(false)} disabled={busy}>
            <Text style={s.secondaryText}>Library</Text>
          </Pressable>
        </View>

        {/* ---- the accession card ---- */}
        <View style={s.card}>
          <Text style={s.accNo}>
            {catalogNo(item.id)} · ACCESSIONED {item.created_at.slice(0, 10)}
          </Text>

          {editing ? (
            <>
              <Text style={s.cardLabel}>NAME</Text>
              <TextInput style={s.cardInput} value={eName} onChangeText={setEName} />
              <Text style={s.cardLabel}>FRANCHISE</Text>
              <View style={s.chips}>
                {franchises.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => setEFranchise(eFranchise === f.id ? null : f.id)}
                    style={[s.chipLight, eFranchise === f.id && s.chipOn]}
                  >
                    <Text style={[s.chipTextDark, eFranchise === f.id && s.chipTextOn]}>{f.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={s.cardLabel}>WHAT YOU PAID</Text>
              <TextInput
                style={s.cardInput}
                value={ePrice}
                onChangeText={setEPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              <View style={[s.row, { alignItems: "center", marginTop: 14 }]}>
                <Switch
                  value={eTrade}
                  onValueChange={setETrade}
                  trackColor={{ true: T.brassDeep, false: "#c9bfa9" }}
                />
                <Text style={{ color: "#4a4230", marginLeft: 10 }}>Trade stock</Text>
              </View>
              <View style={s.row}>
                <Pressable style={s.cardGhost} onPress={() => setEditing(false)} disabled={busy}>
                  <Text style={s.cardGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={s.cardPrimary} onPress={saveEdit} disabled={busy || !eName.trim()}>
                  <Text style={s.cardPrimaryText}>{busy ? "Saving…" : "Save"}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={s.accName}>{item.name}</Text>
              <Text style={s.accSub}>{spec || "UNCATALOGED"}</Text>

              <View style={s.sec}>
                <Text style={s.secLabel}>STATUS</Text>
                <Line k="Trade stock" v={item.trade_stock ? "YES — SHOWN IN EXCHANGES" : "NO — KEEP"} />
                {item.redemption_status !== "not_applicable" && (
                  <Line k="Redemption code" v={item.redemption_status.replaceAll("_", " ").toUpperCase()} />
                )}
                {item.edition_number != null && item.edition_total != null && (
                  <Line k="Numbered" v={`${item.edition_number} / ${item.edition_total}`} />
                )}
              </View>

              <Pressable style={s.sec} onPress={() => router.push(`/condition/${itemId}`)}>
                <Text style={s.secLabel}>CONDITION — PIN</Text>
                {pin ? (
                  <>
                    <Line k="Moon gap" v={pin.moon_gap.toUpperCase()} />
                    <Line k="Pin back" v={pin.pin_back_original ? "ORIGINAL" : "REPLACED"} />
                    <Line k="Posts / chips" v={`${pin.post_straightness.toUpperCase()} · ${pin.enamel_chip_count}`} />
                    <Text style={s.tapHint}>Tap to update</Text>
                  </>
                ) : (
                  <Text style={s.tapHint}>Not recorded — tap to set moon gap, back, posts, chips</Text>
                )}
              </Pressable>

              <Pressable style={s.sec} onPress={() => router.push(`/provenance/${itemId}`)}>
                <Text style={s.secLabel}>PROVENANCE</Text>
                {anchors.length === 0 && sigs.length === 0 && (
                  <Text style={s.tapHint}>No proof attached — tap to anchor a receipt or badge photo</Text>
                )}
                {anchors.map((a) => (
                  <Line
                    key={a.id}
                    k={`${a.proof_type.replaceAll("_", " ")} anchored`}
                    v={a.app_timestamp.replace("T", " ").slice(0, 16)}
                  />
                ))}
                {sigs.map((g) => (
                  <Line key={g.id} k={`Signed — ${g.guest_name}, ${g.convention_name}`} v={g.convention_date} />
                ))}
                {(anchors.length > 0 || sigs.length > 0) && <Text style={s.tapHint}>Tap to add more proof</Text>}
              </Pressable>

              <View style={s.sec}>
                <Text style={s.secLabel}>
                  VALUE{paid ? ` — PAID ${money(paid)}` : ""}
                  {latest !== null && latest !== paid ? ` → NOW ${money(latest)}` : ""}
                </Text>
                {values.length > 0 ? (
                  <View style={s.spark}>
                    {values.map((v) => (
                      <View
                        key={v.id}
                        style={[s.sparkBar, { height: Math.max(6, (Number(v.value) / maxVal) * 54) }]}
                      />
                    ))}
                  </View>
                ) : (
                  <Line k="No value logged yet" />
                )}
                <View style={[s.row, { marginTop: 10 }]}>
                  <TextInput
                    style={[s.cardInput, { flex: 1 }]}
                    value={valueDraft}
                    onChangeText={setValueDraft}
                    placeholder="What's it worth now?"
                    placeholderTextColor="#9c9078"
                    keyboardType="decimal-pad"
                  />
                  <Pressable style={s.cardPrimary} onPress={logValue} disabled={busy || !valueDraft.trim()}>
                    <Text style={s.cardPrimaryText}>Log</Text>
                  </Pressable>
                </View>
              </View>

              <View style={s.sec}>
                <Text style={s.secLabel}>TAGS</Text>
                <View style={s.chips}>
                  {tags.map((t) => (
                    <Pressable key={t} onPress={() => removeTag(t)} style={s.tagChip}>
                      <Text style={s.tagChipText}>{t} ✕</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[s.row, { marginTop: 8 }]}>
                  <TextInput
                    style={[s.cardInput, { flex: 1 }]}
                    value={tagDraft}
                    onChangeText={setTagDraft}
                    placeholder="add a tag"
                    placeholderTextColor="#9c9078"
                    autoCapitalize="none"
                    onSubmitEditing={addTag}
                  />
                  <Pressable style={s.cardPrimary} onPress={addTag} disabled={!tagDraft.trim()}>
                    <Text style={s.cardPrimaryText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>

        {!editing && (
          <View style={s.row}>
            <Pressable style={s.danger} onPress={confirmDelete}>
              <Text style={s.dangerText}>Delete item</Text>
            </Pressable>
            <Pressable style={s.primary} onPress={startEdit}>
              <Text style={s.primaryText}>Edit</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Line({ k, v }: { k: string; v?: string }) {
  return (
    <View style={s.line}>
      <Text style={s.lineK}>{k}</Text>
      {v ? <Text style={s.lineV}>{v}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: T.case, alignItems: "center", justifyContent: "center", padding: 24 },
  stage: { width: "100%", height: 280, borderRadius: 10, backgroundColor: T.panelDeep },
  stageEmpty: {
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbWrap: { marginRight: 8, borderRadius: 6, borderWidth: 1, borderColor: T.lineWarm, overflow: "hidden" },
  thumbOn: { borderColor: T.brass },
  thumb: { width: 56, height: 56, backgroundColor: T.panelDeep },
  thumbLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    fontSize: 8,
    textAlign: "center",
    color: T.cream,
    backgroundColor: "rgba(20,16,12,0.8)",
  },
  hint: { color: T.faint, fontSize: 11, marginTop: 6 },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipLight: { borderColor: "#c9bfa9", borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextDark: { color: "#4a4230", fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  secondary: {
    flex: 1,
    borderColor: T.lineBrass,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryText: { color: T.brassBright, fontSize: 14 },

  card: { backgroundColor: "#fbf8f0", borderRadius: 10, padding: 18, marginTop: 22 },
  accNo: { fontSize: 10, letterSpacing: 1, color: "#9e3b2f" },
  accName: { fontSize: 22, fontWeight: "700", color: "#2a2620", marginTop: 4 },
  accSub: { fontSize: 11, color: "#6b6152", marginTop: 2, marginBottom: 6 },
  sec: { borderTopColor: "#c9bfa9", borderTopWidth: 1, borderStyle: "dashed", paddingTop: 10, marginTop: 12 },
  secLabel: { fontSize: 9, letterSpacing: 1, color: "#9c9078", marginBottom: 6 },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, gap: 12 },
  lineK: { color: "#4a4230", fontSize: 13, flexShrink: 1 },
  lineV: { color: "#2a2620", fontSize: 12, fontWeight: "600", textAlign: "right" },
  tapHint: { color: "#9e3b2f", fontSize: 11, marginTop: 6 },
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 56 },
  sparkBar: { flex: 1, maxWidth: 14, backgroundColor: T.brassDeep, borderRadius: 1 },
  cardLabel: { fontSize: 9, letterSpacing: 1, color: "#9c9078", marginTop: 12, marginBottom: 5 },
  cardInput: {
    backgroundColor: "#fff",
    borderColor: "#c9bfa9",
    borderWidth: 1,
    borderRadius: 6,
    color: "#2a2620",
    fontSize: 16,
    padding: 10,
  },
  cardPrimary: { backgroundColor: T.brass, borderRadius: 6, paddingHorizontal: 16, justifyContent: "center" },
  cardPrimaryText: { color: T.ink, fontWeight: "700" },
  cardGhost: {
    flex: 1,
    borderColor: "#c9bfa9",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 11,
    alignItems: "center",
  },
  cardGhostText: { color: "#6b6152" },
  tagChip: { backgroundColor: "#efe8d6", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  tagChipText: { color: "#4a4230", fontSize: 12 },

  primary: { flex: 1, backgroundColor: T.brass, borderRadius: 8, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
  danger: {
    flex: 1,
    borderColor: "#6b3a32",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  dangerText: { color: "#c97a6e", fontSize: 15 },
});
