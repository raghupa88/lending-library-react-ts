const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";

/** Envelope every backend endpoint wraps its payload in. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The access token lives only in memory (XSS can't lift it from storage);
 * the refresh token lives only in an httpOnly cookie the backend rotates.
 * Sessions survive reloads via silent refresh on boot (see AuthContext).
 */
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: (): string | null => accessToken,
  setAccess(token: string | null): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
    localStorage.removeItem("user");
  },
};

/** Matches backend AuthResponse (refreshToken is null for web clients). */
export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  accessToken: string;
  refreshToken: string | null;
}

let refreshInFlight: Promise<AuthPayload | null> | null = null;

/**
 * Rotate the refresh cookie into a fresh access token. Single-flight: many
 * concurrent 401s share one refresh call. Resolves null when there is no
 * valid session.
 */
export function refreshAuth(): Promise<AuthPayload | null> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as ApiEnvelope<AuthPayload>;
      if (!res.ok || !json.success || !json.data) return null;
      tokenStore.setAccess(json.data.accessToken);
      return json.data;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function rawFetch(path: string, options: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = tokenStore.getAccess();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: "include" });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options);

  // Expired access token: silently rotate the refresh cookie and retry once.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshAuth();
    if (refreshed) {
      res = await rawFetch(path, options);
    } else {
      tokenStore.clear();
    }
  }

  let json: ApiEnvelope<T> | undefined;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      json = undefined;
    }
  }

  if (!res.ok || !json?.success) {
    throw new ApiError(
      json?.error ?? json?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
