import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import { customFetch } from "@workspace/api-client-react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getSyncedTokenKey(userId: string): string {
  return `@adapt/push_token_synced_${userId}`;
}

function getExpoProjectId(): string | undefined {
  if (Constants.easConfig?.projectId) {
    return Constants.easConfig.projectId;
  }
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const eas = extra?.["eas"] as Record<string, unknown> | undefined;
  return typeof eas?.["projectId"] === "string" ? eas["projectId"] : undefined;
}

async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00F0FF",
    });
  }

  const projectId = getExpoProjectId();
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const pushToken = tokenData.data;

  const syncKey = getSyncedTokenKey(userId);
  const lastSyncedToken = await AsyncStorage.getItem(syncKey);
  if (lastSyncedToken === pushToken) return;

  try {
    await customFetch("/api/users/push-token", {
      method: "POST",
      body: JSON.stringify({ token: pushToken }),
    });
    await AsyncStorage.setItem(syncKey, pushToken);
  } catch (err) {
    console.warn("[PushNotifications] Failed to register push token with API:", err);
  }
}

async function clearSyncedToken(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getSyncedTokenKey(userId));
  } catch {
  }
}

function navigateFromLink(link: unknown): void {
  if (typeof link !== "string" || !link) return;
  try {
    router.push(link as never);
  } catch (err) {
    console.warn("[PushNotifications] Failed to navigate from push notification link:", err);
  }
}

async function handleInitialNotification(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    const data = response.notification.request.content.data as Record<string, unknown>;
    navigateFromLink(data["link"]);
  }
}

export function usePushNotifications(userId: string | null): void {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const initialHandled = useRef(false);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      if (prevUserId.current) {
        clearSyncedToken(prevUserId.current).catch(() => {});
        prevUserId.current = null;
      }
      return;
    }

    if (prevUserId.current && prevUserId.current !== userId) {
      clearSyncedToken(prevUserId.current).catch(() => {});
    }
    prevUserId.current = userId;

    registerPushToken(userId).catch((err) => {
      console.warn("[PushNotifications] Token registration failed:", err);
    });

    if (!initialHandled.current) {
      initialHandled.current = true;
      handleInitialNotification().catch((err) => {
        console.warn("[PushNotifications] Initial notification handling failed:", err);
      });
    }
  }, [userId]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      navigateFromLink(data["link"]);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
