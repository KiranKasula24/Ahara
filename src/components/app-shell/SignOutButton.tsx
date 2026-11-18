"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function SignOutButton({ className = "button secondary" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await supabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button className={className} onClick={() => void signOut()} disabled={busy}>
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
