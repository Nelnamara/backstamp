import * as Linking from "expo-linking";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";

import { AuthProvider, useAuth } from "../auth";
import Login from "../screens/login";
import { T } from "../theme";

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

/** Pull a magic-link token out of any URL the app was opened with. */
function tokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { queryParams } = Linking.parse(url);
    const t = queryParams?.token;
    return typeof t === "string" && t ? t : null;
  } catch {
    return null;
  }
}

function RootNav() {
  const { me, booting, loading, verify } = useAuth();

  // Deep link: tapping the "Open Backstamp & sign in" button in the email
  // opens backstamp://verify?token=... — catch it (both cold-start and
  // while already running) and complete sign-in with no copy/paste.
  useEffect(() => {
    let cancelled = false;
    Linking.getInitialURL().then((url) => {
      const t = tokenFromUrl(url);
      if (t && !cancelled) verify(t).catch(() => {});
    });
    const sub = Linking.addEventListener("url", ({ url }) => {
      const t = tokenFromUrl(url);
      if (t) verify(t).catch(() => {});
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [verify]);

  if (booting || (loading && !me)) {
    return (
      <View style={{ flex: 1, backgroundColor: T.case, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={T.brass} />
      </View>
    );
  }

  if (!me) return <Login />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: T.case },
        headerTintColor: T.brass,
        headerTitleStyle: { letterSpacing: 3, fontWeight: "600" },
        tabBarStyle: { backgroundColor: T.case, borderTopColor: T.lineBrass },
        tabBarActiveTintColor: T.brassBright,
        tabBarInactiveTintColor: T.faint,
        sceneStyle: { backgroundColor: T.case },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "BACKSTAMP",
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <TabGlyph glyph="◆" color={color} />,
        }}
      />
      <Tabs.Screen
        name="curate"
        options={{
          title: "Curate",
          tabBarIcon: ({ color }) => <TabGlyph glyph="◈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="acquire"
        options={{
          title: "Acquire",
          tabBarIcon: ({ color }) => <TabGlyph glyph="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color }) => <TabGlyph glyph="◇" color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNav />
    </AuthProvider>
  );
}
