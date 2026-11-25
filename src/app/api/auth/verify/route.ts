import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; code?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6,10}$/.test(code)) return NextResponse.json({ error: "Enter the email and numeric code from your sign-in email." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "magiclink" });
  return error ? NextResponse.json({ error: "That code did not work. It may have expired; request a new one." }, { status: 400 }) : NextResponse.json({ ok: true });
}
