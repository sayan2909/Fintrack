"use client";

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "include",
  });
  const json = await res.json().catch(() => ({ success: false, message: "Request failed" }));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

export const apiGet = <T>(p: string) => api<T>(p);
export const apiPost = <T>(p: string, body: unknown) =>
  api<T>(p, { method: "POST", body: JSON.stringify(body) });
export const apiPut = <T>(p: string, body: unknown) =>
  api<T>(p, { method: "PUT", body: JSON.stringify(body) });
export const apiDel = <T>(p: string) => api<T>(p, { method: "DELETE" });
