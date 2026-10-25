import { createClient } from "@supabase/supabase-js";

export function userClient(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}
export async function requireUser(request: Request) {
  const client = userClient(request); if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : { client, user: data.user };
}
