"use client";

import { useEffect } from "react";
import { startInstallCapture } from "@/lib/pwa-install";

export function PwaRegister() {
  useEffect(() => {
    startInstallCapture();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
