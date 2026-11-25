import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ahara",
    short_name: "Ahara",
    description: "Private India-first nutrition and activity tracking.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14110d",
    theme_color: "#14110d",
    categories: ["health", "food"],
    icons: [
      { src: "/brand/ahara-mark.png", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Add food", url: "/add" }],
  };
}
