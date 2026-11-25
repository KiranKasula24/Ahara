import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/auth/admin";
import { sendAharaSignInEmail } from "@/lib/auth/email";

export const runtime = "nodejs";
const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const appUrl = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${appUrl}/auth/callback` } });
    if (error || !data?.properties?.action_link || !data.properties.email_otp) throw new Error(error?.message ?? "Could not prepare sign-in credentials.");
    await sendAharaSignInEmail({ to: email, actionLink: data.properties.action_link, code: data.properties.email_otp, appUrl });
  } catch (error) {
    console.error("Ahara authentication email request failed", error);
    const configurationError = error instanceof Error && /not configured/i.test(error.message);
    const message = configurationError ? "Sign-in email is not configured yet. Please contact the app administrator." : "We could not send that email. Please try again shortly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
