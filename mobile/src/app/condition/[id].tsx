import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../../api";
import { T } from "../../theme";

const MOON_GAP = [
  { key: "none", label: "NONE" },
  { key: "slight", label: "SLIGHT" },
  { key: "moderate", label: "MODERATE" },
  { key: "wide", label: "WIDE" },
];

const POSTS = [
  { key: "straight", label: "STRAIGHT" },
  { key: "bent", label: "BENT" },
  { key: "replaced", label: "REPLACED" },
];

type Cond = {
  moon_gap: string;
  pin_back_original: boolean;
  post_straightness: string;
  enamel_chip_count: number;
};

export default function ConditionEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(false);
  const [moonGap, setMoonGap] = useState("none");
  const [backOriginal, setBackOriginal] = useState(true);
  const [posts, setPosts] = useState("straight");
  const [chips, setChips] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Cond>(`/items/${itemId}/pin-condition`)
      .then((c) => {
        setExisting(true);
        setMoonGap(c.moon_gap);
        setBackOriginal(c.pin_back_original);
        setPosts(c.post_straightness);
        setChips(String(c.enamel_chip_count));
      })
      .catch(() => setExisting(false))
      .finally(() => setLoading(false));
  }, [itemId]);

  async function save() {
    setSaving(true);
    try {
      await api(`/items/${itemId}/pin-condition`, {
        method: "PUT",
        body: JSON.stringify({
          moon_gap: moonGap,
          pin_back_original: backOriginal,
          post_straightness: posts,
          enamel_chip_count: Number(chips) || 0,
        }),
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmClear() {
    Alert.alert("Clear condition?", "Removes the condition record for this item.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/items/${itemId}/pin-condition`, { method: "DELETE" });
            router.back();
          } catch (e: any) {
            Alert.alert("Couldn't clear", e.message);
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
        The vocabulary pin traders actually use — not Mint/Good/Poor. Update it later as condition
        changes (a chip forms, a back gets swapped).
      </Text>

      <Text style={s.label}>MOON GAP</Text>
      <Text style={s.help}>Gap between the pin and the backing where the enamel pulls away.</Text>
      <View style={s.chips}>
        {MOON_GAP.map((m) => (
          <Pressable key={m.key} onPress={() => setMoonGap(m.key)} style={[s.chip, moonGap === m.key && s.chipOn]}>
            <Text style={[s.chipText, moonGap === m.key && s.chipTextOn]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>POST STRAIGHTNESS</Text>
      <View style={s.chips}>
        {POSTS.map((p) => (
          <Pressable key={p.key} onPress={() => setPosts(p.key)} style={[s.chip, posts === p.key && s.chipOn]}>
            <Text style={[s.chipText, posts === p.key && s.chipTextOn]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.row, { alignItems: "center", marginTop: 20 }]}>
        <Switch
          value={backOriginal}
          onValueChange={setBackOriginal}
          trackColor={{ true: T.brassDeep, false: T.lineWarm }}
          thumbColor={T.cream}
        />
        <Text style={{ color: T.creamDim, marginLeft: 10 }}>Original pin back / clutch</Text>
      </View>

      <Text style={s.label}>ENAMEL CHIP COUNT</Text>
      <TextInput
        style={s.input}
        value={chips}
        onChangeText={setChips}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={T.faint}
      />

      <Pressable style={s.primary} onPress={save} disabled={saving}>
        <Text style={s.primaryText}>{saving ? "Saving…" : existing ? "Update condition" : "Set condition"}</Text>
      </Pressable>

      {existing && (
        <Pressable onPress={confirmClear} style={{ marginTop: 16 }}>
          <Text style={{ color: "#c97a6e", textAlign: "center" }}>Clear condition record</Text>
        </Pressable>
      )}
      <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
        <Text style={{ color: T.muted, textAlign: "center" }}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: T.case, alignItems: "center", justifyContent: "center" },
  intro: { color: T.muted, fontSize: 13, lineHeight: 19 },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 22, marginBottom: 4 },
  help: { color: T.faint, fontSize: 11, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  input: {
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 8,
    color: T.cream,
    fontSize: 16,
    padding: 12,
  },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 28 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
});
