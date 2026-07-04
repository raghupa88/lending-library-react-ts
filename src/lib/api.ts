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
 * Single place tokens live. Currently backed by localStorage; will move to
 * in-memory access token + httpOnly cookie refresh when the backend supports
 * cookie rotation, so no other module may touch storage directly.
 */
export const tokenStore = {
  getAccess: (): string | null => localStorage.getItem("access_token"),
  getRefresh: (): string | null => localStorage.getItem("refresh_token"),
  set(access: string, refresh: string): void {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear(): void {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.getAccess();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    tokenStore.clear();
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
