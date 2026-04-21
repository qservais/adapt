import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGetNotifications, getGetNotificationsQueryKey, useGetMessageThreads, getGetMessageThreadsQueryKey } from "@workspace/api-client-react";

interface Props {
  top: number;
  right?: number;
}

export function NotificationBell({ top, right = 16 }: Props) {
  const router = useRouter();
  const { data: notifData } = useGetNotifications(undefined, {
    query: {
      queryKey: getGetNotificationsQueryKey(),
      refetchInterval: 30000,
    },
  });
  const { data: threads } = useGetMessageThreads({
    query: { queryKey: getGetMessageThreadsQueryKey(), refetchInterval: 30000 },
  });

  const unreadNotifs = notifData?.unreadCount ?? 0;
  const unreadMessages = (threads ?? []).reduce((sum, t) => sum + (t.unreadCount ?? 0), 0);
  const unread = unreadNotifs + unreadMessages;

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
