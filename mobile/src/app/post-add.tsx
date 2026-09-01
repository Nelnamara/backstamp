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
  Text,
  TextInput,
  View,
} from "react-native";

import { api, photoUrl } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

const POST_TYPES = [
  { key: "showcase", label: "SHOWCASE", blurb: "Show off what you've got" },
  { key: "trade", label: "TRADE", blurb: "Offer something up" },
  { key: "seeking", label: "SEEKING", blurb: "Ask if anyone has it" },
];

type Item = { id: number; name: string };

export default function PostAdd() {
  const { me } = useAuth();
  const router = useRouter();
  const [postType, setPostType] = useState("showcase");
  const [caption, setCaption] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [picked, setPicked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    api<Item[]>(`/items?owner_id=${me.id}&limit=500`)
      .then(async (its) => {
        setItems(its);
        const pairs = await Promise.all(
          its.map(async (i) => {
            const ph = await api<{ file_path: string; photo_type: string }[]>(`/items/${i.id}/photos`).catch(
              () => []
            );
            const primary = ph.find((p) => p.photo_type === "item") ?? ph[0];
            return [i.id, primary ? photoUrl(primary.file_path) : ""] as const;
          })
        );
        setThumbs(Object.fromEntries(pairs.filter(([, u]) => u)));
      })
      .catch(() => {});
  }, [me]);

  function toggle(id: number) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function post() {
    if (!me || !caption.trim()) return;
    setSaving(true);
    try {
      await api("/community-posts", {
        method: "POST",
        body: JSON.stringify({
          user_id: me.id,
          post_type: postType,
          caption: caption.trim(),
          item_ids: picked,
        }),
      });
      router.replace("/connect");
    } catch (e: any) {
      Alert.alert("Couldn't post", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.case }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>POST TYPE</Text>
        <View style={s.chips}>
          {POST_TYPES.map((p) => (
            <Pressable key={p.key} onPress={() => setPostType(p.key)} style={[s.chip, postType === p.key && s.chipOn]}>
              <Text style={[s.chipText, postType === p.key && s.chipTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.help}>{POST_TYPES.find((p) => p.key === postType)?.blurb}</Text>

        <Text style={s.label}>CAPTION</Text>
        <TextInput
          style={[s.input, { minHeight: 80 }]}
          value={caption}
          onChangeText={setCaption}
          placeholder="e.g. Finally completed the 2019 Murloc set"
          placeholderTextColor={T.faint}
          multiline
        />

        <Text style={s.label}>ATTACH YOUR ITEMS (OPTIONAL)</Text>
        {items.length === 0 ? (
          <Text style={s.help}>Nothing in your collection to attach yet.</Text>
        ) : (
          <View style={s.grid}>
            {items.map((i) => {
              const on = picked.includes(i.id);
              return (
                <Pressable key={i.id} onPress={() => toggle(i.id)} style={[s.card, on && s.cardOn]}>
                  {thumbs[i.id] ? (
                    <Image source={{ uri: thumbs[i.id] }} style={s.cardImg} />
                  ) : (
                    <View style={[s.cardImg, { borderColor: T.lineWarm, borderWidth: 1 }]} />
                  )}
                  <Text style={[s.cardName, on && { color: T.brassBright }]} numberOfLines={2}>
                    {i.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          style={[s.primary, (!caption.trim() || saving) && { opacity: 0.4 }]}
          onPress={post}
          disabled={!caption.trim() || saving}
        >
          <Text style={s.primaryText}>{saving ? "Posting…" : "Post to community"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: T.muted, textAlign: "center" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 20, marginBottom: 6 },
  help: { color: T.faint, fontSize: 11, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  input: {
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 8,
    color: T.cream,
    fontSize: 16,
    padding: 12,
    textAlignVertical: "top",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: 96, borderRadius: 8, borderWidth: 2, borderColor: "transparent", padding: 4 },
  cardOn: { borderColor: T.brass },
  cardImg: { width: "100%", height: 78, borderRadius: 5, backgroundColor: T.panelDeep },
  cardName: { color: T.creamDim, fontSize: 11, marginTop: 4 },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 28 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
});
