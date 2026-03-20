import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { tokenStore } from "./auth";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
const baseUrl = domain ? `https://${domain}` : "";

export function setupApiClient() {
  setBaseUrl(baseUrl || null);
  setAuthTokenGetter(() => tokenStore.getAccess());
}
