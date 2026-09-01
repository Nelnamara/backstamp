import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
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

type Post = { id: number; user_id: number; post_type: string; caption: string; item_ids: number[] };
type Contact = {
  from_user_id: number;
  to_user_id: number;
  tier: string;
  granted_at: string;
  expires_at: string | null;
  promoted: boolean;
};
type CheckIn = {
  id: number;
  user_id: number;
  convention_name: string;
  convention_date: string;
  method: string;
};
type User = { id: number; username: string };

const TIERS = [
  { key: "tier_1", label: "T1 · PROFILE" },
  { key: "tier_2", label: "T2 · + WISHLIST" },
  { key: "tier_3", label: "T3 · + COLLECTION" },
];
const POST_FILTERS = ["showcase", "trade", "seeking"];

type Section = "feed" | "contacts" | "cons";

export default function Connect() {
  const { me } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>("feed");

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [users, setUsers] = useState<Record<number, string>>({});
  const [userList, setUserList] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // contact granting
  const [grantTo, setGrantTo] = useState<number | null>(null);
  const [grantTier, setGrantTier] = useState("tier_1");
  const [promoted, setPromoted] = useState(false);

  // check-in
  const [conName, setConName] = useState("");
  const [conDate, setConDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setRefreshing(true);
    try {
      const [ps, us, cs, cis] = await Promise.all([
        api<Post[]>(filter ? `/community-posts?post_type=${filter}` : "/community-posts").catch(() => []),
        api<User[]>("/users").catch(() => []),
        api<Contact[]>(`/contacts?user_id=${me.id}`).catch(() => []),
        api<CheckIn[]>(`/convention-checkins?user_id=${me.id}`).catch(() => []),
      ]);
      setPosts(ps);
      setUserList(us);
      setUsers(Object.fromEntries(us.map((u) => [u.id, u.username])));
      setContacts(cs);
      setCheckins(cis);
    } finally {
      setRefreshing(false);
    }
  }, [me, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function deletePost(p: Post) {
    Alert.alert("Delete this post?", p.caption, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/community-posts/${p.id}`, { method: "DELETE" });
            await load();
          } catch (e: any) {
            Alert.alert("Couldn't delete", e.message);
          }
        },
      },
    ]);
  }

  async function grant() {
    if (!me || grantTo == null) return;
    setBusy(true);
    try {
      await api("/contacts", {
        method: "POST",
        body: JSON.stringify({
          from_user_id: me.id,
          to_user_id: grantTo,
          tier: grantTier,
          promoted,
        }),
      });
      setGrantTo(null);
      setPromoted(false);
      setGrantTier("tier_1");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't grant", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    if (!me || !conName.trim()) return;
    setBusy(true);
    try {
      const created = await api<CheckIn>("/convention-checkins", {
        method: "POST",
        body: JSON.stringify({
          user_id: me.id,
          convention_name: conName.trim(),
          convention_date: conDate,
          method: "manual",
        }),
      });
      const targets = await api<number[]>(`/convention-checkins/${created.id}/notify-targets`).catch(() => []);
      setConName("");
      await load();
      Alert.alert(
        "Checked in",
        targets.length === 0
          ? "No active contacts to notify yet."
          : `Would notify: ${targets.map((t) => users[t] ?? `#${t}`).join(", ")}.\n\nReal push needs the standalone build — this is the in-app record for now.`
      );
    } catch (e: any) {
      Alert.alert("Couldn't check in", e.message);
    } finally {
      setBusy(false);
    }
  }

  const others = userList.filter((u) => u.id !== me?.id);

  return (
    <View style={{ flex: 1, backgroundColor: T.case }}>
      <View style={s.seg}>
        {(["feed", "contacts", "cons"] as Section[]).map((k) => (
          <Pressable key={k} onPress={() => setSection(k)} style={[s.segBtn, section === k && s.segOn]}>
            <Text style={[s.segText, section === k && s.segTextOn]}>
              {k === "feed" ? "Feed" : k === "contacts" ? "Contacts" : "Cons"}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === "feed" && (
        <>
          <View style={s.rowWrap}>
            <Pressable onPress={() => setFilter(null)} style={[s.chip, filter == null && s.chipOn]}>
              <Text style={[s.chipText, filter == null && s.chipTextOn]}>All</Text>
            </Pressable>
            {POST_FILTERS.map((f) => (
              <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
                <Text style={[s.chipText, filter === f && s.chipTextOn]}>
                  {f[0].toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
            <Pressable style={s.addBtn} onPress={() => router.push("/post-add")}>
              <Text style={s.addBtnText}>+ Post</Text>
            </Pressable>
          </View>

          {posts === null ? (
            <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.brass} />}
              renderItem={({ item }) => (
                <Pressable
                  style={s.card}
                  onLongPress={() => item.user_id === me?.id && deletePost(item)}
                >
                  <Text style={s.type}>{item.post_type.toUpperCase()}</Text>
                  <Text style={s.caption}>{item.caption}</Text>
                  <Text style={s.by}>
                    by {users[item.user_id] ?? `user #${item.user_id}`}
                    {item.item_ids.length > 0
                      ? ` · ${item.item_ids.length} item${item.item_ids.length === 1 ? "" : "s"}`
                      : ""}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={s.empty}>Nothing posted yet.</Text>}
            />
          )}
        </>
      )}

      {section === "contacts" && (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.brass} />}
        >
          <Text style={s.note}>
            Grants are one-directional and expire by default. Scanning phone-to-phone isn't built yet —
            this is the manual stand-in.
          </Text>

          <Text style={s.label}>GRANT ACCESS TO</Text>
          {others.length === 0 ? (
            <Text style={s.help}>No other collectors on this server yet.</Text>
          ) : (
            <View style={s.rowWrapPlain}>
              {others.map((u) => (
                <Pressable
                  key={u.id}
                  onPress={() => setGrantTo(grantTo === u.id ? null : u.id)}
                  style={[s.chip, grantTo === u.id && s.chipOn]}
                >
                  <Text style={[s.chipText, grantTo === u.id && s.chipTextOn]}>{u.username}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {grantTo != null && (
            <>
              <Text style={s.label}>TRUST TIER</Text>
              <View style={s.rowWrapPlain}>
                {TIERS.map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => setGrantTier(t.key)}
                    style={[s.chip, grantTier === t.key && s.chipOn]}
                  >
                    <Text style={[s.chipText, grantTier === t.key && s.chipTextOn]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[s.inline, { marginTop: 14 }]}>
                <Switch
                  value={promoted}
                  onValueChange={setPromoted}
                  trackColor={{ true: T.brassDeep, false: T.lineWarm }}
                  thumbColor={T.cream}
                />
                <Text style={{ color: T.creamDim, marginLeft: 10 }}>Permanent (don't expire)</Text>
              </View>
              <Pressable style={s.primary} onPress={grant} disabled={busy}>
                <Text style={s.primaryText}>{busy ? "Granting…" : "Grant / update"}</Text>
              </Pressable>
            </>
          )}

          <Text style={s.label}>YOUR CONTACTS</Text>
          {contacts.length === 0 ? (
            <Text style={s.help}>No contacts yet.</Text>
          ) : (
            contacts.map((c) => {
              const mine = c.from_user_id === me?.id;
              const other = mine ? c.to_user_id : c.from_user_id;
              return (
                <View key={`${c.from_user_id}-${c.to_user_id}`} style={s.contactRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.contactName}>{users[other] ?? `user #${other}`}</Text>
                    <Text style={s.contactMeta}>
                      {mine ? "you granted them" : "they granted you"} ·{" "}
                      {TIERS.find((t) => t.key === c.tier)?.label ?? c.tier}
                    </Text>
                  </View>
                  <Text style={c.promoted ? s.permanent : s.ephemeral}>
                    {c.promoted ? "PERMANENT" : c.expires_at ? `EXPIRES ${c.expires_at.slice(0, 10)}` : "NO EXPIRY"}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {section === "cons" && (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.brass} />}
        >
          <Text style={s.note}>Check in so your contacts know you're on the floor.</Text>

          <Text style={s.label}>CONVENTION</Text>
          <TextInput
            style={s.input}
            value={conName}
            onChangeText={setConName}
            placeholder="e.g. BlizzCon"
            placeholderTextColor={T.faint}
          />
          <Text style={s.label}>DATE</Text>
          <TextInput
            style={s.input}
            value={conDate}
            onChangeText={setConDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={T.faint}
          />
          <Pressable
            style={[s.primary, (!conName.trim() || busy) && { opacity: 0.4 }]}
            onPress={checkIn}
            disabled={!conName.trim() || busy}
          >
            <Text style={s.primaryText}>{busy ? "Checking in…" : "Check in"}</Text>
          </Pressable>

          <Text style={s.label}>YOUR CHECK-INS</Text>
          {checkins.length === 0 ? (
            <Text style={s.help}>None yet.</Text>
          ) : (
            checkins
              .slice()
              .reverse()
              .map((c) => (
                <View key={c.id} style={s.contactRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.contactName}>{c.convention_name}</Text>
                    <Text style={s.contactMeta}>
                      {c.convention_date} · {c.method.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: "row", gap: 8, padding: 14, paddingBottom: 4 },
  segBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center", borderWidth: 1, borderColor: T.lineWarm },
  segOn: { backgroundColor: T.panel, borderColor: T.brass },
  segText: { color: T.muted, fontSize: 13 },
  segTextOn: { color: T.brassBright, fontWeight: "700" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", paddingHorizontal: 14, paddingTop: 10 },
  rowWrapPlain: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center" },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  addBtn: { backgroundColor: T.brass, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, marginLeft: "auto" },
  addBtnText: { color: T.ink, fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: T.panel, borderColor: T.line, borderWidth: 1, borderRadius: 8, padding: 14 },
  type: {
    color: T.brass,
    fontSize: 10,
    letterSpacing: 1,
    borderColor: T.lineBrass,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginBottom: 8,
    overflow: "hidden",
  },
  caption: { color: T.cream, fontSize: 15, fontWeight: "600" },
  by: { color: T.muted, fontSize: 12, marginTop: 4 },
  empty: { color: T.muted, textAlign: "center", marginTop: 40 },
  note: { color: T.muted, fontSize: 12, lineHeight: 17 },
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
  },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.panel,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  contactName: { color: T.cream, fontSize: 14, fontWeight: "600" },
  contactMeta: { color: T.muted, fontSize: 11, marginTop: 2 },
  permanent: { color: T.brassBright, fontSize: 10, letterSpacing: 0.5 },
  ephemeral: { color: T.faint, fontSize: 10, letterSpacing: 0.5 },
});
