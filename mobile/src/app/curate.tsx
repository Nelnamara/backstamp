import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api, photoUrl } from "../api";
import { T } from "../theme";

type Item = {
  id: number;
  name: string;
  franchise_id: number | null;
  item_type_id: number | null;
  purchase_price: string | null;
  trade_stock: boolean;
};

const SORTS = [
  { key: "newest", label: "NEWEST" },
  { key: "oldest", label: "OLDEST" },
  { key: "name", label: "A–Z" },
  { key: "value", label: "VALUE" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function catalogNo(id: number) {
  return `NO. ${String(id).padStart(4, "0")}`;
}

function Row({ item, franchise, onOpen }: { item: Item; franchise?: string; onOpen: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api<{ file_path: string; photo_type: string }[]>(`/items/${item.id}/photos`)
        .then((ph) => {
          if (!alive || !ph.length) return;
          const primary = ph.find((p) => p.photo_type === "item") ?? ph[0];
          setPhoto(photoUrl(primary.file_path));
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [item.id])
  );

  const price = item.purchase_price
    ? Number(item.purchase_price).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : null;

  return (
    <Pressable style={s.row} onPress={onOpen}>
      {photo ? (
        <Image source={{ uri: photo }} style={s.thumb} />
      ) : (
        <View style={[s.thumb, s.thumbPlaceholder]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.no}>{catalogNo(item.id)}</Text>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.spec}>{franchise ?? "uncataloged"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {price && <Text style={s.price}>{price}</Text>}
        {item.trade_stock && <Text style={s.trade}>TRADE</Text>}
      </View>
    </Pressable>
  );
}

export default function Curate() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [franchises, setFranchises] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [franchiseFilter, setFranchiseFilter] = useState<number | null>(null);
  const [tradeOnly, setTradeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [its, frs] = await Promise.all([
        api<Item[]>(`/items?limit=500`),
        api<{ id: number; name: string }[]>(`/franchises`),
      ]);
      setItems(its);
      setFranchises(Object.fromEntries(frs.map((f) => [f.id, f.name])));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const term = search.trim().toLowerCase();
  const all = items ?? [];

  // Counts come from the whole collection, not the filtered view — the chips
  // should still tell you what's there while a filter is active.
  const tradeCount = all.filter((i) => i.trade_stock).length;
  const franchiseCounts = all.reduce<Record<number, number>>((acc, i) => {
    if (i.franchise_id != null) acc[i.franchise_id] = (acc[i.franchise_id] ?? 0) + 1;
    return acc;
  }, {});

  const visible = all
    .filter((i) => (term ? i.name.toLowerCase().includes(term) : true))
    .filter((i) => (franchiseFilter == null ? true : i.franchise_id === franchiseFilter))
    .filter((i) => (tradeOnly ? i.trade_stock : true))
    .sort((a, b) => {
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "value") return (Number(b.purchase_price) || 0) - (Number(a.purchase_price) || 0);
      return b.id - a.id;
    });

  return (
    <View style={{ flex: 1, backgroundColor: T.case }}>
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search the collection…"
          placeholderTextColor={T.faint}
          autoCapitalize="none"
        />
        <Pressable style={s.setsBtn} onPress={() => router.push("/sets")}>
          <Text style={s.setsBtnText}>Sets</Text>
        </Pressable>
        <Pressable style={s.addBtn} onPress={() => router.push("/add-item")}>
          <Text style={s.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => {
            setFranchiseFilter(null);
            setTradeOnly(false);
          }}
          style={[s.fchip, franchiseFilter == null && !tradeOnly && s.fchipOn]}
        >
          <Text style={[s.fchipText, franchiseFilter == null && !tradeOnly && s.fchipTextOn]}>
            All · {all.length}
          </Text>
        </Pressable>
        {Object.entries(franchiseCounts).map(([fid, count]) => {
          const id = Number(fid);
          const on = franchiseFilter === id;
          return (
            <Pressable key={fid} onPress={() => setFranchiseFilter(on ? null : id)} style={[s.fchip, on && s.fchipOn]}>
              <Text style={[s.fchipText, on && s.fchipTextOn]}>
                {franchises[id] ?? "Unknown"} · {count}
              </Text>
            </Pressable>
          );
        })}
        {tradeCount > 0 && (
          <Pressable onPress={() => setTradeOnly(!tradeOnly)} style={[s.fchip, tradeOnly && s.fchipOn]}>
            <Text style={[s.fchipText, tradeOnly && s.fchipTextOn]}>Trade stock · {tradeCount}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={s.sortRow}>
        <Text style={s.sortLabel}>SORT</Text>
        {SORTS.map((so) => (
          <Pressable key={so.key} onPress={() => setSortBy(so.key)}>
            <Text style={[s.sortText, sortBy === so.key && s.sortTextOn]}>{so.label}</Text>
          </Pressable>
        ))}
        <Text style={s.showing}>
          {visible.length}/{all.length}
        </Text>
      </View>

      {items === null ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.brass} />}
          renderItem={({ item }) => (
            <Row
              item={item}
              franchise={franchises[item.franchise_id ?? -1]}
              onOpen={() => router.push(`/item/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <Text style={s.empty}>
              {items.length === 0 ? "Nothing catalogued yet." : "Nothing matches those filters."}
            </Text>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { padding: 14, paddingBottom: 4, flexDirection: "row", gap: 10, alignItems: "center" },
  search: {
    flex: 1,
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 999,
    color: T.cream,
    fontSize: 15,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  addBtn: { backgroundColor: T.brass, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  addBtnText: { color: T.ink, fontWeight: "700", fontSize: 14 },
  setsBtn: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 13 },
  setsBtnText: { color: T.creamDim, fontSize: 13 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: T.panel,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  thumb: { width: 54, height: 54, borderRadius: 6, backgroundColor: T.panelDeep },
  thumbPlaceholder: { borderColor: T.lineWarm, borderWidth: 1 },
  no: { color: T.faint, fontSize: 9, letterSpacing: 0.5 },
  name: { color: T.cream, fontSize: 15, fontWeight: "600", marginTop: 2 },
  spec: { color: T.muted, fontSize: 11, marginTop: 2, textTransform: "uppercase" },
  price: { color: T.brassBright, fontSize: 13 },
  trade: { color: T.trade, fontSize: 9, marginTop: 4 },
  empty: { color: T.muted, textAlign: "center", marginTop: 40 },
  filterRow: { paddingHorizontal: 14, paddingTop: 10, gap: 8, alignItems: "center" },
  fchip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  fchipOn: { backgroundColor: T.brass, borderColor: T.brass },
  fchipText: { color: T.creamDim, fontSize: 12 },
  fchipTextOn: { color: T.ink, fontWeight: "700" },
  sortRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, gap: 14 },
  sortLabel: { color: T.faint, fontSize: 9, letterSpacing: 1 },
  sortText: { color: T.faint, fontSize: 11, letterSpacing: 0.5 },
  sortTextOn: { color: T.brassBright, fontWeight: "700" },
  showing: { color: T.faint, fontSize: 10, marginLeft: "auto" },
});
