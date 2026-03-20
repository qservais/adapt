import { tokenStore } from "./auth";
import { refreshToken } from "@workspace/api-client-react";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
  const rt = await tokenStore.getRefresh();
  if (!rt) return null;
  try {
    const res = await refreshToken({ refreshToken: rt });
    await tokenStore.setTokens(res.accessToken, res.refreshToken);
    return res.accessToken;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

export async function customFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await tokenStore.getAccess();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  let response = await fetch(fullUrl, { ...options, headers });

  if (response.status === 401) {
    if (isRefreshing) {
      const newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(fullUrl, { ...options, headers });
      } else {
        throw new Error("UNAUTHORIZED");
      }
    } else {
      isRefreshing = true;
      const newToken = await doRefresh();
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];

      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(fullUrl, { ...options, headers });
      } else {
        throw new Error("UNAUTHORIZED");
      }
    }
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const err = new Error(
      errBody?.error?.message || `HTTP ${response.status}`
    );
    (err as any).status = response.status;
    (err as any).code = errBody?.error?.code;
    throw err;
  }

  if (response.status === 204) return {} as T;
  return response.json();
}
