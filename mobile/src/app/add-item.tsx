import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, upload } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

type Lookup = { id: number; name: string };

export default function AddItem() {
  const { me } = useAuth();
  const router = useRouter();
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [name, setName] = useState("");
  const [franchises, setFranchises] = useState<Lookup[]>([]);
  const [franchiseId, setFranchiseId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [tradeStock, setTradeStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Lookup[]>("/franchises").then(setFranchises).catch(() => {});
  }, []);

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera needed", "Allow camera access to photograph the item.");
      return;
    }
    // quality<1 makes the picker re-encode as JPEG, which sidesteps
    // iPhone's HEIC default — the backend only accepts JPEG/PNG/WebP.
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!res.canceled) setPhoto(res.assets[0]);
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos needed", "Allow photo access to pick an image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!res.canceled) setPhoto(res.assets[0]);
  }

  async function save() {
    if (!me || !photo || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // 1. create the item
      const item = await api<{ id: number }>("/items", {
        method: "POST",
        body: JSON.stringify({
          owner_id: me.id,
          name: name.trim(),
          franchise_id: franchiseId,
          purchase_price: price.trim() ? price.trim() : null,
          trade_stock: tradeStock,
        }),
      });

      // 2. upload the photo (multipart — raw fetch, not the JSON helper)
      const form = new FormData();
      const uri = photo.uri;
      // Prefer the picker's own report; the file may be a re-encoded JPEG
      // even when the URI still says .heic (iOS libraries do this).
      const mime = photo.mimeType && photo.mimeType !== "image/heic" ? photo.mimeType : "image/jpeg";
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const filename = `photo-${Date.now()}.${ext}`;
      // React Native's FormData accepts { uri, name, type } for files.
      form.append("file", { uri, name: filename, type: mime } as any);
      form.append("photo_type", "item");
      await upload(`/items/${item.id}/photos`, form);

      router.replace("/curate");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!photo && name.trim().length > 0 && !saving;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.case }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>PHOTO — REQUIRED</Text>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={s.preview} />
        ) : (
          <View style={[s.preview, s.previewEmpty]}>
            <Text style={{ color: T.faint }}>No photo yet</Text>
          </View>
        )}
        <View style={s.row}>
          <Pressable style={s.secondary} onPress={takePhoto}>
            <Text style={s.secondaryText}>📷 Take photo</Text>
          </Pressable>
          <Pressable style={s.secondary} onPress={pickPhoto}>
            <Text style={s.secondaryText}>Choose from library</Text>
          </Pressable>
        </View>

        <Text style={s.label}>NAME</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. BlizzCon 2019 Murloc Pin"
          placeholderTextColor={T.faint}
        />

        <Text style={s.label}>FRANCHISE</Text>
        <View style={s.chips}>
          {franchises.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFranchiseId(franchiseId === f.id ? null : f.id)}
              style={[s.chip, franchiseId === f.id && s.chipOn]}
            >
              <Text style={[s.chipText, franchiseId === f.id && s.chipTextOn]}>{f.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>WHAT YOU PAID (OPTIONAL)</Text>
        <TextInput
          style={s.input}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          placeholderTextColor={T.faint}
          keyboardType="decimal-pad"
        />

        <View style={[s.row, { alignItems: "center", marginTop: 16 }]}>
          <Switch
            value={tradeStock}
            onValueChange={setTradeStock}
            trackColor={{ true: T.brassDeep, false: T.lineWarm }}
            thumbColor={T.cream}
          />
          <Text style={{ color: T.creamDim, marginLeft: 10 }}>Trade stock (offer in exchanges)</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.primary, !canSave && { opacity: 0.4 }]} onPress={save} disabled={!canSave}>
          <Text style={s.primaryText}>{saving ? "Saving…" : "Add to collection"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: T.muted, textAlign: "center" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 60 },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  preview: { width: "100%", height: 240, borderRadius: 10, backgroundColor: T.panelDeep },
  previewEmpty: {
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
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
  input: {
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 8,
    color: T.cream,
    fontSize: 16,
    padding: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 13 },
  chipTextOn: { color: T.ink, fontWeight: "600" },
  error: { color: "#d98a7b", marginTop: 14 },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
});
