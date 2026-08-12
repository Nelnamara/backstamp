import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { api } from "../api";
import { T } from "../theme";

type Post = {
  id: number;
  user_id: number;
  post_type: string;
  caption: string;
  item_ids: number[];
};

export default function Connect() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [users, setUsers] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const [ps, us] = await Promise.all([
      api<Post[]>(`/community-posts`),
      api<{ id: number; username: string }[]>(`/users`),
    ]);
    setPosts(ps);
    setUsers(Object.fromEntries(us.map((u) => [u.id, u.username])));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.case }}>
      <Text style={s.note}>Community feed — showcases, trades, and wanted posts from collectors.</Text>
      {posts === null ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.type}>{item.post_type.toUpperCase()}</Text>
              <Text style={s.caption}>{item.caption}</Text>
              <Text style={s.by}>
                by {users[item.user_id] ?? `user #${item.user_id}`}
                {item.item_ids.length > 0
                  ? ` · ${item.item_ids.length} item${item.item_ids.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>Nothing posted to the community yet.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  note: { color: T.muted, fontSize: 12, padding: 14, paddingBottom: 4 },
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
});
