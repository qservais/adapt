import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { tokenStore } from "./auth";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const baseUrl = domain ? `https://${domain}` : "";

let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

function getJwtExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { exp?: number };
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpiredOrExpiringSoon(token: string): boolean {
  const exp = getJwtExpiry(token);
  if (exp == null) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds + 30;
}

async function doRawRefresh(
  refreshTokenValue: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const url = baseUrl ? `${baseUrl}/api/auth/refresh` : "/api/auth/refresh";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { accessToken: string; refreshToken: string };
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (_isRefreshing) {
    return new Promise<string | null>((resolve) => {
      _refreshQueue.push(resolve);
    });
  }

  const rt = await tokenStore.getRefresh();
  if (!rt) return null;

  _isRefreshing = true;
  try {
    const result = await doRawRefresh(rt);
    if (!result) {
      await tokenStore.clear();
      _refreshQueue.forEach((cb) => cb(null));
      _refreshQueue = [];
      return null;
    }
    await tokenStore.setTokens(result.accessToken, result.refreshToken);
    _refreshQueue.forEach((cb) => cb(result.accessToken));
    _refreshQueue = [];
    return result.accessToken;
  } finally {
    _isRefreshing = false;
  }
}

async function getValidToken(): Promise<string | null> {
  const token = await tokenStore.getAccess();

  if (!token) {
    return refreshAccessToken();
  }

  if (isTokenExpiredOrExpiringSoon(token)) {
    await tokenStore.clear();
    return refreshAccessToken();
  }

  return token;
}

export function setupApiClient() {
  setBaseUrl(baseUrl || null);
  setAuthTokenGetter(getValidToken);
}
