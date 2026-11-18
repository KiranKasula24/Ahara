"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const db = useMemo(supabase, []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "verifying" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setStatus("pending");
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your email. Tap the sign-in link, or enter the code from the email below.");
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6,10}$/.test(code.trim())) {
      setStatus("error");
      setMessage("Enter the numeric code from your email.");
      return;
    }
    setStatus("verifying");
    const { error } = await db.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) {
      setStatus("error");
      setMessage("That code did not work. It may have expired; request a new one.");
      return;
    }
    router.replace("/today");
    router.refresh();
  }

  const emailSent = status === "sent" || status === "verifying" || (status === "error" && message.includes("code"));

  return (
    <section className="auth-card">
      <Link className="brand" href="/"><span className="brand-mark">A</span>Ahara</Link>
      <p className="eyebrow">Welcome</p>
      <h1>Sign in to your private diary</h1>
      <p className="muted">We’ll email you a one-time link. No password is needed.</p>
      <form onSubmit={sendLink}>
        <label>Email address
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
        </label>
        <button className="button primary full-width" disabled={status === "pending" || status === "verifying"}>
          {status === "pending" ? "Sending…" : emailSent ? "Send a new link" : "Email me a sign-in link"}
        </button>
      </form>
      {emailSent && (
        <form onSubmit={verifyCode}>
          <label>Code from the email
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" />
          </label>
          <button className="button secondary full-width" disabled={status === "verifying"}>{status === "verifying" ? "Checking…" : "Sign in with code"}</button>
        </form>
      )}
      {status === "sent" && <p className="success-note" role="status">{message}</p>}
      {status === "error" && <p className="inline-error" role="alert">{message}</p>}
    </section>
  );
}
