import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGetNotifications, getGetNotificationsQueryKey } from "@workspace/api-client-react";

interface Props {
  top: number;
  right?: number;
}

export function NotificationBell({ top, right = 16 }: Props) {
  const router = useRouter();
  const { data } = useGetNotifications({
    query: {
      queryKey: getGetNotificationsQueryKey(),
      refetchInterval: 30000,
      select: (d) => d,
    },
  });
  const unread = data?.unreadCount ?? 0;

  return (
    <TouchableOpacity
      style={[styles.container, { top, right }]}
      onPress={() => router.push("/notifications")}
      activeOpacity={0.7}
      accessibilityLabel="Notifications"
    >
      <Feather name="bell" size={22} color="#E5E7EB" />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 100,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#A855F7",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12,
  },
});
