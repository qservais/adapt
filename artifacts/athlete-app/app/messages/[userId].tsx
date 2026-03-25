import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode, Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetThreadMessages,
  useSendMessage,
  useGetMessageThreads,
  useUploadMessageMedia,
} from "@workspace/api-client-react";
import type { MessageData } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { COLORS, FONTS } from "@/constants/theme";

type RecordingState = "idle" | "recording" | "uploading";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<MessageData>>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, string>>({});
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const fullscreenVideoRef = useRef<Video | null>(null);
  const [fullscreenVideoUrl, setFullscreenVideoUrl] = useState<string | null>(null);

  const userIdStr = userId ?? "";
  const messagesQuery = useGetThreadMessages(userIdStr);
  const sendMutation = useSendMessage();
  const threadsQuery = useGetMessageThreads();
  const uploadMutation = useUploadMessageMedia();

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

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, []);

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

  const uploadToPresignedUrl = async (uri: string, uploadUrl: string, contentType: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    const url = new URL(uploadUrl);
    return url.origin + url.pathname;
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission refusée", "L'accès au micro est nécessaire pour les messages vocaux.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = rec;
      setRecording(rec);
      setRecordingState("recording");
      setRecordingDuration(0);
      durationTimer.current = setInterval(() => {
        setRecordingDuration((d) => {
          if (d >= 120) {
            stopRecordingFromRef();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn("Erreur enregistrement:", err);
    }
  };

  const stopRecordingFromRef = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    setRecordingState("uploading");
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      setRecording(null);
      if (!uri) throw new Error("URI manquant");

      const audioContentType = Platform.OS === "android" ? "audio/mp4" : "audio/m4a";
      const uploadResult = await uploadMutation.mutateAsync({
        data: { mediaType: "audio", contentType: audioContentType },
      });
      const { uploadUrl } = uploadResult;

      const rawUrl = await uploadToPresignedUrl(uri, uploadUrl, audioContentType);

      await sendMutation.mutateAsync({
        data: { recipientId: userIdStr, content: "", mediaType: "audio", mediaUrl: rawUrl },
      });
      messagesQuery.refetch();
      setTimeout(() => scrollToBottom(true), 150);
    } catch (err) {
      console.warn("Erreur upload audio:", err);
      Alert.alert("Erreur", "Impossible d'envoyer le message vocal.");
    } finally {
      setRecordingState("idle");
      setRecordingDuration(0);
    }
  };

  const handleMicPress = () => {
    if (recordingState === "recording") {
      stopRecordingFromRef();
    } else if (recordingState === "idle") {
      startRecording();
    }
  };

  const sendVideoAsset = async (uri: string, fileSize?: number, durationSecs?: number) => {
    if (fileSize && fileSize > 50 * 1024 * 1024) {
      Alert.alert("Fichier trop lourd", "La vidéo ne doit pas dépasser 50 Mo.");
      return;
    }
    if (durationSecs && durationSecs > 60) {
      Alert.alert("Vidéo trop longue", "La durée maximale est de 60 secondes.");
      return;
    }
    setVideoUri(uri);
    setVideoUploading(true);
    try {
      const uploadResult2 = await uploadMutation.mutateAsync({
        data: { mediaType: "video", contentType: "video/mp4" },
      });
      const { uploadUrl } = uploadResult2;
      const rawUrl = await uploadToPresignedUrl(uri, uploadUrl, "video/mp4");
      await sendMutation.mutateAsync({
        data: { recipientId: userIdStr, content: "", mediaType: "video", mediaUrl: rawUrl },
      });
      messagesQuery.refetch();
      setTimeout(() => scrollToBottom(true), 150);
    } catch (err) {
      console.warn("Erreur upload vidéo:", err);
      Alert.alert("Erreur", "Impossible d'envoyer la vidéo.");
    } finally {
      setVideoUri(null);
      setVideoUploading(false);
    }
  };

  const handleVideoAttach = () => {
    Alert.alert(
      "Envoyer une vidéo",
      "Choisir la source",
      [
        {
          text: "Galerie",
          onPress: async () => {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
              Alert.alert("Permission refusée", "L'accès à la galerie est nécessaire.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "videos",
              videoMaxDuration: 60,
              quality: 0.8,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              const durationSecs = asset.duration ? asset.duration / 1000 : undefined;
              await sendVideoAsset(asset.uri, asset.fileSize ?? undefined, durationSecs);
            }
          },
        },
        {
          text: "Caméra",
          onPress: async () => {
            const { granted } = await ImagePicker.requestCameraPermissionsAsync();
            if (!granted) {
              Alert.alert("Permission refusée", "L'accès à la caméra est nécessaire.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "videos",
              videoMaxDuration: 60,
              quality: 0.8,
              allowsEditing: false,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              const durationSecs = asset.duration ? asset.duration / 1000 : undefined;
              await sendVideoAsset(asset.uri, asset.fileSize ?? undefined, durationSecs);
            }
          },
        },
        { text: "Annuler", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const handlePlayAudio = async (url: string, msgId: string) => {
    try {
      if (audioPlaying === msgId) {
        await soundRef.current?.pauseAsync();
        setAudioPlaying(null);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setAudioPlaying(null);
          }
          if (status.isLoaded && status.durationMillis && !audioDurations[msgId]) {
            const secs = Math.round(status.durationMillis / 1000);
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            setAudioDurations((prev) => ({ ...prev, [msgId]: `${m}:${s.toString().padStart(2, "0")}` }));
          }
        }
      );
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis && !audioDurations[msgId]) {
        const secs = Math.round(status.durationMillis / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setAudioDurations((prev) => ({ ...prev, [msgId]: `${m}:${s.toString().padStart(2, "0")}` }));
      }
      soundRef.current = sound;
      setAudioPlaying(msgId);
    } catch (err) {
      console.warn("Erreur lecture audio:", err);
    }
  };

  const handleOpenFullscreenVideo = (url: string) => {
    setFullscreenVideoUrl(url);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const myId = user?.id != null ? String(user.id) : "";
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const renderMessage = ({ item, index }: { item: MessageData; index: number }) => {
    const isMe = item.senderId === myId;
    const prevItem = index > 0 ? messages[index - 1] : null;
    const showDate =
      prevItem == null ||
      new Date(item.createdAt).toDateString() !== new Date(prevItem.createdAt).toDateString();

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
        <View style={[styles.messageBubbleWrap, isMe ? styles.myMessageWrap : styles.theirMessageWrap]}>
          <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
            {item.mediaType === "audio" && item.mediaUrl ? (
              <TouchableOpacity
                style={styles.audioPlayer}
                onPress={() => handlePlayAudio(item.mediaUrl!, item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.audioPlayBtn, { backgroundColor: isMe ? COLORS.bg : COLORS.cyan }]}>
                  <Feather
                    name={audioPlaying === item.id ? "pause" : "play"}
                    size={16}
                    color={isMe ? COLORS.green : COLORS.bg}
                  />
                </View>
                <View style={styles.audioWave}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.audioBar,
                        {
                          height: 4 + Math.sin(i * 0.8) * 8 + 4,
                          backgroundColor: isMe
                            ? `${COLORS.bg}99`
                            : audioPlaying === item.id
                            ? COLORS.cyan
                            : COLORS.textMuted,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.audioDuration, { color: isMe ? `${COLORS.bg}80` : COLORS.textMuted }]}>
                  {audioDurations[item.id] ?? "0:00"}
                </Text>
              </TouchableOpacity>
            ) : item.mediaType === "video" && item.mediaUrl ? (
              <TouchableOpacity
                style={styles.videoThumbWrap}
                onPress={() => handleOpenFullscreenVideo(item.mediaUrl!)}
                activeOpacity={0.85}
              >
                <Video
                  source={{ uri: item.mediaUrl }}
                  style={styles.videoThumb}
                  resizeMode={ResizeMode.COVER}
                  isMuted
                  shouldPlay={false}
                />
                <View style={styles.videoPlayOverlay}>
                  <Feather name="play-circle" size={36} color="#fff" />
                </View>
              </TouchableOpacity>
            ) : (
              <Text
                style={[
                  styles.messageText,
                  { fontFamily: FONTS.body, color: isMe ? COLORS.bg : COLORS.textPrimary },
                ]}
              >
                {item.content}
              </Text>
            )}
            <Text
              style={[
                styles.messageTime,
                { fontFamily: FONTS.mono, color: isMe ? `${COLORS.bg}99` : COLORS.textMuted },
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.flex, { backgroundColor: COLORS.bg }]}
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
          <Text style={[styles.headerRole, { fontFamily: FONTS.mono }]}>COACH</Text>
        </View>
        {otherThread?.userAvatarUrl ? (
          <Image source={{ uri: otherThread.userAvatarUrl }} style={styles.avatarSmall} contentFit="cover" />
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
        contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollToBottom(false)}
        renderItem={renderMessage}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Feather name="message-circle" size={32} color={COLORS.textMuted} />
            <Text style={[styles.emptyChatText, { fontFamily: FONTS.body }]}>
              Pas encore de messages. Dis bonjour !
            </Text>
          </View>
        }
      />

      {recordingState === "recording" && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDot} />
          <Text style={[styles.recordingText, { fontFamily: FONTS.body }]}>
            Enregistrement… {formatDuration(recordingDuration)}
          </Text>
          <Text style={[styles.recordingHint, { fontFamily: FONTS.mono }]}>
            Appuie à nouveau pour envoyer
          </Text>
        </View>
      )}

      {videoUploading && (
        <View style={styles.recordingBanner}>
          <ActivityIndicator size="small" color={COLORS.cyan} />
          <Text style={[styles.recordingText, { fontFamily: FONTS.body }]}>
            Envoi de la vidéo…
          </Text>
        </View>
      )}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <TouchableOpacity
          onPress={handleVideoAttach}
          disabled={recordingState !== "idle" || videoUploading}
          style={[styles.mediaBtn, { opacity: recordingState !== "idle" || videoUploading ? 0.3 : 1 }]}
        >
          <Feather name="video" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

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
          editable={recordingState === "idle" && !videoUploading}
        />

        {text.trim() ? (
          <Pressable
            onPress={handleSend}
            disabled={sendMutation.isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              { opacity: sendMutation.isPending ? 0.4 : pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="send" size={20} color={COLORS.bg} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleMicPress}
            disabled={recordingState === "uploading" || videoUploading}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: recordingState === "recording" ? COLORS.red : COLORS.green,
                opacity: recordingState === "uploading" || videoUploading ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {recordingState === "uploading" ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Feather
                name={recordingState === "recording" ? "square" : "mic"}
                size={20}
                color={COLORS.bg}
              />
            )}
          </Pressable>
        )}
      </View>

      <Modal
        visible={fullscreenVideoUrl != null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenVideoUrl(null)}
      >
        <View style={styles.videoModal}>
          <TouchableOpacity
            style={styles.videoModalClose}
            onPress={() => setFullscreenVideoUrl(null)}
          >
            <Feather name="x" size={26} color="#fff" />
          </TouchableOpacity>
          {fullscreenVideoUrl && (
            <Video
              ref={fullscreenVideoRef}
              source={{ uri: fullscreenVideoUrl }}
              style={styles.videoModalPlayer}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
            />
          )}
        </View>
      </Modal>
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
  dateSeparator: { alignItems: "center", marginVertical: 12 },
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
  myBubble: { backgroundColor: COLORS.green, borderBottomRightRadius: 4 },
  theirBubble: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 21 },
  messageTime: { fontSize: 10, alignSelf: "flex-end" },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 160,
    paddingVertical: 2,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioWave: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2 },
  audioBar: { width: 3, borderRadius: 2 },
  audioDuration: { fontSize: 11, minWidth: 28 },
  videoThumbWrap: {
    width: 200,
    height: 130,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  videoThumb: { width: 200, height: 130 },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  videoModal: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  videoModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  videoModalPlayer: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  recordingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bgElevated,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  recordingText: { fontSize: 14, color: COLORS.textPrimary, flex: 1 },
  recordingHint: { fontSize: 11, color: COLORS.textMuted },
  emptyChat: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyChatText: { fontSize: 15, color: COLORS.textMuted },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  mediaBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
