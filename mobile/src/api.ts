import Constants from "expo-constants";

// The phone can't reach "localhost:8000" — that's the phone itself.
// When the app runs through the Expo dev server, Constants exposes the
// dev machine's LAN address (the host Metro is served from). We reuse
// that host and point at port 8000 where FastAPI runs. So as long as the
// phone and the PC are on the same WiFi, this "just works" with no manual
// IP entry. Override with EXPO_PUBLIC_API_BASE if you ever need to.
function resolveBase(): string {
  const override = process.env.EXPO_PUBLIC_API_BASE;
  if (override) return override;
  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || "";
  const host = hostUri.split(":")[0];
  if (host) return `http://${host}:8000`;
  return "http://localhost:8000";
}

export const API_BASE = resolveBase();

let authToken: string | null = null;
export function setToken(t: string | null) {
  authToken = t;
}
export function getToken(): string | null {
  return authToken;
}

/** Multipart upload (photos). Sends the Bearer token like api() does; does
 *  NOT set Content-Type so fetch can add the multipart boundary itself. */
export async function upload(path: string, form: FormData): Promise<any> {
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: form, headers });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return res.json();
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as any) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function photoUrl(filePath: string): string {
  const name = filePath.split("/").pop();
  return `${API_BASE}/photos/${name}`;
}
