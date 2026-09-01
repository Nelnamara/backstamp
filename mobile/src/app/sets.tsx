import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

type Manifest = { id: number; name: string; franchise_id: number; is_active: boolean };
type Member = { id: number; set_manifest_id: number; name: string };
type Reference = {
  id: number;
  description: string;
  status: string;
  franchise_id: number | null;
  item_type_id: number | null;
};
type Lookup = { id: number; name: string };

export default function Sets() {
  const { me } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"sets" | "hallmarks">("sets");
  const [manifests, setManifests] = useState<Manifest[] | null>(null);
  const [members, setMembers] = useState<Record<number, Member[]>>({});
  const [refs, setRefs] = useState<Reference[]>([]);
  const [franchises, setFranchises] = useState<Lookup[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  // new set
  const [setName, setSetName] = useState("");
  const [setFranchise, setSetFranchise] = useState<number | null>(null);
  // new member
  const [memberDraft, setMemberDraft] = useState("");
  // new hallmark
  const [refText, setRefText] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [ms, rs, fs] = await Promise.all([
        api<Manifest[]>("/set-manifests").catch(() => []),
        api<Reference[]>("/hallmark-references").catch(() => []),
        api<Lookup[]>("/franchises").catch(() => []),
      ]);
      setManifests(ms);
      setRefs(rs);
      setFranchises(fs);
      const pairs = await Promise.all(
        ms.map(async (m) => [m.id, await api<Member[]>(`/set-manifests/${m.id}/members`).catch(() => [])] as const)
      );
      setMembers(Object.fromEntries(pairs));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function createSet() {
    if (!setName.trim() || setFranchise == null) return;
    setBusy(true);
    try {
      await api("/set-manifests", {
        method: "POST",
        body: JSON.stringify({ name: setName.trim(), franchise_id: setFranchise }),
      });
      setSetName("");
      setSetFranchise(null);
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't create", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addMember(manifestId: number) {
    if (!memberDraft.trim()) return;
    setBusy(true);
    try {
      await api(`/set-manifests/${manifestId}/members`, {
        method: "POST",
        body: JSON.stringify({ name: memberDraft.trim() }),
      });
      setMemberDraft("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't add", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addReference() {
    if (!me || !refText.trim()) return;
    setBusy(true);
    try {
      await api("/hallmark-references", {
        method: "POST",
        body: JSON.stringify({ submitted_by_user_id: me.id, description: refText.trim() }),
      });
      setRefText("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't submit", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.case }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.brass} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.seg}>
        <Pressable onPress={() => setTab("sets")} style={[s.segBtn, tab === "sets" && s.segOn]}>
          <Text style={[s.segText, tab === "sets" && s.segTextOn]}>Set manifests</Text>
        </Pressable>
        <Pressable onPress={() => setTab("hallmarks")} style={[s.segBtn, tab === "hallmarks" && s.segOn]}>
          <Text style={[s.segText, tab === "hallmarks" && s.segTextOn]}>Hallmarks</Text>
        </Pressable>
      </View>

      {tab === "sets" ? (
        <>
          <Text style={s.note}>
            Editorial series definitions — a given year's pin run, say — kept independently of who owns
            what. There's no link from a set member to your items yet, so this lists what exists without
            claiming to know what you have.
          </Text>

          <Text style={s.label}>NEW SET</Text>
          <TextInput
            style={s.input}
            value={setName}
            onChangeText={setSetName}
            placeholder="e.g. BlizzCon 2019 pin series"
            placeholderTextColor={T.faint}
          />
          <View style={[s.chips, { marginTop: 10 }]}>
            {franchises.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setSetFranchise(setFranchise === f.id ? null : f.id)}
                style={[s.chip, setFranchise === f.id && s.chipOn]}
              >
                <Text style={[s.chipText, setFranchise === f.id && s.chipTextOn]}>{f.name}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[s.primary, (!setName.trim() || setFranchise == null || busy) && { opacity: 0.4 }]}
            onPress={createSet}
            disabled={!setName.trim() || setFranchise == null || busy}
          >
            <Text style={s.primaryText}>Create set</Text>
          </Pressable>

          <Text style={s.label}>SETS</Text>
          {manifests === null ? (
            <ActivityIndicator color={T.brass} />
          ) : manifests.length === 0 ? (
            <Text style={s.help}>No sets defined yet.</Text>
          ) : (
            manifests.map((m) => {
              const open = expanded === m.id;
              const mem = members[m.id] ?? [];
              return (
                <View key={m.id} style={s.card}>
                  <Pressable onPress={() => setExpanded(open ? null : m.id)}>
                    <Text style={s.cardName}>{m.name}</Text>
                    <Text style={s.cardMeta}>
                      {franchises.find((f) => f.id === m.franchise_id)?.name ?? "—"} · {mem.length} member
                      {mem.length === 1 ? "" : "s"} · tap to {open ? "collapse" : "expand"}
                    </Text>
                  </Pressable>
                  {open && (
                    <>
                      {mem.map((x) => (
                        <Text key={x.id} style={s.member}>
                          · {x.name}
                        </Text>
                      ))}
                      <View style={s.inlineRow}>
                        <TextInput
                          style={[s.input, { flex: 1 }]}
                          value={memberDraft}
                          onChangeText={setMemberDraft}
                          placeholder="add a member"
                          placeholderTextColor={T.faint}
                        />
                        <Pressable style={s.smallBtn} onPress={() => addMember(m.id)} disabled={busy}>
                          <Text style={s.smallBtnText}>Add</Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </>
      ) : (
        <>
          <Text style={s.note}>
            Crowdsourced authentication notes — backstamp text, pin-back hardware, plating. Everything
            starts PENDING; there's deliberately no way to mark one verified yet, because that review
            belongs to the trust/council process that isn't built.
          </Text>

          <Text style={s.label}>SUBMIT A REFERENCE</Text>
          <TextInput
            style={[s.input, { minHeight: 70 }]}
            value={refText}
            onChangeText={setRefText}
            placeholder="e.g. Real 2019 Murlocs have a stamped serif B on the post"
            placeholderTextColor={T.faint}
            multiline
          />
          <Pressable
            style={[s.primary, (!refText.trim() || busy) && { opacity: 0.4 }]}
            onPress={addReference}
            disabled={!refText.trim() || busy}
          >
            <Text style={s.primaryText}>Submit</Text>
          </Pressable>

          <Text style={s.label}>REFERENCES</Text>
          {refs.length === 0 ? (
            <Text style={s.help}>Nothing submitted yet.</Text>
          ) : (
            refs.map((r) => (
              <View key={r.id} style={s.card}>
                <Text style={s.status}>{r.status.replaceAll("_", " ").toUpperCase()}</Text>
                <Text style={s.cardNote}>{r.description}</Text>
              </View>
            ))
          )}
        </>
      )}

      <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
        <Text style={{ color: T.muted, textAlign: "center" }}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: "row", gap: 8, marginBottom: 16 },
  segBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center", borderWidth: 1, borderColor: T.lineWarm },
  segOn: { backgroundColor: T.panel, borderColor: T.brass },
  segText: { color: T.muted, fontSize: 13 },
  segTextOn: { color: T.brassBright, fontWeight: "700" },
  note: { color: T.muted, fontSize: 12, lineHeight: 18 },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 22, marginBottom: 8 },
  help: { color: T.faint, fontSize: 12 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 14 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: T.panel,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardName: { color: T.cream, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: T.muted, fontSize: 11, marginTop: 3 },
  cardNote: { color: T.creamDim, fontSize: 13, marginTop: 6 },
  member: { color: T.creamDim, fontSize: 13, marginTop: 6 },
  inlineRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  smallBtn: { backgroundColor: T.brass, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 14 },
  smallBtnText: { color: T.ink, fontSize: 13, fontWeight: "700" },
  status: {
    color: T.brass,
    fontSize: 9,
    letterSpacing: 1,
    borderColor: T.lineBrass,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
});
