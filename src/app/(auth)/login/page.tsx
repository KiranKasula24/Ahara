"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/app-shell/BrandLogo";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "verifying" | "error">("idle");
  const [message, setMessage] = useState("");

  function setError(next: string) { setStatus("error"); setMessage(next); }
  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setStatus("pending"); setMessage("");
    try {
      await apiFetch("/api/auth/request", { method: "POST", json: { email } });
      setStatus("sent"); setMessage("Check your inbox for an Ahara sign-in link and a one-time code.");
    } catch (error) { setError(error instanceof Error ? error.message : "We could not send that email."); }
  }
  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6,10}$/.test(code.trim())) return setError("Enter the numeric code from your email.");
    setStatus("verifying"); setMessage("");
    try {
      await apiFetch("/api/auth/verify", { method: "POST", json: { email, code: code.trim() } });
      router.replace("/today"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "That code did not work."); }
  }

  const emailSent = status === "sent" || status === "verifying" || (status === "error" && code.length > 0);
  return <section className="auth-card">
    <Link className="auth-logo" href="/" aria-label="Ahara home"><BrandLogo variant="lockup" priority /></Link>
    <p className="eyebrow">Welcome to Ahara</p>
    <h1>Track your goals. Fuel better.</h1>
    <p className="muted">Sign in with an Ahara email. We’ll send both a secure link and a one-time code—no password needed.</p>
    <form onSubmit={sendLink}>
      <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
      <button className="button primary full-width" disabled={status === "pending" || status === "verifying"}>{status === "pending" ? "Sending…" : emailSent ? "Send a new email" : "Email me a sign-in link"}</button>
    </form>
    {emailSent && <form onSubmit={verifyCode} className="auth-code-form">
      <label>Code from the email<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" /></label>
      <button className="button secondary full-width" disabled={status === "verifying"}>{status === "verifying" ? "Checking…" : "Sign in with code"}</button>
    </form>}
    {status === "sent" && <p className="success-note" role="status">{message}</p>}
    {status === "error" && <p className="inline-error" role="alert">{message}</p>}
  </section>;
}
