import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

type Entry = {
  id: number;
  name: string;
  priority: string | null;
  condition_floor: string;
  coa_required: boolean;
  price_ceiling: string | null;
};

export default function Acquire() {
  const { me } = useAuth();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    setEntries(await api<Entry[]>(`/wishlist?user_id=${me.id}`));
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.case }}>
      {entries === null ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={s.slot}>
              <Text style={s.name}>{item.name}</Text>
              <View style={s.chips}>
                {item.priority === "grail" && <Text style={[s.chip, s.grail]}>🔥 GRAIL</Text>}
                {item.priority === "filler" && <Text style={s.chip}>FILLER</Text>}
                {item.condition_floor !== "any" && (
                  <Text style={s.chip}>{item.condition_floor.replace("_", "/").toUpperCase()}</Text>
                )}
                {item.coa_required && <Text style={s.chip}>COA REQUIRED</Text>}
                {item.price_ceiling && (
                  <Text style={s.chip}>
                    CEILING $
                    {Number(item.price_ceiling).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>No reserved slots on your wishlist yet.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  slot: {
    borderColor: T.lineBrass,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 14,
  },
  name: { color: T.cream, fontSize: 15, fontWeight: "600", marginBottom: 8 },
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
  empty: { color: T.muted, textAlign: "center", marginTop: 40 },
});
