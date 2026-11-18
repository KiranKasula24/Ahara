import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { SessionProvider } from "@/components/app-shell/SessionProvider";
import { DEFAULT_TIME_ZONE } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name,timezone").eq("id", user.id).maybeSingle();
  const value = {
    userId: user.id,
    email: user.email ?? null,
    displayName: (profile?.display_name as string | null | undefined) ?? null,
    timeZone: (profile?.timezone as string | undefined) ?? DEFAULT_TIME_ZONE,
  };
  return (
    <SessionProvider value={value}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
