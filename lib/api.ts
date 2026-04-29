import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const REPLIT_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const DIRECT_API_BASE = process.env.EXPO_PUBLIC_API_BASE;

// Always route through the local api-server proxy. This works for both:
//   - the web preview (cross-origin to myorg.maddar.sa would otherwise be
//     blocked by CORS), and
//   - native Expo Go on a real device (no CORS, but using the same code path
//     keeps cookie handling identical and avoids surprises).
//
// The proxy exposes the upstream Set-Cookie via a custom header
// (X-Upstream-Set-Cookie) that we store ourselves, and accepts the stored
// cookie back via X-Upstream-Cookie. This avoids browser cookie/credentials
// CORS rules entirely.
export const API_BASE = DIRECT_API_BASE
  ? DIRECT_API_BASE.replace(/\/+$/, "")
  : REPLIT_DOMAIN
    ? `https://${REPLIT_DOMAIN}/api/maddar`
    : "https://myorg.maddar.sa/api";

const COOKIE_KEY = "maddar.cookie";

let cookieCache: string | null = null;

export async function loadCookie(): Promise<string | null> {
  if (cookieCache !== null) return cookieCache;
  cookieCache = await AsyncStorage.getItem(COOKIE_KEY);
  return cookieCache;
}

export async function saveCookie(cookie: string | null) {
  cookieCache = cookie;
  if (cookie) await AsyncStorage.setItem(COOKIE_KEY, cookie);
  else await AsyncStorage.removeItem(COOKIE_KEY);
}

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; status?: number };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const cookie = await loadCookie();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (cookie) headers["X-Upstream-Cookie"] = cookie;

  // Callers pass paths like "/api/auth/login". Strip the leading "/api"
  // because API_BASE already ends in "/api/maddar" on the proxy.
  const normalized = path.startsWith("/api/") ? path.substring(4) : path;

  try {
    const res = await fetch(`${API_BASE}${normalized}`, {
      ...options,
      headers,
    });

    const fresh =
      res.headers.get("x-upstream-set-cookie") ??
      getCookiePairsFromSetCookieHeader(
        res.headers.get("set-cookie") || res.headers.get("Set-Cookie"),
      );
    if (fresh) {
      // Merge: keep existing pairs not present in the fresh set, then overlay.
      const merged = mergeCookies(cookie, fresh);
      await saveCookie(merged);
    }

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      return {
        ok: false,
        error: "استجابة غير صالحة من الخادم",
        status: res.status,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        error: extractErrorMessage(json, res.status),
        status: res.status,
      };
    }
    if (json && typeof json === "object" && "ok" in json) {
      if (json.ok) return { ok: true, data: json.data as T };
      return { ok: false, error: json.error || "حدث خطأ غير معروف" };
    }
    return { ok: true, data: json as T };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "تعذّر الاتصال بالخادم",
    };
  }
}

function mergeCookies(existing: string | null, fresh: string): string {
  const map = new Map<string, string>();
  const add = (str: string | null) => {
    if (!str) return;
    for (const pair of str.split(/;\s*/)) {
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      map.set(pair.substring(0, eq).trim(), pair.substring(eq + 1).trim());
    }
  };
  add(existing);
  add(fresh);
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function getCookiePairsFromSetCookieHeader(setCookie: string | null): string | null {
  if (!setCookie) return null;
  // Keep only "name=value" pairs from a potentially full Set-Cookie header.
  const pairs = setCookie
    .split(/,(?=\s*[^;,\s]+=)/)
    .map((part) => part.split(";")[0]?.trim())
    .filter((p): p is string => Boolean(p && p.includes("=")));
  return pairs.length ? pairs.join("; ") : null;
}

function extractErrorMessage(json: any, status: number): string {
  const errorValue = json?.error;
  if (typeof errorValue === "string" && errorValue.trim()) return errorValue;
  if (errorValue && typeof errorValue === "object") {
    const nested =
      (typeof errorValue.message === "string" && errorValue.message) ||
      (typeof errorValue.error === "string" && errorValue.error);
    if (nested) return nested;
  }
  if (typeof json?.message === "string" && json.message.trim()) return json.message;
  return `خطأ ${status}`;
}

// Reference to silence unused import warning on platforms that don't need it.
void Platform;

export const api = {
  get: <T = any>(p: string) => apiRequest<T>(p, { method: "GET" }),
  post: <T = any>(p: string, body?: any) =>
    apiRequest<T>(p, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(p: string, body?: any) =>
    apiRequest<T>(p, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(p: string) => apiRequest<T>(p, { method: "DELETE" }),
};
