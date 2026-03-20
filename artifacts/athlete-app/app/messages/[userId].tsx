import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  useGetThreadMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import type { MessageData } from "@workspace/api-client-react";
import { COLORS, FONTS } from "@/constants/theme";

function MessageBubble({
  message,
  isOwn,
}: {
  message: MessageData;
  isOwn: boolean;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={[
        styles.bubbleWrap,
        isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { fontFamily: FONTS.body },
            isOwn && { color: COLORS.bg },
          ]}
        >
          {message.content}
        </Text>
      </View>
      <Text style={[styles.bubbleTime, { fontFamily: FONTS.mono }]}>{time}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ userId: string; name: string }>();
  const { userId, name } = params;

  const messagesQuery = useGetThreadMessages(userId);
  const sendMutation = useSendMessage();

  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const messages = messagesQuery.data ?? [];
  const bottomPad = Platform.OS === "web" ? Math.max(insets.bottom, 34) : insets.bottom;

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    try {
      await sendMutation.mutateAsync({
        data: { recipientId: userId, content },
      });
      messagesQuery.refetch();
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={[styles.headerInitials, { fontFamily: FONTS.bodySemiBold }]}>
              {(name ?? "?")[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.headerName, { fontFamily: FONTS.bodyBold }]}>
              {name ?? "Coach"}
            </Text>
            <Text style={[styles.headerSub, { fontFamily: FONTS.mono }]}>Coach</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.senderId === user?.id} />
        )}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!messages.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={40} color={COLORS.textMuted} />
            <Text style={[styles.emptyText, { fontFamily: FONTS.body }]}>
              No messages yet. Say hello!
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputBar,
          { paddingBottom: Math.max(bottomPad, 12) },
        ]}
      >
        <TextInput
          style={[styles.input, { fontFamily: FONTS.body }]}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() ? COLORS.green : COLORS.bgElevated },
          ]}
        >
          <Feather
            name="send"
            size={18}
            color={text.trim() ? COLORS.bg : COLORS.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    backgroundColor: COLORS.bg,
  },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInitials: { fontSize: 16, color: COLORS.green },
  headerName: { fontSize: 16, color: COLORS.white },
  headerSub: { fontSize: 11, color: COLORS.textMuted },
  bubbleWrap: { marginVertical: 3 },
  bubbleWrapOwn: { alignItems: "flex-end" },
  bubbleWrapOther: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: COLORS.green,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 22 },
  bubbleTime: { fontSize: 10, color: COLORS.textMuted, marginHorizontal: 4, marginTop: 2 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
