import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetThreadMessages,
  useSendMessage,
  useGetMessageThreads,
} from "@workspace/api-client-react";
import type { MessageData } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<MessageData>>(null);

  const userIdStr = userId ?? "";
  const messagesQuery = useGetThreadMessages(userIdStr);
  const sendMutation = useSendMessage();
  const threadsQuery = useGetMessageThreads();

  const otherThread = threadsQuery.data?.find((t) => t.userId === userIdStr);

  const messages: MessageData[] = messagesQuery.data ?? [];

  const scrollToBottom = (animated: boolean) => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(false), 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      await sendMutation.mutateAsync({
        data: { recipientId: userIdStr, content: trimmed },
      });
      messagesQuery.refetch();
      setTimeout(() => scrollToBottom(true), 150);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible d'envoyer";
      console.warn(msg);
    }
  };

  const myId = user?.id != null ? String(user.id) : "";
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[styles.chatHeader, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { fontFamily: FONTS.bodyBold }]}>
            {otherThread?.userFirstName ?? "Coach"}{" "}
            {otherThread?.userLastName ?? ""}
          </Text>
          <Text style={[styles.headerRole, { fontFamily: FONTS.mono }]}>
            COACH
          </Text>
        </View>
        {otherThread?.userAvatarUrl ? (
          <Image
            source={{ uri: otherThread.userAvatarUrl }}
            style={styles.avatarSmall}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarSmall}>
            <Text style={[styles.avatarInitial, { fontFamily: FONTS.title }]}>
              {(otherThread?.userFirstName?.[0] ?? "C").toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollToBottom(false)}
        renderItem={({ item, index }) => {
          const isMe = item.senderId === myId;
          const prevItem = index > 0 ? messages[index - 1] : null;
          const showDate =
            prevItem == null ||
            new Date(item.createdAt).toDateString() !==
              new Date(prevItem.createdAt).toDateString();
          return (
            <>
              {showDate && (
                <View style={styles.dateSeparator}>
                  <Text style={[styles.dateText, { fontFamily: FONTS.mono }]}>
                    {new Date(item.createdAt).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.messageBubbleWrap,
                  isMe ? styles.myMessageWrap : styles.theirMessageWrap,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        fontFamily: FONTS.body,
                        color: isMe ? COLORS.bg : COLORS.textPrimary,
                      },
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      {
                        fontFamily: FONTS.mono,
                        color: isMe ? `${COLORS.bg}99` : COLORS.textMuted,
                      },
                    ]}
                  >
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            </>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Feather name="message-circle" size={32} color={COLORS.textMuted} />
            <Text style={[styles.emptyChatText, { fontFamily: FONTS.body }]}>
              Pas encore de messages. Dis bonjour !
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.inputBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={COLORS.textMuted}
          style={[styles.textInput, { fontFamily: FONTS.body }]}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          onFocus={() => setTimeout(() => scrollToBottom(true), 300)}
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          style={({ pressed }) => [
            styles.sendBtn,
            { opacity: !text.trim() || sendMutation.isPending ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="send" size={20} color={COLORS.bg} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, color: COLORS.white },
  headerRole: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 1.5, marginTop: 1 },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.greenDim,
    borderWidth: 1,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 16, color: COLORS.green },
  messageList: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  messageBubbleWrap: { marginBottom: 2 },
  myMessageWrap: { alignItems: "flex-end" },
  theirMessageWrap: { alignItems: "flex-start" },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  myBubble: {
    backgroundColor: COLORS.green,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 21 },
  messageTime: { fontSize: 10, alignSelf: "flex-end" },
  emptyChat: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyChatText: { fontSize: 15, color: COLORS.textMuted },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
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
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
});
