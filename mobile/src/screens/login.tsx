import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../auth";
import { T } from "../theme";

// Pull the token out of a pasted magic-link URL, or accept a raw token.
function extractToken(input: string): string {
  const m = input.match(/[?&]token=([^&\s]+)/);
  return (m ? m[1] : input).trim();
}

export default function Login() {
  const { requestLogin, requestSignup, verify, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [invite, setInvite] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await requestLogin(email.trim());
      else await requestSignup(email.trim(), username.trim(), invite.trim());
      setStep("verify");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function completeVerify() {
    setBusy(true);
    setError(null);
    try {
      await verify(extractToken(linkToken));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.case }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Text style={s.wordmark}>BACKSTAMP</Text>

        {step === "request" ? (
          <View style={s.card}>
            <View style={s.tabs}>
              <Pressable onPress={() => setMode("signin")} style={s.tabBtn}>
                <Text style={[s.tab, mode === "signin" && s.tabActive]}>Sign in</Text>
              </Pressable>
              <Pressable onPress={() => setMode("signup")} style={s.tabBtn}>
                <Text style={[s.tab, mode === "signup" && s.tabActive]}>Sign up</Text>
              </Pressable>
            </View>

            <Text style={s.label}>EMAIL</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={T.faint}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {mode === "signup" && (
              <>
                <Text style={s.label}>USERNAME</Text>
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="How you'll appear"
                  placeholderTextColor={T.faint}
                  autoCapitalize="none"
                />
                <Text style={s.label}>INVITE CODE</Text>
                <TextInput
                  style={s.input}
                  value={invite}
                  onChangeText={setInvite}
                  placeholder="From someone already in"
                  placeholderTextColor={T.faint}
                  autoCapitalize="none"
                />
              </>
            )}

            {error && <Text style={s.error}>{error}</Text>}

            <Pressable style={s.primary} onPress={sendLink} disabled={busy}>
              <Text style={s.primaryText}>{busy ? "Sending…" : "Email me a sign-in link"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.sent}>
              Check your email for a sign-in link. Open it, copy the link (or just the token), and
              paste it below.
            </Text>
            <Text style={s.label}>SIGN-IN LINK OR TOKEN</Text>
            <TextInput
              style={[s.input, { minHeight: 64 }]}
              value={linkToken}
              onChangeText={setLinkToken}
              placeholder="Paste the link from your email"
              placeholderTextColor={T.faint}
              autoCapitalize="none"
              multiline
            />
            {error && <Text style={s.error}>{error}</Text>}
            <Pressable style={s.primary} onPress={completeVerify} disabled={busy || loading}>
              <Text style={s.primaryText}>{busy || loading ? "Signing in…" : "Sign in"}</Text>
            </Pressable>
            <Pressable onPress={() => setStep("request")}>
              <Text style={s.backLink}>← Use a different email</Text>
            </Pressable>
          </View>
        )}

        {loading && <ActivityIndicator color={T.brass} style={{ marginTop: 20 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  wordmark: {
    color: T.brass,
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: T.panel,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 22,
  },
  tabs: { flexDirection: "row", borderBottomColor: T.line, borderBottomWidth: 1, marginBottom: 16 },
  tabBtn: { flex: 1, paddingBottom: 10 },
  tab: { color: T.muted, textAlign: "center", fontSize: 14 },
  tabActive: { color: T.cream, fontWeight: "600" },
  label: { color: T.muted, fontSize: 10, letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: T.panelDeep,
    borderColor: T.lineWarm,
    borderWidth: 1,
    borderRadius: 8,
    color: T.cream,
    fontSize: 16,
    padding: 12,
  },
  sent: { color: T.creamDim, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  error: { color: "#d98a7b", fontSize: 13, marginTop: 12 },
  primary: {
    backgroundColor: T.brass,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 18,
  },
  primaryText: { color: T.ink, fontWeight: "700", fontSize: 15 },
  backLink: { color: T.muted, textAlign: "center", marginTop: 14, fontSize: 13 },
});
