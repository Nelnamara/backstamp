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

type Trade = {
  id: number;
  initiator_user_id: number;
  counterpart_user_id: number;
  occurred_at: string;
  confirmed_by_counterpart: boolean;
  note: string | null;
};
type Vouch = { id: number; trade_record_id: number; voucher_user_id: number; vouched_user_id: number };
type User = { id: number; username: string };

export default function Trades() {
  const { me } = useAuth();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [users, setUsers] = useState<Record<number, string>>({});
  const [others, setOthers] = useState<User[]>([]);
  const [withUser, setWithUser] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setRefreshing(true);
    try {
      const [ts, us, vs] = await Promise.all([
        api<Trade[]>(`/trade-records?user_id=${me.id}`).catch(() => []),
        api<User[]>("/users").catch(() => []),
        api<Vouch[]>(`/vouches?vouched_user_id=${me.id}`).catch(() => []),
      ]);
      setTrades(ts);
      setUsers(Object.fromEntries(us.map((u) => [u.id, u.username])));
      setOthers(us.filter((u) => u.id !== me.id));
      setVouches(vs);
    } finally {
      setRefreshing(false);
    }
  }, [me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function logTrade() {
    if (!me || withUser == null) return;
    setBusy(true);
    try {
      await api("/trade-records", {
        method: "POST",
        body: JSON.stringify({
          initiator_user_id: me.id,
          counterpart_user_id: withUser,
          note: note.trim() || null,
        }),
      });
      setWithUser(null);
      setNote("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't log trade", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(t: Trade) {
    try {
      await api(`/trade-records/${t.id}/confirm`, { method: "POST" });
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't confirm", e.message);
    }
  }

  async function vouch(t: Trade) {
    if (!me) return;
    const other = t.initiator_user_id === me.id ? t.counterpart_user_id : t.initiator_user_id;
    try {
      await api("/vouches", {
        method: "POST",
        body: JSON.stringify({
          trade_record_id: t.id,
          voucher_user_id: me.id,
          vouched_user_id: other,
        }),
      });
      await load();
      Alert.alert("Vouched", `You vouched for ${users[other] ?? "them"} on this trade.`);
    } catch (e: any) {
      Alert.alert("Couldn't vouch", e.message);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.case }}
      contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={T.brass} />}
    >
      <Text style={s.note}>
        A vouch only counts once both sides confirm the trade actually happened — that's what stops
        someone inventing a trade to vouch for themselves. Vouches attach to the specific trade, not
        to a global reputation score.
      </Text>

      <Text style={s.label}>LOG A TRADE WITH</Text>
      {others.length === 0 ? (
        <Text style={s.help}>No other collectors on this server yet.</Text>
      ) : (
        <View style={s.chips}>
          {others.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => setWithUser(withUser === u.id ? null : u.id)}
              style={[s.chip, withUser === u.id && s.chipOn]}
            >
              <Text style={[s.chipText, withUser === u.id && s.chipTextOn]}>{u.username}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {withUser != null && (
        <>
          <TextInput
            style={[s.input, { marginTop: 12 }]}
            value={note}
            onChangeText={setNote}
            placeholder="What was traded? (optional)"
            placeholderTextColor={T.faint}
          />
          <Pressable style={s.primary} onPress={logTrade} disabled={busy}>
            <Text style={s.primaryText}>{busy ? "Logging…" : "Log trade"}</Text>
          </Pressable>
        </>
      )}

      <Text style={s.label}>YOUR TRADES</Text>
      {trades === null ? (
        <ActivityIndicator color={T.brass} style={{ marginTop: 20 }} />
      ) : trades.length === 0 ? (
        <Text style={s.help}>No trades logged yet.</Text>
      ) : (
        trades
          .slice()
          .reverse()
          .map((t) => {
            const other = t.initiator_user_id === me?.id ? t.counterpart_user_id : t.initiator_user_id;
            const iStarted = t.initiator_user_id === me?.id;
            const alreadyVouched = vouches.some((v) => v.trade_record_id === t.id);
            return (
              <View key={t.id} style={s.card}>
                <View style={s.cardHead}>
                  <Text style={s.cardName}>{users[other] ?? `user #${other}`}</Text>
                  <Text style={t.confirmed_by_counterpart ? s.ok : s.pending}>
                    {t.confirmed_by_counterpart ? "CONFIRMED" : "UNCONFIRMED"}
                  </Text>
                </View>
                <Text style={s.cardMeta}>
                  {iStarted ? "you logged it" : "they logged it"} · {t.occurred_at.slice(0, 10)}
                </Text>
                {t.note ? <Text style={s.cardNote}>{t.note}</Text> : null}
                <View style={s.cardActions}>
                  {!t.confirmed_by_counterpart && (
                    <Pressable style={s.smallBtn} onPress={() => confirm(t)}>
                      <Text style={s.smallBtnText}>Confirm it happened</Text>
                    </Pressable>
                  )}
                  {t.confirmed_by_counterpart && !alreadyVouched && (
                    <Pressable style={s.smallBtnOn} onPress={() => vouch(t)}>
                      <Text style={s.smallBtnOnText}>Vouch for them</Text>
                    </Pressable>
                  )}
                  {alreadyVouched && <Text style={s.vouched}>✓ vouch recorded</Text>}
                </View>
              </View>
            );
          })
      )}

      <Text style={s.label}>VOUCHES FOR YOU</Text>
      {vouches.length === 0 ? (
        <Text style={s.help}>None yet.</Text>
      ) : (
        vouches.map((v) => (
          <Text key={v.id} style={s.vouchLine}>
            ✓ {users[v.voucher_user_id] ?? `user #${v.voucher_user_id}`} vouched for you (trade #
            {v.trade_record_id})
          </Text>
        ))
      )}

      <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
        <Text style={{ color: T.muted, textAlign: "center" }}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  note: { color: T.muted, fontSize: 12, lineHeight: 18 },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 24, marginBottom: 8 },
  help: { color: T.faint, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.lineWarm, borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: T.brass, borderColor: T.brass },
  chipText: { color: T.creamDim, fontSize: 12 },
  chipTextOn: { color: T.ink, fontWeight: "700" },
  input: {
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 8,
    color: T.cream,
    fontSize: 16,
    padding: 12,
  },
  primary: { backgroundColor: T.brass, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: T.panel,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { color: T.cream, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: T.muted, fontSize: 11, marginTop: 3 },
  cardNote: { color: T.creamDim, fontSize: 13, marginTop: 6 },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" },
  ok: { color: T.trade, fontSize: 10, letterSpacing: 0.5 },
  pending: { color: T.faint, fontSize: 10, letterSpacing: 0.5 },
  smallBtn: {
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  smallBtnText: { color: T.creamDim, fontSize: 12 },
  smallBtnOn: { backgroundColor: T.brass, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 12 },
  smallBtnOnText: { color: T.ink, fontSize: 12, fontWeight: "700" },
  vouched: { color: T.trade, fontSize: 12 },
  vouchLine: { color: T.creamDim, fontSize: 13, marginBottom: 6 },
});
