import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

type Payload = { intakeKcal?: number | null; activityKcal?: number | null };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export async function GET(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.client.from("goal_versions").select("kind,value,starts_at").is("ends_at", null);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ goals: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser(request); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as Payload; const values = [["intake_kcal", body.intakeKcal], ["activity_kcal", body.activityKcal]] as const;
  const changes = values.filter(([, value]) => value !== null && value !== undefined);
  if (!changes.length || changes.some(([, value]) => !Number.isFinite(value) || value! <= 0 || value! > 10000)) return NextResponse.json({ error: "Enter a realistic positive target." }, { status: 400 });
  const date = today();
  for (const [kind, value] of changes) {
    const { data: current, error: currentError } = await auth.client.from("goal_versions").select("id,value").eq("kind", kind).is("ends_at", null).maybeSingle();
    if (currentError) return NextResponse.json({ error: currentError.message }, { status: 400 });
    if (Number(current?.value) === value) continue;
    if (current) { const { error } = await auth.client.from("goal_versions").update({ ends_at: date }).eq("id", current.id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
    const { error } = await auth.client.from("goal_versions").insert({ owner_id: auth.user.id, kind, value, starts_at: date }); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
