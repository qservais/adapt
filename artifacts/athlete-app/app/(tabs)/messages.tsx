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

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const threadsQuery = useGetMessageThreads();

  const threads: MessageThread[] = threadsQuery.data ?? [];

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.screenTitle, { fontFamily: FONTS.title }]}>
          MESSAGES
        </Text>
      </View>

      {threads.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="message-circle" size={40} color={COLORS.textMuted} />
          <Text style={[styles.emptyTitle, { fontFamily: FONTS.bodyBold }]}>
            Aucune conversation
          </Text>
          <Text style={[styles.emptyDesc, { fontFamily: FONTS.body }]}>
            Ton coach te contactera ici une fois que vous serez connectés.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
          renderItem={({ item }) => {
            const initials = (item.userFirstName?.[0] ?? "?").toUpperCase();
            const hasUnread = (item.unreadCount ?? 0) > 0;
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/messages/[userId]",
                    params: { userId: item.userId },
                  })
                }
                style={styles.threadRow}
              >
                <View
                  style={[
                    styles.avatar,
                    hasUnread && { borderColor: COLORS.green },
                  ]}
                >
                  <Text style={[styles.initials, { fontFamily: FONTS.title }]}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.threadContent}>
                  <View style={styles.threadMeta}>
                    <Text
                      style={[
                        styles.threadName,
                        { fontFamily: hasUnread ? FONTS.bodyBold : FONTS.bodyMedium },
                        hasUnread && { color: COLORS.white },
                      ]}
                    >
                      {item.userFirstName ?? "Inconnu"}{" "}
                      {item.userLastName ?? ""}
                    </Text>
                    {item.lastMessageAt != null && (
                      <Text style={[styles.threadTime, { fontFamily: FONTS.mono }]}>
                        {new Date(item.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    )}
                  </View>
                  <View style={styles.threadPreviewRow}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.threadPreview,
                        { fontFamily: FONTS.body },
                        hasUnread && { color: COLORS.textSecondary },
                      ]}
                    >
                      {item.lastMessage ?? "Aucun message"}
                    </Text>
                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={[styles.unreadCount, { fontFamily: FONTS.monoBold }]}>
                          {item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={styles.separator} />
          )}
        />
      )}
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
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, color: COLORS.textSecondary },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: "center", lineHeight: 21 },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 20, color: COLORS.green },
  threadContent: { flex: 1 },
  threadMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  threadName: { fontSize: 16, color: COLORS.textSecondary },
  threadTime: { fontSize: 11, color: COLORS.textMuted },
  threadPreviewRow: { flexDirection: "row", alignItems: "center" },
  threadPreview: { flex: 1, fontSize: 14, color: COLORS.textMuted },
  unreadBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    marginLeft: 8,
  },
  unreadCount: { fontSize: 11, color: COLORS.bg },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 84,
  },
});
