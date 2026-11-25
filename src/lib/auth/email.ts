import { Resend } from "resend";

type SignInEmail = { to: string; actionLink: string; code: string; appUrl: string };

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export async function sendAharaSignInEmail({ to, actionLink, code, appUrl }: SignInEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AHARA_EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured. Add RESEND_API_KEY and AHARA_EMAIL_FROM.");
  const logoUrl = `${appUrl.replace(/\/$/, "")}/brand/ahara-lockup.png`;
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Welcome to Ahara — sign in to fuel better",
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#faf5eb;color:#211b14;font-family:Inter,Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:32px 20px"><section style="overflow:hidden;border:1px solid #e0d3bb;border-radius:20px;background:#fffdf8"><div style="padding:28px 28px 18px;text-align:center"><img src="${escapeHtml(logoUrl)}" width="150" height="72" alt="Ahara — Fuel Better" style="display:inline-block;object-fit:contain" /><p style="margin:22px 0 8px;color:#7a4f00;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Welcome to Ahara</p><h1 style="margin:0;color:#211b14;font-size:28px;line-height:1.15">Track your goals. Fuel better.</h1><p style="margin:16px 0 0;color:#5f5546;font-size:16px;line-height:1.55">Use the secure link below to open your private food and activity diary. No password is needed.</p></div><div style="padding:8px 28px 28px;text-align:center"><a href="${escapeHtml(actionLink)}" style="display:inline-block;border-radius:12px;background:#f2b02e;color:#1b1306;padding:14px 22px;font-weight:700;text-decoration:none">Sign in to Ahara</a><p style="margin:28px 0 10px;color:#5f5546;font-size:14px">Prefer a code? Enter this on the sign-in screen:</p><div style="border:1px solid #e0d3bb;border-radius:12px;background:#f4ecdd;padding:14px;color:#211b14;font-size:28px;font-weight:700;letter-spacing:7px;font-variant-numeric:tabular-nums">${escapeHtml(code)}</div><p style="margin:20px 0 0;color:#8a7e6c;font-size:12px;line-height:1.5">If you did not request this email, you can safely ignore it.</p></div></section></main></body></html>`,
    text: `Welcome to Ahara — track your goals and fuel better.\n\nSign in: ${actionLink}\n\nOr enter this code in Ahara: ${code}\n\nIf you did not request this email, you can safely ignore it.`,
  });
  if (error) throw new Error("We could not send that email. Please try again shortly.");
}
