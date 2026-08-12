import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, type ColorValue, Text, View } from "react-native";

import { AuthProvider, useAuth } from "../auth";
import Login from "../screens/login";
import { T } from "../theme";

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

function RootNav() {
  const { me, loading } = useAuth();

  if (loading && !me) {
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
