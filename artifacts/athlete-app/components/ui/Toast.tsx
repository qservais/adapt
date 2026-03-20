import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, FONTS } from "@/constants/theme";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  show: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const TYPE_CONFIG: Record<ToastType, { color: string; icon: keyof typeof Feather.glyphMap }> = {
  success: { color: COLORS.green, icon: "check-circle" },
  error: { color: COLORS.red, icon: "x-circle" },
  warning: { color: COLORS.amber, icon: "alert-triangle" },
  info: { color: COLORS.cyan, icon: "info" },
};

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const ty = useSharedValue(-100);
  const cfg = TYPE_CONFIG[toast.type];

  React.useEffect(() => {
    ty.value = withSequence(
      withTiming(0, { duration: 300 }),
      withTiming(0, { duration: 3000 }),
      withTiming(-120, { duration: 300 })
    );
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.toast,
        { top: insets.top + 12, borderColor: `${cfg.color}40` },
        animStyle,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${cfg.color}20` }]}>
        <Feather name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { fontFamily: FONTS.bodySemiBold, color: cfg.color }]}>
          {toast.title}
        </Text>
        {toast.message ? (
          <Text style={[styles.msg, { fontFamily: FONTS.body }]}>{toast.message}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counter = useRef(0);

  const show = useCallback((type: ToastType, title: string, message?: string) => {
    const haptic: Record<ToastType, () => void> = {
      success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
      info: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    };
    haptic[type]?.();
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-2), { id, type, title, message }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextType = {
    show,
    success: (t, m) => show("success", t, m),
    error: (t, m) => show("error", t, m),
    warning: (t, m) => show("warning", t, m),
    info: (t, m) => show("info", t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
  },
  msg: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
