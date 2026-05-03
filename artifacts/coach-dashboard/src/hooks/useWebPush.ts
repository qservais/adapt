import { useCallback, useEffect, useState } from "react";

export type WebPushState =
  | "unsupported"
  | "loading"
  | "denied"
  | "granted-off"
  | "granted-on"
  | "error";

const SW_URL = "/coach-dashboard/sw-push.js";
const SW_SCOPE = "/coach-dashboard/";

function getToken(): string | null {
  return localStorage.getItem("adapt_coach_access");
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
}

async function fetchPublicKey(): Promise<string | null> {
  const res = await fetch("/api/users/web-push/public-key");
  if (!res.ok) return null;
  const json = (await res.json()) as { publicKey?: string };
  return json.publicKey ?? null;
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const token = getToken();
  const res = await fetch("/api/users/web-push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) throw new Error(`subscribe failed: ${res.status}`);
}

async function deleteSubscription(endpoint: string): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/users/web-push/subscribe", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) throw new Error(`unsubscribe failed: ${res.status}`);
}

export function useWebPush() {
  const [state, setState] = useState<WebPushState>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (Notification.permission === "granted" && sub) setState("granted-on");
      else if (Notification.permission === "granted" && !sub) setState("granted-off");
      else setState("granted-off");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!isSupported()) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "granted-off");
        return;
      }
      const publicKey = await fetchPublicKey();
      if (!publicKey) {
        setState("error");
        return;
      }
      const reg = await getRegistration();
      if (!reg) {
        setState("error");
        return;
      }
      // If a stale subscription exists for a different VAPID key, drop it.
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => {});
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
      try {
        await postSubscription(sub);
      } catch (err) {
        // Backend rejected — roll back the browser-side subscription so the
        // UI state matches reality and the user can retry.
        await sub.unsubscribe().catch(() => {});
        throw err;
      }
      setState("granted-on");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (!isSupported()) return;
    setBusy(true);
    try {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        // Tell backend first so we don't keep sending to a dead endpoint
        // if the browser unsubscribe somehow succeeds but the API call fails.
        await deleteSubscription(endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setState("granted-off");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, refresh };
}
