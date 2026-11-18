import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/request";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fromDate, toDate } = (await request.json()) as { fromDate?: string; toDate?: string };
  if (!fromDate || !toDate || !DATE.test(fromDate) || !DATE.test(toDate)) {
    return NextResponse.json({ error: "Valid source and destination dates are required." }, { status: 400 });
  }
  const { data, error } = await auth.client.rpc("copy_day", { source_date: fromDate, target_date: toDate });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ copied: data as number }, { status: 201 });
}
