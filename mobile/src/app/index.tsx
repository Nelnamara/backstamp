import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import * as Clipboard from "expo-clipboard";

import { api } from "../api";
import { useAuth } from "../auth";
import { T } from "../theme";

function money(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type Item = { id: number; franchise_id: number | null; purchase_price: string | null; trade_stock: boolean };

export default function Home() {
  const { me, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [paid, setPaid] = useState(0);
  const [count, setCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [invite, setInvite] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const items = await api<Item[]>(`/items?owner_id=${me.id}&limit=500`);
      let cur = 0;
      let paidTotal = 0;
      for (const it of items) {
        const hist = await api<{ value: string }[]>(`/items/${it.id}/value-history`).catch(() => []);
        cur += hist.length ? Number(hist[hist.length - 1].value) : 0;
        paidTotal += it.purchase_price ? Number(it.purchase_price) : 0;
      }
      setTotal(cur);
      setPaid(paidTotal);
      setCount(items.length);
      setTradeCount(items.filter((i) => i.trade_stock).length);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function makeInvite() {
    try {
      const inv = await api<{ code: string }>("/auth/invites", { method: "POST" });
      setInvite(inv.code);
      await Clipboard.setStringAsync(inv.code).catch(() => {});
      Alert.alert("Invite created", `Code ${inv.code} — copied to your clipboard. Send it to whoever you're inviting.`);
    } catch (e: any) {
      Alert.alert("Couldn't create invite", e.message);
    }
  }

  const delta = total - paid;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.case }}
      contentContainerStyle={{ padding: 18 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={T.brass} />}
    >
      <Text style={s.private}>🔒 PRIVATE — VISIBLE ONLY TO YOU</Text>

      {loading && count === 0 ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={s.total}>{money(total)}</Text>
          <Text style={s.sub}>
            {count} item{count === 1 ? "" : "s"}
            {paid > 0 &&
              ` · ${delta === 0 ? "even with" : delta > 0 ? `up ${money(Math.abs(delta))}` : `down ${money(Math.abs(delta))}`} from what you paid`}
          </Text>

          <View style={s.statRow}>
            <View style={s.stat}>
              <Text style={s.statK}>ITEMS</Text>
              <Text style={s.statV}>{count}</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statK}>TRADE STOCK</Text>
              <Text style={s.statV}>{tradeCount}</Text>
            </View>
          </View>
        </>
      )}

      <View style={{ marginTop: 32 }}>
        <Text style={s.who}>Signed in as {me?.username}</Text>
        {invite && <Text style={s.inviteCode}>Latest invite code: {invite}</Text>}
        <View style={s.footRow}>
          <Pressable style={s.logout} onPress={makeInvite}>
            <Text style={s.logoutText}>+ Create invite</Text>
          </Pressable>
          <Pressable style={s.logout} onPress={logout}>
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  private: { color: T.faint, fontSize: 10, letterSpacing: 0.5, marginBottom: 18 },
  total: { color: T.cream, fontSize: 46, fontWeight: "700" },
  sub: { color: T.muted, fontSize: 13, marginTop: 4 },
  statRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  stat: { flex: 1, backgroundColor: T.panel, borderColor: T.line, borderWidth: 1, borderRadius: 8, padding: 14 },
  statK: { color: T.faint, fontSize: 9, letterSpacing: 1, marginBottom: 6 },
  statV: { color: T.cream, fontSize: 22, fontWeight: "600" },
  who: { color: T.faint, fontSize: 12, marginBottom: 10 },
  logout: {
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  logoutText: { color: T.creamDim, fontSize: 14 },
  footRow: { flexDirection: "row", gap: 10 },
  inviteCode: { color: T.brassBright, fontSize: 13, marginBottom: 10 },
});
