"use client";

import { useEffect, useReducer, useState } from "react";
import { getDeferredPrompt, installedThisSession, runInstallPrompt, startInstallCapture, subscribeInstall } from "@/lib/pwa-install";

const DISMISSED_KEY = "ahara.install.dismissedAt";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function dismissedRecently() {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}
function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: the card simply shows again next visit */
  }
}

export function InstallPrompt({ variant }: { variant: "hero" | "card" }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [android, setAndroid] = useState(false);

  useEffect(() => {
    startInstallCapture();
    setStandalone(isStandalone());
    setSnoozed(dismissedRecently());
    setAndroid(/android/i.test(navigator.userAgent));
    setReady(true);
    return subscribeInstall(refresh);
  }, []);

  const event = getDeferredPrompt();
  if (!ready || standalone || installedThisSession()) return null;
  if (variant === "card" && (snoozed || !event)) return null;
  if (variant === "hero" && !event && !android) return null;

  async function install() {
    const outcome = await runInstallPrompt();
    if (outcome === "dismissed" && variant === "card") {
      rememberDismissal();
      setSnoozed(true);
    }
  }
  function notNow() {
    rememberDismissal();
    setSnoozed(true);
  }

  return (
    <section className={variant === "hero" ? "install-hero" : "install-card"} aria-label="Install Ahara">
      <div>
        <p className="install-title">Install Ahara on your phone</p>
        <p className="install-text">Open it full-screen from your home screen, like any other app.</p>
        {!event && <p className="install-text">In Chrome, tap the ⋮ menu, then “Install app” (or “Add to Home screen”).</p>}
      </div>
      <div className="install-actions">
        {event && <button className="button primary" onClick={() => void install()}>Install app</button>}
        {variant === "card" && <button className="button secondary" onClick={notNow}>Not now</button>}
      </div>
    </section>
  );
}
