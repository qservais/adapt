import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useGetMessageThreads } from "@workspace/api-client-react";
import type { MessageThread } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";

function getInitials(first: string, last?: string | null) {
  return (first[0] + (last?.[0] ?? "")).toUpperCase();
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ThreadRow({ item }: { item: MessageThread }) {
  const initials = getInitials(item.userFirstName, item.userLastName);
  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/messages/[userId]" as any,
          params: {
            userId: item.userId,
            name: `${item.userFirstName} ${item.userLastName ?? ""}`.trim(),
          },
        })
      }
      style={styles.threadRow}
    >
      <View style={styles.avatar}>
        <Text style={[styles.initials, { fontFamily: FONTS.bodySemiBold }]}>
          {initials}
        </Text>
        {item.unreadCount > 0 && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.threadInfo}>
        <View style={styles.threadTop}>
          <Text
            style={[
              styles.threadName,
              { fontFamily: FONTS.bodySemiBold },
              item.unreadCount > 0 && { color: COLORS.white },
            ]}
          >
            {item.userFirstName} {item.userLastName ?? ""}
          </Text>
          {item.lastMessageAt && (
            <Text style={[styles.threadTime, { fontFamily: FONTS.mono }]}>
              {timeAgo(item.lastMessageAt)}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.threadPreview,
            { fontFamily: FONTS.body },
            item.unreadCount > 0 && { color: COLORS.textPrimary },
          ]}
          numberOfLines={1}
        >
          {item.lastMessage ?? "No messages yet"}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { fontFamily: FONTS.monoBold }]}>
            {item.unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const threadsQuery = useGetMessageThreads();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>MESSAGES</Text>
      </View>
      <FlatList
        data={threadsQuery.data ?? []}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => <ThreadRow item={item} />}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        scrollEnabled={!!(threadsQuery.data?.length)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={COLORS.textMuted} />
            <Text style={[styles.emptyTitle, { fontFamily: FONTS.bodyBold }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptyDesc, { fontFamily: FONTS.body }]}>
              Your coach will reach out here once linked.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: { fontSize: 44, color: COLORS.white, letterSpacing: 5 },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  initials: { fontSize: 18, color: COLORS.green },
  unreadDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  threadInfo: { flex: 1 },
  threadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  threadName: { fontSize: 15, color: COLORS.textSecondary },
  threadTime: { fontSize: 11, color: COLORS.textMuted },
  threadPreview: { fontSize: 13, color: COLORS.textMuted },
  badge: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, color: COLORS.bg },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: { fontSize: 18, color: COLORS.white },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center" },
});
