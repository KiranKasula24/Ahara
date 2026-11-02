import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Ahara", template: "%s · Ahara" }, description: "Private India-first nutrition and activity tracking", manifest: "/manifest.webmanifest", themeColor: "#0b0b0d" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
