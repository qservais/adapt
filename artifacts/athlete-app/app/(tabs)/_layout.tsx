import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/theme";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useGetMessageThreads } from "@workspace/api-client-react";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 14,
  },
});

function useUnreadMessageCount() {
  const threadsQuery = useGetMessageThreads();
  const threads = threadsQuery.data ?? [];
  return threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);
}

function NativeTabLayout() {
  const insets = useSafeAreaInsets();
  const bellTop = Math.max(insets.top - 28, 8);
  return (
    <View style={{ flex: 1 }}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Accueil</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="session">
          <Icon sf={{ default: "bolt", selected: "bolt.fill" }} />
          <Label>Séance</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="stats">
          <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
          <Label>Stats</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="messages">
          <Icon sf={{ default: "message", selected: "message.fill" }} />
          <Label>Messages</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person", selected: "person.fill" }} />
          <Label>Profil</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <NotificationBell top={bellTop} />
    </View>
  );
}

function TabIcon({
  name,
  color,
  focused,
  sfSymbol,
  badge,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  color: string;
  focused: boolean;
  sfSymbol?: string;
  badge?: number;
}) {
  const isIOS = Platform.OS === "ios";
  return (
    <View style={tabIconStyles.wrapper}>
      <View>
        {isIOS && sfSymbol ? (
          <SymbolView name={sfSymbol as any} tintColor={color} size={22} />
        ) : (
          <Feather name={name} size={22} color={color} />
        )}
        {badge != null && badge > 0 && <UnreadBadge count={badge} />}
      </View>
      {focused && <View style={[tabIconStyles.dot, { backgroundColor: COLORS.cyan }]} />}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const tabHeight = isWeb ? 84 : isIOS ? 88 : 64;
  const insets = useSafeAreaInsets();
  const bellTop = Math.max(insets.top - 28, 8);
  const unreadCount = useUnreadMessageCount();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.cyan,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "500",
            marginTop: -2,
          },
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : COLORS.bgCard,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            elevation: 0,
            height: tabHeight,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={90}
                tint="dark"
                style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.85)" }]}
              />
            ) : isWeb ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bgCard }]} />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Accueil",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home" sfSymbol="house" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="session"
          options={{
            title: "Séance",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="zap" sfSymbol="bolt" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Stats",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="bar-chart-2" sfSymbol="chart.bar" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="message-circle"
                sfSymbol="message"
                color={color}
                focused={focused}
                badge={unreadCount}
              />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="user" sfSymbol="person" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
      <NotificationBell top={bellTop} />
    </View>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
