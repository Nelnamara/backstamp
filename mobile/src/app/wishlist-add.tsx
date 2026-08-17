import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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

import { api } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

type Lookup = { id: number; name: string };

const CONDITION_FLOORS = [
  { key: "any", label: "ANY" },
  { key: "loose_acceptable", label: "LOOSE OK" },
  { key: "sealed_mib", label: "SEALED/MIB" },
];

const PRIORITIES = [
  { key: "", label: "NONE" },
  { key: "grail", label: "🔥 GRAIL" },
  { key: "filler", label: "FILLER" },
];

export default function WishlistAdd() {
  const { me } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [franchises, setFranchises] = useState<Lookup[]>([]);
  const [types, setTypes] = useState<Lookup[]>([]);
  const [franchiseId, setFranchiseId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [floor, setFloor] = useState("any");
  const [priority, setPriority] = useState("");
  const [coa, setCoa] = useState(false);
  const [ceiling, setCeiling] = useState("");
  // variant spec: the "only the GITD chase /50, not the base pin" case
  const [specRows, setSpecRows] = useState<{ k: string; v: string }[]>([{ k: "", v: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Lookup[]>("/franchises").then(setFranchises).catch(() => {});
    api<Lookup[]>("/item-types").then(setTypes).catch(() => {});
  }, []);

  async function save() {
    if (!me || !name.trim()) return;
    setSaving(true);
    try {
      const variant_spec: Record<string, string | boolean> = {};
      for (const r of specRows) {
        const k = r.k.trim();
        if (k) variant_spec[k] = r.v.trim() || true;
      }
      await api("/wishlist", {
        method: "POST",
        body: JSON.stringify({
          user_id: me.id,
          name: name.trim(),
          franchise_id: franchiseId,
          item_type_id: typeId,
          variant_spec,
          condition_floor: floor,
          coa_required: coa,
          price_ceiling: ceiling.trim() ? ceiling.trim() : null,
          priority: priority || null,
        }),
      });
      router.replace("/acquire");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message);
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
        <Text style={s.label}>WHAT ARE YOU HUNTING?</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Murloc GITD Chase"
          placeholderTextColor={T.faint}
        />

        <Text style={s.label}>PRIORITY</Text>
        <View style={s.chips}>
          {PRIORITIES.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPriority(p.key)}
              style={[s.chip, priority === p.key && s.chipOn]}
            >
              <Text style={[s.chipText, priority === p.key && s.chipTextOn]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>FRANCHISE (OPTIONAL)</Text>
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

        <Text style={s.label}>TYPE (OPTIONAL)</Text>
        <View style={s.chips}>
          {types.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTypeId(typeId === t.id ? null : t.id)}
              style={[s.chip, typeId === t.id && s.chipOn]}
            >
              <Text style={[s.chipText, typeId === t.id && s.chipTextOn]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>CONDITION FLOOR</Text>
        <View style={s.chips}>
          {CONDITION_FLOORS.map((c) => (
            <Pressable key={c.key} onPress={() => setFloor(c.key)} style={[s.chip, floor === c.key && s.chipOn]}>
              <Text style={[s.chipText, floor === c.key && s.chipTextOn]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>PRICE CEILING (OPTIONAL)</Text>
        <TextInput
          style={s.input}
          value={ceiling}
          onChangeText={setCeiling}
          placeholder="Don't alert me above this"
          placeholderTextColor={T.faint}
          keyboardType="decimal-pad"
        />

        <View style={[s.row, { alignItems: "center", marginTop: 16 }]}>
          <Switch
            value={coa}
            onValueChange={setCoa}
            trackColor={{ true: T.brassDeep, false: T.lineWarm }}
            thumbColor={T.cream}
          />
          <Text style={{ color: T.creamDim, marginLeft: 10 }}>Certificate of authenticity required</Text>
        </View>

        <Text style={s.label}>VARIANT SPEC (OPTIONAL)</Text>
        <Text style={s.help}>
          Which exact version counts — e.g. finish / glow-in-the-dark. Keeps watchers from firing on every
          listing that shares the name.
        </Text>
        {specRows.map((r, i) => (
          <View key={i} style={[s.row, { marginTop: 8 }]}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={r.k}
              onChangeText={(t) => setSpecRows((rows) => rows.map((x, j) => (j === i ? { ...x, k: t } : x)))}
              placeholder="finish"
              placeholderTextColor={T.faint}
              autoCapitalize="none"
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={r.v}
              onChangeText={(t) => setSpecRows((rows) => rows.map((x, j) => (j === i ? { ...x, v: t } : x)))}
              placeholder="glow-in-the-dark"
              placeholderTextColor={T.faint}
              autoCapitalize="none"
            />
          </View>
        ))}
        <Pressable onPress={() => setSpecRows((r) => [...r, { k: "", v: "" }])} style={{ marginTop: 10 }}>
          <Text style={{ color: T.brassBright, fontSize: 13 }}>+ another detail</Text>
        </Pressable>

        <Pressable
          style={[s.primary, (!name.trim() || saving) && { opacity: 0.4 }]}
          onPress={save}
          disabled={!name.trim() || saving}
        >
          <Text style={s.primaryText}>{saving ? "Saving…" : "Reserve a slot"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
          <Text style={{ color: T.muted, textAlign: "center" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  help: { color: T.faint, fontSize: 11, lineHeight: 15, marginBottom: 2 },
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
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 13 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 26 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
});
