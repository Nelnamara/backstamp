import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api, photoUrl, upload } from "../../api";
import { T } from "../../theme";

const PROOF_TYPES = [
  { key: "receipt", label: "RECEIPT" },
  { key: "order_confirmation", label: "ORDER CONF." },
  { key: "badge_photo", label: "BADGE PHOTO" },
  { key: "other", label: "OTHER" },
];

type Photo = { id: number; photo_type: string; file_path: string };
type Anchor = { id: number; proof_type: string; photo_id: number; app_timestamp: string };

export default function ProvenanceEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const router = useRouter();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [proofType, setProofType] = useState("receipt");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ph, an] = await Promise.all([
        api<Photo[]>(`/items/${itemId}/photos`).catch(() => []),
        api<Anchor[]>(`/items/${itemId}/provenance-anchors`).catch(() => []),
      ]);
      setPhotos(ph);
      setAnchors(an);
      setSelected((prev) => (ph.some((p) => p.id === prev) ? prev : null));
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function shootProof(fromCamera: boolean) {
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
      form.append("file", { uri: asset.uri, name: `proof-${Date.now()}.${ext}`, type: mime } as any);
      // proof shots ride under the COA/other bucket so they're distinguishable
      form.append("photo_type", "coa");
      const created = await upload(`/items/${itemId}/photos`, form);
      await load();
      setSelected(created?.id ?? null);
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function anchorIt() {
    if (selected == null) return;
    setBusy(true);
    try {
      await api(`/items/${itemId}/provenance-anchors`, {
        method: "POST",
        body: JSON.stringify({ proof_type: proofType, photo_id: selected }),
      });
      await load();
      Alert.alert(
        "Anchored",
        "The app stamped this claim with the current time. That timestamp can never be edited — that's the point."
      );
    } catch (e: any) {
      Alert.alert("Couldn't anchor", e.message);
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(a: Anchor) {
    Alert.alert("Remove this anchor?", "The proof photo stays; only the anchor is removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/items/${itemId}/provenance-anchors/${a.id}`, { method: "DELETE" });
            await load();
          } catch (e: any) {
            Alert.alert("Couldn't remove", e.message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.brass} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.case }} contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
      <Text style={s.intro}>
        Attach proof of where this came from — a receipt, order confirmation, or badge photo. The app
        timestamps it and that timestamp is never editable, because *when* a claim was made is harder
        to fake later than the object itself.
      </Text>

      {anchors.length > 0 && (
        <>
          <Text style={s.label}>ALREADY ANCHORED</Text>
          {anchors.map((a) => {
            const p = photos.find((x) => x.id === a.photo_id);
            return (
              <Pressable key={a.id} style={s.anchorRow} onLongPress={() => confirmRemove(a)}>
                {p ? <Image source={{ uri: photoUrl(p.file_path) }} style={s.anchorThumb} /> : <View style={s.anchorThumb} />}
                <View style={{ flex: 1 }}>
                  <Text style={s.anchorType}>{a.proof_type.replaceAll("_", " ").toUpperCase()}</Text>
                  <Text style={s.anchorTime}>{a.app_timestamp.replace("T", " ").slice(0, 16)} UTC</Text>
                </View>
              </Pressable>
            );
          })}
          <Text style={s.hint}>Long-press an anchor to remove it</Text>
        </>
      )}

      <Text style={s.label}>1 — THE PROOF PHOTO</Text>
      {photos.length === 0 ? (
        <Text style={s.help}>No photos on this item yet. Shoot the receipt or paperwork first.</Text>
      ) : (
        <>
          <Text style={s.help}>Pick which photo is the proof.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {photos.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelected(p.id)}
                style={[s.thumbWrap, selected === p.id && s.thumbOn]}
              >
                <Image source={{ uri: photoUrl(p.file_path) }} style={s.thumb} />
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      <View style={s.row}>
        <Pressable style={s.secondary} onPress={() => shootProof(true)} disabled={busy}>
          <Text style={s.secondaryText}>📷 Shoot proof</Text>
        </Pressable>
        <Pressable style={s.secondary} onPress={() => shootProof(false)} disabled={busy}>
          <Text style={s.secondaryText}>Library</Text>
        </Pressable>
      </View>

      <Text style={s.label}>2 — WHAT KIND OF PROOF</Text>
      <View style={s.chips}>
        {PROOF_TYPES.map((t) => (
          <Pressable key={t.key} onPress={() => setProofType(t.key)} style={[s.chip, proofType === t.key && s.chipOn]}>
            <Text style={[s.chipText, proofType === t.key && s.chipTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[s.primary, (selected == null || busy) && { opacity: 0.4 }]}
        onPress={anchorIt}
        disabled={selected == null || busy}
      >
        <Text style={s.primaryText}>{busy ? "Working…" : "Anchor this proof"}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
        <Text style={{ color: T.muted, textAlign: "center" }}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: T.case, alignItems: "center", justifyContent: "center" },
  intro: { color: T.muted, fontSize: 13, lineHeight: 19 },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 24, marginBottom: 4 },
  help: { color: T.faint, fontSize: 11 },
  hint: { color: T.faint, fontSize: 11, marginTop: 6 },
  thumbWrap: { marginRight: 8, borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
  thumbOn: { borderColor: T.brass },
  thumb: { width: 64, height: 64, borderRadius: 4, backgroundColor: T.panelDeep },
  anchorRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: T.panel,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  anchorThumb: { width: 40, height: 40, borderRadius: 4, backgroundColor: T.panelDeep },
  anchorType: { color: T.cream, fontSize: 13, fontWeight: "600" },
  anchorTime: { color: T.faint, fontSize: 11, marginTop: 2 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  secondary: {
    flex: 1,
    borderColor: T.lineBrass,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryText: { color: T.brassBright, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 28 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
});
