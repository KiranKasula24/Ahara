import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/server/request";

export async function DELETE(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!serviceKey) return NextResponse.json({ error: "Account deletion is not configured on this deployment." }, { status: 501 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }); const { error } = await admin.auth.admin.deleteUser(auth.user.id); return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({}, { status: 204 });
}
