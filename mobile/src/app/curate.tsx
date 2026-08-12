import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
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

function catalogNo(id: number) {
  return `NO. ${String(id).padStart(4, "0")}`;
}

function Row({ item, franchise }: { item: Item; franchise?: string }) {
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
    ? Number(item.purchase_price).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : null;

  return (
    <View style={s.row}>
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
    </View>
  );
}

export default function Curate() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [franchises, setFranchises] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [its, frs] = await Promise.all([
      api<Item[]>(`/items?limit=500`),
      api<{ id: number; name: string }[]>(`/franchises`),
    ]);
    setItems(its);
    setFranchises(Object.fromEntries(frs.map((f) => [f.id, f.name])));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const term = search.trim().toLowerCase();
  const visible = (items ?? [])
    .filter((i) => (term ? i.name.toLowerCase().includes(term) : true))
    .sort((a, b) => b.id - a.id);

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
      </View>
      {items === null ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <Row item={item} franchise={franchises[item.franchise_id ?? -1]} />}
          ListEmptyComponent={
            <Text style={s.empty}>
              {items.length === 0 ? "Nothing catalogued yet." : "No items match that search."}
            </Text>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchWrap: { padding: 14, paddingBottom: 4 },
  search: {
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 999,
    color: T.cream,
    fontSize: 15,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
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
});
