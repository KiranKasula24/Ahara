import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Ahara", short_name: "Ahara", description: "Private India-first nutrition and activity tracking.", start_url: "/today", display: "standalone", background_color: "#0b0b0d", theme_color: "#0b0b0d" }; }
