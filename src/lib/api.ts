import { supabase } from "@/lib/supabase";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { json?: unknown };

export async function apiFetch<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { json, headers: initHeaders, ...rest } = options;
  const { data } = await supabase().auth.getSession();
  const headers = new Headers(initHeaders);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  let body: string | undefined;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }
  const response = await fetch(path, { ...rest, headers, body });
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
