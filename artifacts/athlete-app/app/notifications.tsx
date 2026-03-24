import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getGetNotificationsQueryKey,
  type NotificationItem,
} from "@workspace/api-client-react";
import { COLORS } from "@/constants/theme";

function notifIconName(type: string): React.ComponentProps<typeof Feather>["name"] {
  switch (type) {
    case "session_reminder": return "clock";
    case "checkin_reminder": return "check-circle";
    case "message": return "message-circle";
    case "encouragement": return "star";
    case "challenge": return "zap";
    default: return "alert-triangle";
  }
}

function notifIconColor(type: string): string {
  switch (type) {
    case "session_reminder": return COLORS.cyan;
    case "checkin_reminder": return COLORS.green;
    case "message": return COLORS.violet;
    case "encouragement": return COLORS.amber;
    case "challenge": return COLORS.cyan;
    default: return COLORS.amber;
  }
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Il y a ${days}j`;
}

const SAFE_LINK_PREFIXES = ["/", "checkin", "session", "messages", "stats", "profile", "notifications", "badges", "weekly-recap"];

function isSafeLink(link?: string | null): link is string {
  if (!link) return false;
  return SAFE_LINK_PREFIXES.some((p) => link.startsWith(p) || link.startsWith(`/${p}`));
}

function NotifRow({ item, onRead, onNavigate }: { item: NotificationItem; onRead: (id: string) => void; onNavigate: (link: Href) => void }) {
  function handlePress() {
    if (!item.isRead) onRead(item.id);
    if (isSafeLink(item.link)) {
      const path: Href = (item.link.startsWith("/") ? item.link : `/${item.link}`) as Href;
      onNavigate(path);
    }
  }
  return (
    <TouchableOpacity
      style={[styles.row, !item.isRead && styles.rowUnread]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Feather name={notifIconName(item.type)} size={18} color={notifIconColor(item.type)} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, !item.isRead && styles.rowTitleBold]}>{item.title}</Text>
        {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
        <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useGetNotifications({
    query: { queryKey: getGetNotificationsQueryKey(), refetchOnMount: true },
  });

  const { mutate: markAll } = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const { mutate: markOne } = useMarkNotificationRead({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const items = data?.items ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {(data?.unreadCount ?? 0) > 0 && (
          <TouchableOpacity onPress={() => markAll()} style={styles.markAllBtn}>
            <Feather name="check-square" size={18} color={COLORS.cyan} />
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.cyan} style={{ marginTop: 48 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Aucune notification</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotifRow item={item} onRead={(id) => markOne(id)} onNavigate={(path) => router.push(path)} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllText: {
    fontSize: 13,
    color: COLORS.cyan,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  rowUnread: {
    backgroundColor: "rgba(0,240,255,0.04)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  rowTitleBold: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  rowBody: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  rowTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.cyan,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
});
