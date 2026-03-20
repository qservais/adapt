import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

// The API is served from the same domain under /api
setBaseUrl(""); 

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAuthToken(refreshToken: string): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
    .then(res => {
      if (!res.ok) throw new Error("Refresh failed");
      return res.json();
    })
    .then(data => {
      localStorage.setItem('adapt_coach_access', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('adapt_coach_refresh', data.refreshToken);
      }
      return data.accessToken;
    })
    .catch(() => {
      localStorage.removeItem('adapt_coach_access');
      localStorage.removeItem('adapt_coach_refresh');
      // Optional: force reload to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return null;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

setAuthTokenGetter(async () => {
  const access = localStorage.getItem('adapt_coach_access');
  const refresh = localStorage.getItem('adapt_coach_refresh');

  if (!access) return null;

  try {
    const payloadBase64 = access.split('.')[1];
    if (!payloadBase64) return access;

    const decoded = JSON.parse(atob(payloadBase64));
    const exp = decoded.exp * 1000;

    // Refresh if within 30 seconds of expiry
    if (Date.now() >= exp - 30000) {
      if (!refresh) {
        localStorage.removeItem('adapt_coach_access');
        return null;
      }
      return await refreshAuthToken(refresh);
    }
    
    return access;
  } catch (e) {
    console.error("Token decode error", e);
    return access;
  }
});
