import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_KEY = "adapt_access_token";
const REFRESH_KEY = "adapt_refresh_token";

const webStore: Record<string, string> = {};

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    webStore[key] = value;
    try { localStorage.setItem(key, value); } catch {}
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(key); } catch {}
    return webStore[key] ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    delete webStore[key];
    try { localStorage.removeItem(key); } catch {}
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const tokenStore = {
  getAccess: () => getItem(ACCESS_KEY),
  getRefresh: () => getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) =>
    Promise.all([setItem(ACCESS_KEY, access), setItem(REFRESH_KEY, refresh)]),
  clear: () => Promise.all([removeItem(ACCESS_KEY), removeItem(REFRESH_KEY)]),
};
