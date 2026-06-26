import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function authHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = { ...extra };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

/** Authenticated fetch against the FastAPI backend using the Supabase JWT. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await authHeaders({
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `Backend'e bağlanılamadı (${API_BASE}). Sunucunun çalıştığından emin olun.`,
    );
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Multipart upload (e.g. CV PDF). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new Error(
      `Backend'e bağlanılamadı (${API_BASE}). Sunucunun çalıştığından emin olun.`,
    );
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

/** Download a file (e.g. KVKK data export) and trigger a browser save. */
export async function apiDownload(
  path: string,
  filename: string,
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API ${res.status}: ${detail}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
