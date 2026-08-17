import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { api } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

type Entry = {
  id: number;
  name: string;
  franchise_id: number | null;
  item_type_id: number | null;
  variant_spec: Record<string, unknown>;
  priority: string | null;
  condition_floor: string;
  coa_required: boolean;
  price_ceiling: string | null;
  status: string;
};

const FLOOR_LABELS: Record<string, string> = {
  loose_acceptable: "LOOSE OK",
  sealed_mib: "SEALED/MIB",
};

function money(v: string | null): string | null {
  if (!v) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function specChips(spec: Record<string, unknown>): string[] {
  return Object.entries(spec ?? {}).map(([k, v]) =>
    typeof v === "boolean" ? k.replaceAll("_", " ").toUpperCase() : `${k.replaceAll("_", " ").toUpperCase()}: ${v}`
  );
}

export default function Acquire() {
  const { me } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [counts, setCounts] = useState<Record<number, { hits: number; matches: number }>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const rows = await api<Entry[]>(`/wishlist?user_id=${me.id}`);
      setEntries(rows);
      // per-entry watcher hits + trade matches in the network
      const pairs = await Promise.all(
        rows.map(async (e) => {
          const [hits, matches] = await Promise.all([
            api<unknown[]>(`/wishlist/${e.id}/hits`).catch(() => []),
            api<unknown[]>(`/wishlist/${e.id}/matches`).catch(() => []),
          ]);
          return [e.id, { hits: hits.length, matches: matches.length }] as const;
        })
      );
      setCounts(Object.fromEntries(pairs));
    } finally {
      setLoading(false);
    }
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDelete(entry: Entry) {
    Alert.alert("Remove from wishlist?", `"${entry.name}"`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/wishlist/${entry.id}`, { method: "DELETE" });
            await load();
          } catch (e: any) {
            Alert.alert("Couldn't remove", e.message);
          }
        },
      },
    ]);
  }

  async function togglePaused(entry: Entry) {
    const next = entry.status === "paused" ? "active" : "paused";
    try {
      await api(`/wishlist/${entry.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't update", e.message);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.case }}>
      <View style={s.head}>
        <Text style={s.headText}>Reserved slots — what you're hunting</Text>
        <Pressable style={s.addBtn} onPress={() => router.push("/wishlist-add")}>
          <Text style={s.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {entries === null ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.brass} />}
          renderItem={({ item }) => {
            const c = counts[item.id];
            const paused = item.status === "paused";
            return (
              <Pressable
                style={[s.slot, paused && { opacity: 0.5 }]}
                onPress={() => togglePaused(item)}
                onLongPress={() => confirmDelete(item)}
              >
                <Text style={s.name}>{item.name}</Text>
                <View style={s.chips}>
                  {item.priority === "grail" && <Text style={[s.chip, s.grail]}>🔥 GRAIL</Text>}
                  {item.priority === "filler" && <Text style={s.chip}>FILLER</Text>}
                  {FLOOR_LABELS[item.condition_floor] && (
                    <Text style={s.chip}>{FLOOR_LABELS[item.condition_floor]}</Text>
                  )}
                  {item.coa_required && <Text style={s.chip}>COA REQUIRED</Text>}
                  {item.price_ceiling && <Text style={s.chip}>CEILING {money(item.price_ceiling)}</Text>}
                  {specChips(item.variant_spec).map((t) => (
                    <Text key={t} style={s.chip}>
                      {t}
                    </Text>
                  ))}
                  {paused && <Text style={[s.chip, s.paused]}>PAUSED</Text>}
                </View>
                <Text style={c && (c.hits > 0 || c.matches > 0) ? s.hit : s.quiet}>
                  {!c
                    ? "…"
                    : c.hits > 0
                      ? `● ${c.hits} watcher hit${c.hits === 1 ? "" : "s"}`
                      : c.matches > 0
                        ? `${c.matches} trade match${c.matches === 1 ? "" : "es"} in the network`
                        : "Watching — no hits yet"}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={s.empty}>Nothing on the wishlist yet. "+ Add" reserves a slot.</Text>
          }
        />
      )}
      {entries !== null && entries.length > 0 && (
        <Text style={s.hint}>Tap to pause/resume · long-press to remove</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 10,
  },
  headText: { color: T.muted, fontSize: 12, flex: 1 },
  addBtn: { backgroundColor: T.brass, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  addBtnText: { color: T.ink, fontWeight: "700", fontSize: 14 },
  slot: {
    borderColor: T.lineBrass,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 14,
  },
  name: { color: T.cream, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    color: T.creamDim,
    fontSize: 11,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
    overflow: "hidden",
  },
  grail: { color: T.brassBright, borderColor: T.lineBrass },
  paused: { color: T.faint },
  hit: { color: T.brassBright, fontSize: 12, marginTop: 10 },
  quiet: { color: T.faint, fontSize: 12, marginTop: 10 },
  empty: { color: T.muted, textAlign: "center", marginTop: 40 },
  hint: { color: T.faint, fontSize: 11, textAlign: "center", paddingBottom: 8 },
});
