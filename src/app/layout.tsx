import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./pwa.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";

export const metadata: Metadata = {
  title: { default: "Ahara", template: "%s · Ahara" },
  description: "Private India-first nutrition and activity tracking",
  applicationName: "Ahara",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/ahara-mark.png", type: "image/png" },
    ],
    apple: "/brand/ahara-mark.png",
  },
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const viewport: Viewport = { themeColor: "#14110d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
