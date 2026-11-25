import { createClient } from "@supabase/supabase-js";

/** Server-only client for issuing passwordless credentials. Never import in client code. */
export function createSupabaseAdminClient() {
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) throw new Error("Authentication email is not configured.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
